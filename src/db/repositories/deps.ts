import type { SqlDb } from '../types';

export type RepoDeps = {
  db: SqlDb;
  /** Gera IDs estáveis (UUID). Injetado para permitir testes determinísticos. */
  newId: () => string;
  /** Relógio injetável; retorna ISO 8601. */
  now: () => string;
};

export const defaultNow = () => new Date().toISOString();

export function parseJsonArray<T = string>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function placeholders(n: number): string {
  return Array.from({ length: n }, () => '?').join(', ');
}
