import type { DateRange } from '@/domain/dates';
import type { ISODate } from '@/domain/types';

import type { RepoDeps } from './deps';

export type WeightEntry = { id: string; date: ISODate; weightKg: number; createdAt: string };

type Row = { id: string; date: string; weight_kg: number; created_at: string };
const toEntry = (r: Row): WeightEntry => ({
  id: r.id,
  date: r.date,
  weightKg: r.weight_kg,
  createdAt: r.created_at,
});

export function createWeightRepository({ db, newId, now }: RepoDeps) {
  return {
    async add(input: { date: ISODate; weightKg: number }): Promise<WeightEntry> {
      const entry = { id: newId(), date: input.date, weightKg: input.weightKg, createdAt: now() };
      await db.run(
        'INSERT INTO weight_entries (id, date, weight_kg, created_at) VALUES (?, ?, ?, ?)',
        [entry.id, entry.date, entry.weightKg, entry.createdAt],
      );
      return entry;
    },
    async list(range?: DateRange): Promise<WeightEntry[]> {
      const rows = range
        ? await db.all<Row>(
            'SELECT * FROM weight_entries WHERE date BETWEEN ? AND ? ORDER BY date, created_at',
            [range.start, range.end],
          )
        : await db.all<Row>('SELECT * FROM weight_entries ORDER BY date, created_at');
      return rows.map(toEntry);
    },
    async latest(): Promise<WeightEntry | null> {
      const row = await db.first<Row>(
        'SELECT * FROM weight_entries ORDER BY date DESC, created_at DESC LIMIT 1',
      );
      return row ? toEntry(row) : null;
    },
    async remove(id: string): Promise<void> {
      await db.run('DELETE FROM weight_entries WHERE id = ?', [id]);
    },
  };
}

export type WeightRepository = ReturnType<typeof createWeightRepository>;
