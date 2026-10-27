import type { Food } from '@/data/schemas';
import type { Macros } from '@/domain/types';

import type { FoodSearch } from './foodSearch';
import { stripAccents } from './normalize';

export type Unit =
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'
  | 'unidade'
  | 'colher_sopa'
  | 'colher_cha'
  | 'colher'
  | 'xicara'
  | 'fatia'
  | 'copo'
  | 'concha'
  | 'prato'
  | 'pedaco'
  | 'porcao'
  | 'pote';

export type ParsedEntry = {
  /** Trecho original digitado pelo usuário. */
  raw: string;
  /** Nome do alimento sem a quantidade. */
  name: string;
  quantity: number | null;
  unit: Unit | null;
};

const NUMBER_WORDS: Record<string, number> = {
  meio: 0.5,
  meia: 0.5,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  doze: 12,
};

// Ordem importa: formas mais longas primeiro.
const UNIT_PATTERNS: [RegExp, Unit][] = [
  [/^colher(?:es)?\s+(?:de\s+)?sopa\b/, 'colher_sopa'],
  [/^colher(?:es)?\s+(?:de\s+)?cha\b/, 'colher_cha'],
  [/^colher(?:es|inhas?)?\b/, 'colher'],
  [/^(?:kg|quilos?|kilos?)\b/, 'kg'],
  [/^(?:g|gr|gramas?)\b/, 'g'],
  [/^ml\b/, 'ml'],
  [/^(?:l|litros?)\b/, 'l'],
  [/^(?:unidades?|un|und)\b/, 'unidade'],
  [/^xicaras?\b/, 'xicara'],
  [/^fatias?\b/, 'fatia'],
  [/^copos?\b/, 'copo'],
  [/^conchas?\b/, 'concha'],
  [/^pratos?\b/, 'prato'],
  [/^pedacos?\b/, 'pedaco'],
  [/^porc(?:ao|oes)\b/, 'porcao'],
  [/^potes?\b/, 'pote'],
];

/** Rótulos para casar unidades com porções caseiras (quando existirem). */
const UNIT_LABELS: Partial<Record<Unit, string[]>> = {
  unidade: ['unidade'],
  colher_sopa: ['colher de sopa', 'colher'],
  colher_cha: ['colher de cha'],
  colher: ['colher de sopa', 'colher'],
  xicara: ['xicara'],
  fatia: ['fatia'],
  copo: ['copo'],
  concha: ['concha'],
  prato: ['prato'],
  pedaco: ['pedaco'],
  porcao: ['porcao'],
  pote: ['pote'],
};

function parseNumber(token: string): number | null {
  if (/^\d+\/\d+$/.test(token)) {
    const [a, b] = token.split('/').map(Number);
    return a !== undefined && b ? a / b : null;
  }
  if (/^\d+(?:[.,]\d+)?$/.test(token)) return Number(token.replace(',', '.'));
  return NUMBER_WORDS[token] ?? null;
}

function matchUnit(text: string): { unit: Unit; rest: string } | null {
  for (const [re, unit] of UNIT_PATTERNS) {
    const m = re.exec(text);
    if (m) return { unit, rest: text.slice(m[0].length).trim() };
  }
  return null;
}

const stripLeadingOf = (s: string) => s.replace(/^(?:de|do|da|dos|das)\s+/, '').trim();

/** Separa um texto livre em itens: "2 ovos e pão integral", "arroz, feijão e frango". */
export function splitFoodText(text: string): string[] {
  return (
    text
      // Vírgula entre dígitos é decimal ("1,5 xícara"), não separador.
      .split(/(?<!\d),|,(?!\d)|[;\n+]|\s+e\s+|\s+com\s+/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  );
}

export function parseEntry(raw: string): ParsedEntry {
  // Trabalha sem acentos para os padrões, mas preserva o nome original.
  let text = stripAccents(raw).replace(/\s+/g, ' ').trim();
  let original = raw.replace(/\s+/g, ' ').trim();
  let quantity: number | null = null;
  let unit: Unit | null = null;

  // "200g de arroz", "1,5 xícara de feijão", "meia fatia de pão"
  const lead = /^(\d+\/\d+|\d+(?:[.,]\d+)?|[a-z]+)\s*/.exec(text);
  const n = lead?.[1] ? parseNumber(lead[1]) : null;
  if (lead && n !== null) {
    quantity = n;
    const afterNum = text.slice(lead[0].length);
    const u = matchUnit(afterNum);
    const consumed = text.length - (u ? u.rest.length : afterNum.length);
    unit = u?.unit ?? null;
    text = stripLeadingOf(u ? u.rest : afterNum);
    original = stripLeadingOf(original.slice(consumed).trim());
  } else {
    // "arroz 150g"
    const tail = /\s(\d+(?:[.,]\d+)?)\s*(g|gr|gramas?|kg|ml|l)$/.exec(text);
    if (tail?.[1] && tail[2]) {
      quantity = Number(tail[1].replace(',', '.'));
      unit = matchUnit(tail[2])?.unit ?? null;
      original = original.slice(0, original.length - tail[0].length).trim();
    }
  }

  return { raw: raw.trim(), name: original, quantity, unit };
}

export function parseFoodText(text: string): ParsedEntry[] {
  return splitFoodText(text).map(parseEntry);
}

export type ResolvedStatus = 'resolved' | 'needs_quantity' | 'not_found';

export type ResolvedTextItem = ParsedEntry & {
  status: ResolvedStatus;
  food: Food | null;
  /** Outras opções para o usuário trocar o alimento escolhido. */
  alternatives: Food[];
  grams: number | null;
  macros: Macros | null;
  /** Avisos para o usuário confirmar (ex.: ml convertido como gramas). */
  notes: string[];
  needsConfirmation: boolean;
};

function gramsFor(entry: ParsedEntry, food: Food | null, notes: string[]): number | null {
  const { quantity, unit } = entry;
  if (quantity === null) return null;
  switch (unit) {
    case 'g':
      return quantity;
    case 'kg':
      return quantity * 1000;
    case 'ml':
      notes.push('Volume convertido como 1 ml = 1 g; confirme a quantidade.');
      return quantity;
    case 'l':
      notes.push('Volume convertido como 1 ml = 1 g; confirme a quantidade.');
      return quantity * 1000;
    default: {
      // Contagens e medidas caseiras só viram gramas se o alimento tiver porção cadastrada.
      const labels = UNIT_LABELS[unit ?? 'unidade'] ?? [];
      const portion = food?.portions.find((p) =>
        labels.some((l) => stripAccents(p.label).startsWith(l)),
      );
      return portion ? quantity * portion.grams : null;
    }
  }
}

/** Interpreta o texto e resolve cada item na TACO. Itens sem alimento ou sem gramas pedem confirmação. */
export function resolveFoodText(text: string, search: FoodSearch): ResolvedTextItem[] {
  return parseFoodText(text).map((entry) => {
    const hits = search.search(entry.name, 5);
    const best = search.best(entry.name);
    const notes: string[] = [];
    const food = best?.food ?? null;
    const grams = food ? gramsFor(entry, food, notes) : null;
    const macros = food && grams !== null ? search.nutrientsFor(food, grams) : null;
    const status: ResolvedStatus = !food
      ? 'not_found'
      : grams === null
        ? 'needs_quantity'
        : 'resolved';
    return {
      ...entry,
      status,
      food,
      alternatives: hits.map((h) => h.food).filter((f) => f.id !== food?.id),
      grams,
      macros,
      notes,
      needsConfirmation: status !== 'resolved' || notes.length > 0,
    };
  });
}
