import type { FoodsFile } from '../../src/data/schemas';

type Food = FoodsFile['foods'][number];
type Excluded = FoodsFile['excluded'][number];
type Cell = string | number | null | undefined;

export const TACO_SHEET = 'CMVCol taco3';

/** Colunas da aba CMVCol taco3 (composição centesimal), identificadas pelo cabeçalho. */
const HEADER = {
  id: /^número do alimento$/,
  name: /^descrição dos alimentos$/,
  kcal: /^energia \(kcal\)$/,
  protein: /^proteína \(g\)$/,
  fat: /^lipídeos \(g\)$/,
  carbs: /^carbo-?idrato \(g\)$/,
} as const;

type ColumnKey = keyof typeof HEADER;

const clean = (v: Cell) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();

/** As três primeiras linhas formam o cabeçalho (rótulos quebrados em várias linhas). */
export function findColumns(rows: readonly (readonly Cell[])[]): Record<ColumnKey, number> {
  for (let start = 0; start < Math.min(rows.length, 20); start++) {
    const block = rows.slice(start, start + 3);
    const width = Math.max(...block.map((r) => r.length));
    const labels = Array.from({ length: width }, (_, c) =>
      clean(block.map((r) => clean(r[c])).join(' '))
        .toLowerCase()
        .replace(/- /g, '-'),
    );
    const found: Partial<Record<ColumnKey, number>> = {};
    for (const key of Object.keys(HEADER) as ColumnKey[]) {
      const idx = labels.findIndex((l) => HEADER[key].test(l));
      if (idx >= 0) found[key] = idx;
    }
    if (Object.keys(found).length === Object.keys(HEADER).length) {
      return found as Record<ColumnKey, number>;
    }
  }
  throw new Error(
    `Cabeçalho da TACO não reconhecido. Esperado na aba "${TACO_SHEET}": Número do Alimento, Descrição dos alimentos, Energia (kcal), Proteína (g), Lipídeos (g), Carboidrato (g).`,
  );
}

/** Valores negativos menores que isto (em módulo) são tratados como traço. */
export const NEGATIVE_TOLERANCE = 0.05;

type Parsed = { ok: true; value: number } | { ok: false; reason: string };

/**
 * Converte um valor da TACO. Legenda oficial:
 * - "Tr" (traço): abaixo do limite de quantificação → 0
 * - "NA" (não aplicável): nutriente inexistente no alimento → 0
 * - negativo entre -0,05 e 0 (carboidrato por diferença) → 0
 * - "*" (análise em reavaliação) e vazio (análise não solicitada) → sem valor (alimento excluído)
 */
export function parseTacoValue(v: Cell): Parsed {
  if (typeof v === 'number' && Number.isFinite(v)) {
    // Carboidrato na TACO é calculado por diferença; resíduos negativos ínfimos equivalem a traço.
    if (v < 0 && v > -NEGATIVE_TOLERANCE) return { ok: true, value: 0 };
    if (v < 0) return { ok: false, reason: `valor negativo ${v}` };
    return { ok: true, value: v };
  }
  const s = clean(v);
  if (s === 'Tr' || s === 'NA') return { ok: true, value: 0 };
  if (s === '*') return { ok: false, reason: 'análise em reavaliação (*)' };
  if (s === '') return { ok: false, reason: 'análise não disponível (vazio)' };
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, reason: `valor "${s}"` };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function parseTacoRows(rows: readonly (readonly Cell[])[]): {
  foods: Food[];
  excluded: Excluded[];
} {
  const col = findColumns(rows);
  const foods: Food[] = [];
  const excluded: Excluded[] = [];
  let category: string | null = null;

  for (const row of rows) {
    const first = row[col.id];
    // Remove marcas de nota de rodapé da legenda (ex.: "Cerveja, pilsen 2" → "Cerveja, pilsen").
    const name = clean(row[col.name]).replace(/(?<!tipo)\s\d$/i, '');

    // Linha de categoria: texto na 1ª coluna e restante vazio.
    if (typeof first === 'string' && name === '' && row.slice(1).every((c) => clean(c) === '')) {
      category = clean(first);
      if (category === 'Legenda') break;
      continue;
    }
    if (typeof first !== 'number' || name === '') continue;
    if (!category) throw new Error(`Alimento ${first} sem categoria`);

    const id = `taco:${first}`;
    const values = {
      kcal: parseTacoValue(row[col.kcal]),
      protein: parseTacoValue(row[col.protein]),
      carbs: parseTacoValue(row[col.carbs]),
      fat: parseTacoValue(row[col.fat]),
    };
    const failed = Object.entries(values).filter(([, p]) => !p.ok);
    if (failed.length > 0) {
      const reason = failed.map(([k, p]) => `${k}: ${(p as { reason: string }).reason}`).join('; ');
      excluded.push({ id, name, reason });
      continue;
    }
    const v = (p: Parsed) => round2((p as { value: number }).value);
    foods.push({
      id,
      name,
      category,
      per100g: {
        kcal: v(values.kcal),
        protein: v(values.protein),
        carbs: v(values.carbs),
        fat: v(values.fat),
      },
      portions: [],
    });
  }

  const ids = foods.map((f) => f.id);
  if (new Set(ids).size !== ids.length) throw new Error('IDs duplicados na TACO');
  return { foods, excluded };
}
