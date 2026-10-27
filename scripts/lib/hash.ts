import { createHash } from 'node:crypto';

/** Versão de seed estável: hash do conteúdo (muda só quando os dados mudam). */
export function contentVersion(data: unknown): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 12);
}
