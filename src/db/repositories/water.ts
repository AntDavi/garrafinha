import type { DateRange } from '@/domain/dates';
import type { ISODate } from '@/domain/types';

import type { RepoDeps } from './deps';

export type WaterLog = { date: ISODate; cups: number };

export function createWaterRepository({ db, now }: Pick<RepoDeps, 'db' | 'now'>) {
  return {
    async getCups(date: ISODate): Promise<number> {
      const row = await db.first<{ cups: number }>('SELECT cups FROM water_logs WHERE date = ?', [
        date,
      ]);
      return row?.cups ?? 0;
    },
    async setCups(date: ISODate, cups: number): Promise<number> {
      const value = Math.max(0, Math.round(cups));
      await db.run(
        `INSERT INTO water_logs (date, cups, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(date) DO UPDATE SET cups = excluded.cups, updated_at = excluded.updated_at`,
        [date, value, now()],
      );
      return value;
    },
    /** Soma `delta` copos (pode ser negativo), nunca abaixo de zero. */
    async addCups(date: ISODate, delta = 1): Promise<number> {
      return db.transaction(async (tx) => {
        const row = await tx.first<{ cups: number }>('SELECT cups FROM water_logs WHERE date = ?', [
          date,
        ]);
        const value = Math.max(0, (row?.cups ?? 0) + Math.round(delta));
        await tx.run(
          `INSERT INTO water_logs (date, cups, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(date) DO UPDATE SET cups = excluded.cups, updated_at = excluded.updated_at`,
          [date, value, now()],
        );
        return value;
      });
    },
    async list(range: DateRange): Promise<WaterLog[]> {
      return db.all<WaterLog>(
        'SELECT date, cups FROM water_logs WHERE date BETWEEN ? AND ? ORDER BY date',
        [range.start, range.end],
      );
    },
  };
}

export type WaterRepository = ReturnType<typeof createWaterRepository>;
