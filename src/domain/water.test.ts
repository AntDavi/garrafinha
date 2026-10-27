import { describe, expect, it } from 'vitest';

import { cupsToMl, goalInCups, waterProgress } from './water';

describe('water', () => {
  it('converte copos de 300 ml', () => {
    expect(cupsToMl(3)).toBe(900);
  });

  it('meta padrão de 2,4 L equivale a 8 copos', () => {
    expect(goalInCups()).toBe(8);
    expect(goalInCups(2500)).toBe(9);
  });

  it('limita o progresso a 100%', () => {
    expect(waterProgress(4)).toBe(0.5);
    expect(waterProgress(20)).toBe(1);
    expect(waterProgress(2, 0)).toBe(0);
  });
});
