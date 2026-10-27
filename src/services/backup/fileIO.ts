import { getDocumentAsync } from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';

import { toISODate } from '@/domain/dates';
import type { SqlDb } from '@/db/types';

import {
  exportBackup,
  importBackup,
  serializeBackup,
  type ImportMode,
  type ImportSummary,
} from './backup';

/** Gera o arquivo JSON de backup e abre o compartilhamento do sistema. */
export async function shareBackupFile(db: SqlDb): Promise<void> {
  const backup = await exportBackup(db);
  const file = new File(Paths.cache, `garrafinha-backup-${toISODate(new Date())}.json`);
  if (file.exists) file.delete();
  file.create();
  await file.write(serializeBackup(backup));
  await shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Salvar backup do Garrafinha',
  });
}

/** Abre o seletor de arquivos e importa o backup escolhido. Retorna null se o usuário cancelar. */
export async function pickAndImportBackup(
  db: SqlDb,
  mode: ImportMode,
): Promise<ImportSummary | null> {
  const result = await getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  const text = await new File(asset.uri).text();
  return importBackup(db, text, mode);
}
