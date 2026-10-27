import Fuse from 'fuse.js';

import type { Food } from '@/data/schemas';
import { scaleNutrients } from '@/domain/macros';
import type { Macros } from '@/domain/types';

import { normalizeQuery, normalizeText } from './normalize';

/**
 * Alimento padrão para termos genéricos (ex.: "arroz" → arroz tipo 1 cozido).
 * IDs conferidos contra assets/data/foods.json nos testes.
 */
export const DEFAULT_FOOD_FOR_TERM: Readonly<Record<string, string>> = {
  arroz: 'taco:3',
  feijao: 'taco:561',
  frango: 'taco:410',
  ovo: 'taco:488',
  pao: 'taco:53',
  banana: 'taco:182',
  cafe: 'taco:471',
  batata: 'taco:91',
  mandioca: 'taco:129',
  aveia: 'taco:7',
  tomate: 'taco:157',
  iogurte: 'taco:448',
};

/** Estados de preparo mais comuns no consumo; ganham leve prioridade quando o termo não diz. */
const PREPARED = ['cozido', 'cozida', 'grelhado', 'grelhada', 'assado', 'assada'];

export type SearchHit = { food: Food; score: number };

type Entry = { food: Food; norm: string; head: string };

export type FoodSearch = ReturnType<typeof createFoodSearch>;

/** Score máximo (0 = perfeito) para considerar um alimento encontrado. */
export const MATCH_THRESHOLD = 0.45;

export function createFoodSearch(foods: readonly Food[]) {
  const entries: Entry[] = foods.map((food) => {
    const norm = normalizeText(food.name);
    return { food, norm, head: norm.split(' ')[0] ?? '' };
  });
  const byId = new Map(foods.map((f) => [f.id, f]));
  const fuse = new Fuse(entries, {
    keys: ['norm'],
    includeScore: true,
    ignoreLocation: true,
    threshold: 0.5,
  });

  function search(query: string, limit = 10): SearchHit[] {
    const q = normalizeQuery(query);
    if (!q) return [];
    const qTokens = q.split(' ');
    const mentionsState = qTokens.some((t) => PREPARED.includes(t) || t === 'cru' || t === 'crua');
    const preferredId = DEFAULT_FOOD_FOR_TERM[q];

    const hits = fuse.search(q, { limit: 60 }).map(({ item, score = 1 }) => {
      let s = score;
      const tokens = item.norm.split(' ');
      if (item.head === qTokens[0]) s -= 0.15;
      if (qTokens.every((t) => tokens.includes(t))) s -= 0.2;
      if (!mentionsState && tokens.some((t) => PREPARED.includes(t))) s -= 0.03;
      s += tokens.length * 0.002; // nomes mais curtos/gerais primeiro em empate
      if (item.food.id === preferredId) s = -1;
      return { food: item.food, score: s };
    });

    return hits.sort((a, b) => a.score - b.score).slice(0, limit);
  }

  /** Melhor alimento para o termo, ou null se nada for parecido o bastante. */
  function best(query: string): SearchHit | null {
    const [top] = search(query, 1);
    return top && top.score <= MATCH_THRESHOLD ? top : null;
  }

  return {
    search,
    best,
    getById: (id: string) => byId.get(id) ?? null,
    nutrientsFor: (food: Food, grams: number): Macros => scaleNutrients(food.per100g, grams),
    size: foods.length,
  };
}
