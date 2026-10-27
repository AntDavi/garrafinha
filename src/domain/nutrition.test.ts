import { describe, expect, it } from 'vitest';

import {
  basalMetabolicRate,
  computeTargets,
  dailyKcalTarget,
  macroTargets,
  roundTo10,
} from './nutrition';

const base = { age: 30, weightKg: 80, heightCm: 180 };

describe('basalMetabolicRate', () => {
  it('aplica Mifflin-St Jeor para homem', () => {
    // 800 + 1125 - 150 + 5
    expect(basalMetabolicRate({ ...base, sex: 'male' })).toBe(1780);
  });

  it('aplica Mifflin-St Jeor para mulher', () => {
    expect(basalMetabolicRate({ ...base, sex: 'female' })).toBe(1614);
  });

  it('usa a média das constantes quando o sexo não é informado', () => {
    expect(basalMetabolicRate({ ...base, sex: 'unspecified' })).toBe(1697);
  });

  it('usa a altura real (não um valor fixo)', () => {
    const short = basalMetabolicRate({ ...base, sex: 'male', heightCm: 160 });
    const tall = basalMetabolicRate({ ...base, sex: 'male', heightCm: 190 });
    expect(tall - short).toBeCloseTo(6.25 * 30);
  });

  it('rejeita dados fora de faixa', () => {
    expect(() => basalMetabolicRate({ ...base, sex: 'male', heightCm: 0 })).toThrow(RangeError);
    expect(() => basalMetabolicRate({ ...base, sex: 'male', age: Number.NaN })).toThrow(RangeError);
  });
});

describe('dailyKcalTarget', () => {
  it('aplica fator de atividade e ajuste do objetivo, arredondando para 10', () => {
    // 1780 * 1.55 = 2759 → -400 = 2359 → 2360
    expect(dailyKcalTarget({ ...base, sex: 'male' }, 'moderate', 'lose')).toBe(2360);
    // 1614 * 1.2 = 1936.8 + 300 = 2236.8 → 2240
    expect(dailyKcalTarget({ ...base, sex: 'female' }, 'sedentary', 'gain')).toBe(2240);
    // 1780 * 1.725 = 3070.5 → 3070
    expect(dailyKcalTarget({ ...base, sex: 'male' }, 'intense', 'maintain')).toBe(3070);
    // 1780 * 1.375 = 2447.5 → 2450
    expect(dailyKcalTarget({ ...base, sex: 'male' }, 'light', 'maintain')).toBe(2450);
  });

  it('roundTo10 arredonda para o múltiplo mais próximo', () => {
    expect(roundTo10(1234)).toBe(1230);
    expect(roundTo10(1235)).toBe(1240);
  });
});

describe('macroTargets', () => {
  it('distribui proteína por kg, gordura 28% e carboidrato no restante', () => {
    const t = macroTargets(2000, 70);
    expect(t.protein).toBe(112);
    expect(t.fat).toBe(62); // 560 kcal / 9
    expect(t.carbs).toBe(249); // (2000 - 448 - 558) / 4 = 248.5 → 249
  });

  it('nunca retorna carboidrato negativo', () => {
    expect(macroTargets(800, 150).carbs).toBe(0);
  });

  it('computeTargets encadeia os cálculos', () => {
    expect(computeTargets({ ...base, sex: 'male' }, 'moderate', 'lose')).toEqual({
      kcal: 2360,
      protein: 128,
      fat: 73,
      carbs: 298, // (2360 - 512 - 657) / 4 = 297.75
    });
  });
});
