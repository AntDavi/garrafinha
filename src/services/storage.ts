/** Interface compatível com AsyncStorage, para permitir testes com um store em memória. */
export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export const STORAGE_KEYS = {
  installId: 'garrafinha.installId',
  scanUsage: 'garrafinha.scanUsage',
  scanDailyLimit: 'garrafinha.scanDailyLimit',
} as const;

export async function getJson<T>(store: KeyValueStore, key: string): Promise<T | null> {
  const raw = await store.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJson(store: KeyValueStore, key: string, value: unknown): Promise<void> {
  await store.setItem(key, JSON.stringify(value));
}

/** Identificador anônimo e aleatório desta instalação (não ligado a nenhum dado pessoal). */
export async function getInstallId(store: KeyValueStore, newId: () => string): Promise<string> {
  const existing = await store.getItem(STORAGE_KEYS.installId);
  if (existing) return existing;
  const id = newId();
  await store.setItem(STORAGE_KEYS.installId, id);
  return id;
}

export function createMemoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial));
  return {
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => {
      data.set(k, v);
    },
    removeItem: async (k) => {
      data.delete(k);
    },
  };
}
