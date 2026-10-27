/**
 * Gera assets/data/foods.json a partir da Tabela TACO 4ª edição (NEPA/Unicamp).
 *
 *   npm run data:foods                      # usa scripts/sources/taco.xlsx; se não existir, baixa do NEPA
 *   npm run data:foods -- --input outro.xlsx
 *
 * Nenhum valor é inventado: alimentos sem análise ("*" ou vazio) são excluídos e listados.
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import * as XLSX from 'xlsx';

import { foodsFileSchema, type FoodsFile } from '../src/data/schemas';
import { contentVersion } from './lib/hash';
import { parseTacoRows, TACO_SHEET } from './lib/taco';

const TACO_URL = 'https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/Taco-4a-Edicao.xlsx';
const ROOT = resolve(import.meta.dirname, '..');
const DEFAULT_INPUT = resolve(ROOT, 'scripts/sources/taco.xlsx');
const OUT = resolve(ROOT, 'assets/data/foods.json');

async function download(to: string) {
  console.log(`↓ baixando ${TACO_URL}`);
  const res = await fetch(TACO_URL, { headers: { 'User-Agent': 'garrafinha-data-scripts' } });
  if (!res.ok) {
    throw new Error(
      `Não foi possível baixar a TACO (${res.status}). Baixe manualmente a planilha "Taco-4a-Edicao.xlsx" no site do NEPA/Unicamp e salve em scripts/sources/taco.xlsx (veja README).`,
    );
  }
  await mkdir(resolve(to, '..'), { recursive: true });
  await writeFile(to, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  const { values } = parseArgs({ options: { input: { type: 'string' } } });
  const input = values.input ? resolve(values.input) : DEFAULT_INPUT;
  if (!existsSync(input)) {
    if (values.input) throw new Error(`Arquivo não encontrado: ${input}`);
    await download(input);
  }

  const wb = XLSX.readFile(input);
  const sheet = wb.Sheets[TACO_SHEET];
  if (!sheet) {
    throw new Error(
      `Aba "${TACO_SHEET}" não encontrada em ${input}. Abas disponíveis: ${wb.SheetNames.join(', ')}`,
    );
  }
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });
  const { foods, excluded } = parseTacoRows(rows);

  const file: FoodsFile = foodsFileSchema.parse({
    version: contentVersion(foods),
    source: {
      name: 'Tabela Brasileira de Composição de Alimentos (TACO), 4ª edição revisada e ampliada — NEPA/UNICAMP, 2011',
      url: TACO_URL,
      sheet: TACO_SHEET,
      license: 'Reprodução total ou parcial permitida desde que citada a fonte (NEPA/UNICAMP).',
    },
    generatedAt: new Date().toISOString(),
    excluded,
    foods,
  });

  await writeFile(OUT, JSON.stringify(file, null, 1) + '\n');
  console.log(`✔ ${foods.length} alimentos → ${OUT}`);
  if (excluded.length) {
    console.log(`⚠ ${excluded.length} excluídos por falta de análise:`);
    for (const e of excluded) console.log(`   ${e.id} ${e.name} (${e.reason})`);
  }
}

main().catch((e: unknown) => {
  console.error('✖', e instanceof Error ? e.message : e);
  process.exit(1);
});
