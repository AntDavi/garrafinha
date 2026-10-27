import { toISODate } from '@/domain/dates';
import type { ISODate, Weekday } from '@/domain/types';

import type { SqlDb } from '../types';
import { placeholders, type RepoDeps } from './deps';

export type WorkoutExercise = {
  id: string;
  exerciseId: string;
  /** Nome em pt (ou en se pendente); null se o exercício saiu da base. */
  exerciseName: string | null;
  position: number;
  sets: number;
  reps: string;
};

export type Workout = {
  id: string;
  title: string;
  focus: string | null;
  icon: string | null;
  createdOn: ISODate;
  createdAt: string;
  updatedAt: string;
  weekdays: Weekday[];
  exercises: WorkoutExercise[];
};

export type WorkoutInput = {
  title: string;
  focus?: string | null;
  icon?: string | null;
  weekdays: Weekday[];
  exercises: { exerciseId: string; sets: number; reps: string }[];
};

type WorkoutRow = {
  id: string;
  title: string;
  focus: string | null;
  icon: string | null;
  created_on: string;
  created_at: string;
  updated_at: string;
};

type ExerciseRow = {
  id: string;
  workout_id: string;
  exercise_id: string;
  exercise_name: string | null;
  position: number;
  sets: number;
  reps: string;
};

export function createWorkoutsRepository({ db, newId, now }: RepoDeps) {
  async function writeChildren(tx: SqlDb, workoutId: string, input: WorkoutInput) {
    await tx.run('DELETE FROM workout_exercises WHERE workout_id = ?', [workoutId]);
    await tx.run('DELETE FROM workout_days WHERE workout_id = ?', [workoutId]);
    for (const [i, ex] of input.exercises.entries()) {
      await tx.run(
        'INSERT INTO workout_exercises (id, workout_id, exercise_id, position, sets, reps) VALUES (?, ?, ?, ?, ?, ?)',
        [newId(), workoutId, ex.exerciseId, i, ex.sets, ex.reps],
      );
    }
    for (const wd of new Set(input.weekdays)) {
      await tx.run('INSERT INTO workout_days (workout_id, weekday) VALUES (?, ?)', [workoutId, wd]);
    }
  }

  async function load(rows: WorkoutRow[]): Promise<Workout[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const ph = placeholders(ids.length);
    const exRows = await db.all<ExerciseRow>(
      `SELECT we.*, e.name_pt AS exercise_name FROM workout_exercises we
       LEFT JOIN exercises e ON e.id = we.exercise_id
       WHERE we.workout_id IN (${ph}) ORDER BY we.position`,
      ids,
    );
    const dayRows = await db.all<{ workout_id: string; weekday: Weekday }>(
      `SELECT workout_id, weekday FROM workout_days WHERE workout_id IN (${ph}) ORDER BY weekday`,
      ids,
    );
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      focus: r.focus,
      icon: r.icon,
      createdOn: r.created_on,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      weekdays: dayRows.filter((d) => d.workout_id === r.id).map((d) => d.weekday),
      exercises: exRows
        .filter((e) => e.workout_id === r.id)
        .map((e) => ({
          id: e.id,
          exerciseId: e.exercise_id,
          exerciseName: e.exercise_name,
          position: e.position,
          sets: e.sets,
          reps: e.reps,
        })),
    }));
  }

  return {
    async create(
      input: WorkoutInput,
      createdOn: ISODate = toISODate(new Date()),
    ): Promise<Workout> {
      const id = newId();
      const ts = now();
      await db.transaction(async (tx) => {
        await tx.run(
          'INSERT INTO workouts (id, title, focus, icon, created_on, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [id, input.title, input.focus ?? null, input.icon ?? null, createdOn, ts, ts],
        );
        await writeChildren(tx, id, input);
      });
      const w = await this.getById(id);
      if (!w) throw new Error('Falha ao salvar o treino');
      return w;
    },

    /** Atualiza o treino e substitui exercícios e dias. */
    async update(id: string, input: WorkoutInput): Promise<Workout> {
      await db.transaction(async (tx) => {
        const r = await tx.run(
          'UPDATE workouts SET title = ?, focus = ?, icon = ?, updated_at = ? WHERE id = ?',
          [input.title, input.focus ?? null, input.icon ?? null, now(), id],
        );
        if (r.changes === 0) throw new Error('Treino não encontrado');
        await writeChildren(tx, id, input);
      });
      const w = await this.getById(id);
      if (!w) throw new Error('Treino não encontrado');
      return w;
    },

    async remove(id: string): Promise<void> {
      await db.run('DELETE FROM workouts WHERE id = ?', [id]);
    },

    async getById(id: string): Promise<Workout | null> {
      const row = await db.first<WorkoutRow>('SELECT * FROM workouts WHERE id = ?', [id]);
      if (!row) return null;
      const [w] = await load([row]);
      return w ?? null;
    },

    async list(): Promise<Workout[]> {
      return load(await db.all<WorkoutRow>('SELECT * FROM workouts ORDER BY created_at'));
    },

    async listForWeekday(weekday: Weekday): Promise<Workout[]> {
      return load(
        await db.all<WorkoutRow>(
          `SELECT w.* FROM workouts w JOIN workout_days d ON d.workout_id = w.id
           WHERE d.weekday = ? ORDER BY w.created_at`,
          [weekday],
        ),
      );
    },

    /** Agenda de todos os treinos (para calcular treinos planejados no relatório). */
    async listSchedules(): Promise<{ id: string; createdOn: ISODate; weekdays: Weekday[] }[]> {
      const rows = await db.all<{ id: string; created_on: string; weekday: Weekday | null }>(
        `SELECT w.id, w.created_on, d.weekday FROM workouts w
         LEFT JOIN workout_days d ON d.workout_id = w.id ORDER BY w.id, d.weekday`,
      );
      const map = new Map<string, { id: string; createdOn: ISODate; weekdays: Weekday[] }>();
      for (const r of rows) {
        const s = map.get(r.id) ?? { id: r.id, createdOn: r.created_on, weekdays: [] };
        if (r.weekday !== null) s.weekdays.push(r.weekday);
        map.set(r.id, s);
      }
      return [...map.values()];
    },
  };
}

export type WorkoutsRepository = ReturnType<typeof createWorkoutsRepository>;
