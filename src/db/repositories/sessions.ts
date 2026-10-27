import type { DateRange } from '@/domain/dates';
import type { ISODate } from '@/domain/types';

import type { RepoDeps } from './deps';

export type WorkoutSession = {
  id: string;
  workoutId: string | null;
  workoutTitle: string;
  date: ISODate;
  durationMin: number;
  createdAt: string;
};

type Row = {
  id: string;
  workout_id: string | null;
  workout_title: string;
  date: string;
  duration_min: number;
  created_at: string;
};

const toSession = (r: Row): WorkoutSession => ({
  id: r.id,
  workoutId: r.workout_id,
  workoutTitle: r.workout_title,
  date: r.date,
  durationMin: r.duration_min,
  createdAt: r.created_at,
});

export function createSessionsRepository({ db, newId, now }: RepoDeps) {
  return {
    /** Registra um treino concluído. O título é guardado como snapshot do treino. */
    async complete(input: {
      workoutId: string;
      date: ISODate;
      durationMin: number;
    }): Promise<WorkoutSession> {
      const w = await db.first<{ title: string }>('SELECT title FROM workouts WHERE id = ?', [
        input.workoutId,
      ]);
      if (!w) throw new Error('Treino não encontrado');
      const s: WorkoutSession = {
        id: newId(),
        workoutId: input.workoutId,
        workoutTitle: w.title,
        date: input.date,
        durationMin: Math.max(0, Math.round(input.durationMin)),
        createdAt: now(),
      };
      await db.run(
        'INSERT INTO workout_sessions (id, workout_id, workout_title, date, duration_min, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [s.id, s.workoutId, s.workoutTitle, s.date, s.durationMin, s.createdAt],
      );
      return s;
    },

    async list(range: DateRange): Promise<WorkoutSession[]> {
      const rows = await db.all<Row>(
        'SELECT * FROM workout_sessions WHERE date BETWEEN ? AND ? ORDER BY date, created_at',
        [range.start, range.end],
      );
      return rows.map(toSession);
    },

    async listByDate(date: ISODate): Promise<WorkoutSession[]> {
      return (
        await db.all<Row>('SELECT * FROM workout_sessions WHERE date = ? ORDER BY created_at', [
          date,
        ])
      ).map(toSession);
    },

    async remove(id: string): Promise<void> {
      await db.run('DELETE FROM workout_sessions WHERE id = ?', [id]);
    },
  };
}

export type SessionsRepository = ReturnType<typeof createSessionsRepository>;
