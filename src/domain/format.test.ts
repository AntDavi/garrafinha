import { describe, expect, it } from 'vitest';

import { formatLiters, formatNumber, formatSigned } from './format';

describe('format', () => {
  it('usa vírgula decimal e ponto de milhar', () => {
    expect(formatNumber(2360)).toBe('2.360');
    expect(formatNumber(1234567.891, 2)).toBe('1.234.567,89');
    expect(formatNumber(-0.04, 1)).toBe('0,0');
  });

  it('mostra sinal explícito', () => {
    expect(formatSigned(1.25, 1)).toBe('+1,3');
    expect(formatSigned(-1.2, 1)).toBe('-1,2');
    expect(formatSigned(0, 1)).toBe('0,0');
  });

  it('converte ml para litros', () => {
    expect(formatLiters(2400)).toBe('2,4 L');
  });
});
