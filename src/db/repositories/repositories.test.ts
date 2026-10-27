import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '../testing/setup';
import type { Exercise } from './exercises';

let t: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => {
  t = await createTestDb();
});
afterEach(() => t.db.close());

const exercise = (id: string, namePt: string, muscle: string): Exercise => ({
  id,
  namePt,
  nameEn: namePt,
  category: 'strength',
  level: 'beginner',
  equipment: 'Barra',
  primaryMuscles: [muscle],
  secondaryMuscles: [],
  instructionsPt: ['Passo 1'],
  instructionsEn: ['Step 1'],
  images: [],
  translationStatus: 'translated',
});

describe('profile', () => {
  it('cria, lê e atualiza o perfil único', async () => {
    expect(await t.repos.profile.exists()).toBe(false);
    const p = await t.repos.profile.save({
      sex: 'female',
      age: 30,
      weightKg: 60,
      heightCm: 165,
      goal: 'maintain',
      activity: 'light',
    });
    expect(p.waterGoalMl).toBe(2400);
    await t.repos.profile.setWaterGoal(3000);
    const { waterGoalMl: _ignored, ...rest } = p;
    const updated = await t.repos.profile.save({ ...rest, weightKg: 59 });
    expect(updated).toMatchObject({ weightKg: 59, waterGoalMl: 3000, createdAt: p.createdAt });
    expect(await t.repos.profile.exists()).toBe(true);
  });

  it('rejeita valores fora das restrições do schema', async () => {
    await expect(
      t.repos.profile.save({
        sex: 'female',
        age: 5,
        weightKg: 60,
        heightCm: 165,
        goal: 'maintain',
        activity: 'light',
      }),
    ).rejects.toThrow();
  });
});

describe('weight', () => {
  it('lista por período e retorna a última pesagem', async () => {
    await t.repos.weight.add({ date: '2026-10-01', weightKg: 80 });
    await t.repos.weight.add({ date: '2026-10-20', weightKg: 79 });
    await t.repos.weight.add({ date: '2026-09-01', weightKg: 82 });
    const inRange = await t.repos.weight.list({ start: '2026-10-01', end: '2026-10-31' });
    expect(inRange.map((w) => w.weightKg)).toEqual([80, 79]);
    expect((await t.repos.weight.latest())?.weightKg).toBe(79);
  });
});

describe('water', () => {
  it('soma e subtrai copos sem ficar negativo', async () => {
    expect(await t.repos.water.addCups('2026-10-27')).toBe(1);
    expect(await t.repos.water.addCups('2026-10-27', 2)).toBe(3);
    expect(await t.repos.water.addCups('2026-10-27', -10)).toBe(0);
    await t.repos.water.setCups('2026-10-26', 5);
    expect(await t.repos.water.list({ start: '2026-10-26', end: '2026-10-27' })).toEqual([
      { date: '2026-10-26', cups: 5 },
      { date: '2026-10-27', cups: 0 },
    ]);
  });
});

describe('meals', () => {
  const item = { grams: 100, quantityLabel: null, foodRef: 'taco:1' };

  it('cria refeição com itens em transação e calcula totais do dia', async () => {
    const meal = await t.repos.meals.create({
      date: '2026-10-27',
      mealType: 'lunch',
      time: '12:30',
      source: 'text',
      items: [
        { ...item, name: 'Arroz', kcal: 128, protein: 2.5, carbs: 28.1, fat: 0.2 },
        { ...item, name: 'Feijão', kcal: 76, protein: 4.8, carbs: 13.6, fat: 0.5 },
      ],
    });
    expect(meal.items.map((i) => i.name)).toEqual(['Arroz', 'Feijão']);
    expect(await t.repos.meals.dayTotals('2026-10-27')).toEqual({
      kcal: 204,
      protein: 7.3,
      carbs: 41.7,
      fat: 0.7,
    });
  });

  it('ordena por tipo de refeição e apaga itens em cascata', async () => {
    const dinner = await t.repos.meals.create({
      date: '2026-10-27',
      mealType: 'dinner',
      source: 'manual',
      items: [],
    });
    await t.repos.meals.create({
      date: '2026-10-27',
      mealType: 'breakfast',
      source: 'barcode',
      items: [],
    });
    const added = await t.repos.meals.addItem(dinner.id, {
      ...item,
      name: 'Ovo',
      kcal: 146,
      protein: 13.3,
      carbs: 0.6,
      fat: 9.5,
    });
    expect(added.position).toBe(0);

    const list = await t.repos.meals.listByDate('2026-10-27');
    expect(list.map((m) => m.mealType)).toEqual(['breakfast', 'dinner']);

    await t.repos.meals.remove(dinner.id);
    expect(await t.db.first('SELECT * FROM meal_items WHERE id = ?', [added.id])).toBeNull();
  });

  it('não grava nada se um item for inválido', async () => {
    await expect(
      t.repos.meals.create({
        date: '2026-10-27',
        mealType: 'lunch',
        source: 'text',
        items: [{ ...item, name: 'Ruim', kcal: -1, protein: 0, carbs: 0, fat: 0 }],
      }),
    ).rejects.toThrow();
    expect(await t.repos.meals.listByDate('2026-10-27')).toEqual([]);
  });

  it('lista itens por período para o relatório', async () => {
    await t.repos.meals.create({
      date: '2026-10-20',
      mealType: 'snack',
      source: 'photo',
      items: [{ ...item, name: 'Banana', kcal: 98, protein: 1.3, carbs: 26, fat: 0.1 }],
    });
    expect(
      await t.repos.meals.listItemsInRange({ start: '2026-10-20', end: '2026-10-20' }),
    ).toEqual([{ date: '2026-10-20', kcal: 98, protein: 1.3, carbs: 26, fat: 0.1 }]);
  });
});

