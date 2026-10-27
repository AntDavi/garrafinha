import { describe, expect, it } from 'vitest';

import { scaleNutrients, sumMacros } from './macros';

describe('macros', () => {
  it('escala valores por 100 g', () => {
    expect(scaleNutrients({ kcal: 128, protein: 2.5, carbs: 28.1, fat: 0.2 }, 150)).toEqual({
      kcal: 192,
      protein: 3.8,
      carbs: 42.2,
      fat: 0.3,
    });
  });

  it('soma itens sem acumular erro de ponto flutuante', () => {
    const item = { kcal: 10, protein: 0.1, carbs: 0.2, fat: 0.3 };
    expect(sumMacros([item, item, item])).toEqual({ kcal: 30, protein: 0.3, carbs: 0.6, fat: 0.9 });
    expect(sumMacros([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });
});
