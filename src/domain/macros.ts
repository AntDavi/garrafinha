import type { Macros } from './types';

export type NutrientsPer100g = Macros;

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Escala valores por 100 g para a quantidade informada (kcal inteiro, macros com 1 casa). */
export function scaleNutrients(per100g: NutrientsPer100g, grams: number): Macros {
  const f = grams / 100;
  return {
    kcal: Math.round(per100g.kcal * f),
    protein: round1(per100g.protein * f),
    carbs: round1(per100g.carbs * f),
    fat: round1(per100g.fat * f),
  };
}

export function sumMacros(items: readonly Macros[]): Macros {
  const total = items.reduce(
    (acc, it) => ({
      kcal: acc.kcal + it.kcal,
      protein: acc.protein + it.protein,
      carbs: acc.carbs + it.carbs,
      fat: acc.fat + it.fat,
    }),
    ZERO_MACROS,
  );
  return {
    kcal: Math.round(total.kcal),
    protein: round1(total.protein),
    carbs: round1(total.carbs),
    fat: round1(total.fat),
  };
}