describe('exercises', () => {
  it('substitui a base e filtra por músculo e nome', async () => {
    await t.repos.exercises.replaceAll([
      exercise('Barbell_Bench_Press', 'Supino reto', 'Peitoral'),
      exercise('Plank', 'Prancha', 'Abdômen'),
    ]);
    expect(await t.repos.exercises.count()).toBe(2);
    expect((await t.repos.exercises.list({ muscle: 'Peitoral' })).map((e) => e.id)).toEqual([
      'Barbell_Bench_Press',
    ]);
    expect((await t.repos.exercises.list({ query: 'pran' }))[0]?.namePt).toBe('Prancha');
    expect(await t.repos.exercises.muscles()).toEqual(['Abdômen', 'Peitoral']);
    expect((await t.repos.exercises.getById('Plank'))?.instructionsPt).toEqual(['Passo 1']);
  });
});

describe('workouts e sessions', () => {
  beforeEach(async () => {
    await t.repos.exercises.replaceAll([
      exercise('Barbell_Bench_Press', 'Supino reto', 'Peitoral'),
    ]);
  });

  it('cria, atualiza e lista por dia da semana', async () => {
    const w = await t.repos.workouts.create(
      {
        title: 'Treino A',
        focus: 'Peito',
        icon: 'dumbbell',
        weekdays: [1, 3, 3],
        exercises: [
          { exerciseId: 'Barbell_Bench_Press', sets: 4, reps: '8-12' },
          { exerciseId: 'Removido', sets: 3, reps: '10' },
        ],
      },
      '2026-10-01',
    );
    expect(w.weekdays).toEqual([1, 3]);
    expect(w.exercises.map((e) => [e.exerciseName, e.position])).toEqual([
      ['Supino reto', 0],
      [null, 1],
    ]);

    const upd = await t.repos.workouts.update(w.id, {
      title: 'Treino A2',
      weekdays: [5],
      exercises: [],
    });
    expect(upd).toMatchObject({
      title: 'Treino A2',
      weekdays: [5],
      exercises: [],
      createdOn: '2026-10-01',
    });
    expect(await t.repos.workouts.listForWeekday(5)).toHaveLength(1);
    expect(await t.repos.workouts.listForWeekday(1)).toHaveLength(0);
    expect(await t.repos.workouts.listSchedules()).toEqual([
      { id: w.id, createdOn: '2026-10-01', weekdays: [5] },
    ]);
  });

  it('mantém o histórico de sessões quando o treino é apagado', async () => {
    const w = await t.repos.workouts.create({ title: 'Treino B', weekdays: [2], exercises: [] });
    await t.repos.sessions.complete({ workoutId: w.id, date: '2026-10-27', durationMin: 42.4 });
    await t.repos.workouts.remove(w.id);
    const sessions = await t.repos.sessions.list({ start: '2026-10-01', end: '2026-10-31' });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      workoutId: null,
      workoutTitle: 'Treino B',
      durationMin: 42,
    });
  });

  it('falha ao concluir treino inexistente', async () => {
    await expect(
      t.repos.sessions.complete({ workoutId: 'nope', date: '2026-10-27', durationMin: 10 }),
    ).rejects.toThrow('Treino não encontrado');
  });
});

describe('appMeta', () => {
  it('lê e grava chaves', async () => {
    expect(await t.repos.appMeta.get('seed_exercises_version')).toBeNull();
    await t.repos.appMeta.set('seed_exercises_version', '1');
    await t.repos.appMeta.set('seed_exercises_version', '2');
    expect(await t.repos.appMeta.get('seed_exercises_version')).toBe('2');
  });
});
