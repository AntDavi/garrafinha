import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestDb } from '@/db/testing/setup';

import { exportBackup, importBackup, parseBackup, serializeBackup } from './backup';

type T = Awaited<ReturnType<typeof createTestDb>>;
let a: T;
let b: T;

async function populate(t: T) {
  await t.repos.profile.save({
    sex: 'male',
    age: 30,
    weightKg: 80,
    heightCm: 180,
    goal: 'lose',
    activity: 'moderate',
  });
  await t.repos.weight.add({ date: '2026-10-20', weightKg: 80 });
  await t.repos.water.setCups('2026-10-27', 6);
  await t.repos.meals.create({
    date: '2026-10-27',
    mealType: 'lunch',
    time: '12:00',
    source: 'text',
    items: [
      {
        name: 'Arroz',
        grams: 150,
        quantityLabel: null,
        kcal: 192,
        protein: 3.8,
        carbs: 42.1,
        fat: 0.3,
        foodRef: 'taco:3',
      },
    ],
  });
  const w = await t.repos.workouts.create(
    {
      title: 'Treino A',
      weekdays: [1, 3],
      exercises: [{ exerciseId: 'Plank', sets: 3, reps: '30s' }],
    },
    '2026-10-01',
  );
  await t.repos.sessions.complete({ workoutId: w.id, date: '2026-10-27', durationMin: 45 });
  return w;
}

beforeEach(async () => {
  a = await createTestDb();
  b = await createTestDb('b');
});
afterEach(() => {
  a.db.close();
  b.db.close();
});

describe('backup', () => {
  it('exporta tudo e reimporta em outro banco (ida e volta)', async () => {
    await populate(a);
    const file = await exportBackup(a.db, () => '2026-10-27T12:00:00.000Z');
    expect(file).toMatchObject({ app: 'garrafinha', schemaVersion: 1 });
    expect(file.data.meal_items).toHaveLength(1);

    const summary = await importBackup(b.db, serializeBackup(file), 'replace');
    expect(summary.counts.workout_days).toBe(2);
    expect(await exportBackup(b.db, () => '2026-10-27T12:00:00.000Z')).toEqual(file);
  });

  it('substituir apaga dados que não estão no arquivo', async () => {
    await populate(a);
    await b.repos.weight.add({ date: '2026-01-01', weightKg: 99 });
    await importBackup(b.db, await exportBackup(a.db), 'replace');
    expect((await b.repos.weight.list()).map((w) => w.weightKg)).toEqual([80]);
  });

  it('mesclar mantém dados locais e atualiza por ID', async () => {
    await populate(a);
    const file = await exportBackup(a.db);
    await b.repos.weight.add({ date: '2026-01-01', weightKg: 99 });
    await importBackup(b.db, file, 'merge');
    await importBackup(b.db, file, 'merge'); // idempotente
    expect((await b.repos.weight.list()).map((w) => w.weightKg)).toEqual([99, 80]);
    expect(await b.repos.meals.listByDate('2026-10-27')).toHaveLength(1);
    expect((await b.repos.meals.listByDate('2026-10-27'))[0]?.items).toHaveLength(1);
  });

  it('é transacional: erro no meio não altera nada', async () => {
    await populate(a);
    const file = await exportBackup(a.db);
    await b.repos.weight.add({ date: '2026-01-01', weightKg: 99 });
    // ID duplicado passa no Zod, mas viola a PK no meio da importação.
    const broken = structuredClone(file);
    broken.data.workout_sessions.push({ ...broken.data.workout_sessions[0]! });
    await expect(importBackup(b.db, broken, 'replace')).rejects.toThrow();
    expect((await b.repos.weight.list()).map((w) => w.weightKg)).toEqual([99]);
  });

  it('valida formato, origem, versão e integridade referencial', async () => {
    await populate(a);
    const file = await exportBackup(a.db);
    expect(() => parseBackup('não é json')).toThrow(
      expect.objectContaining({ code: 'invalid_input' }),
    );
    expect(() => parseBackup({ ...file, app: 'outro' })).toThrow(/não é do Garrafinha/);
    expect(() => parseBackup({ ...file, schemaVersion: 99 })).toThrow(/versão 99/);

    const orphan = structuredClone(file);
    orphan.data.meal_items[0]!.meal_id = 'inexistente';
    expect(() => parseBackup(orphan)).toThrow(/sem refeição/);

    const badDate = structuredClone(file);
    badDate.data.weight_entries[0]!.date = '2026-13-40';
    expect(() => parseBackup(badDate)).toThrow(/Backup inválido/);
  });

  it('não inclui tabelas de seed no backup', async () => {
    const file = await exportBackup(a.db);
    expect(Object.keys(file.data)).not.toContain('exercises');
    expect(Object.keys(file.data)).not.toContain('foods');
  });
});
