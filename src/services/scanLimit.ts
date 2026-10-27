import { toISODate } from '@/domain/dates';

import { getJson, setJson, STORAGE_KEYS, type KeyValueStore } from './storage';

type Usage = { date: string; count: number };

/** Limite diário local de scans por foto (o proxy também aplica limite no servidor). */
export function createScanLimiter(opts: {
  store: KeyValueStore;
  defaultLimit: number;
  today?: () => string;
}) {
  const today = opts.today ?? (() => toISODate(new Date()));

  async function usage(): Promise<Usage> {
    const u = await getJson<Usage>(opts.store, STORAGE_KEYS.scanUsage);
    const d = today();
    return u && u.date === d ? u : { date: d, count: 0 };
  }

  async function limit(): Promise<number> {
    const raw = await opts.store.getItem(STORAGE_KEYS.scanDailyLimit);
    const n = raw === null ? NaN : Number(raw);
    return Number.isInteger(n) && n >= 0 ? n : opts.defaultLimit;
  }

  return {
    limit,
    async setLimit(value: number): Promise<void> {
      await opts.store.setItem(STORAGE_KEYS.scanDailyLimit, String(Math.max(0, Math.floor(value))));
    },
    async remaining(): Promise<number> {
      return Math.max(0, (await limit()) - (await usage()).count);
    },
    async consume(): Promise<void> {
      const u = await usage();
      await setJson(opts.store, STORAGE_KEYS.scanUsage, { date: u.date, count: u.count + 1 });
    },
  };
}

export type ScanLimiter = ReturnType<typeof createScanLimiter>;
