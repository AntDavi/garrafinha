export type SqlValue = string | number | null;
export type SqlParams = readonly SqlValue[];

/**
 * Interface mínima de acesso ao SQLite. O app usa o adaptador do expo-sqlite e os testes
 * usam o node:sqlite em memória, executando as mesmas migrações e repositórios.
 */
export interface SqlDb {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParams): Promise<{ changes: number }>;
  all<T>(sql: string, params?: SqlParams): Promise<T[]>;
  first<T>(sql: string, params?: SqlParams): Promise<T | null>;
  /** Executa `fn` em uma transação exclusiva; faz rollback se `fn` lançar erro. */
  transaction<T>(fn: (tx: SqlDb) => Promise<T>): Promise<T>;
}
