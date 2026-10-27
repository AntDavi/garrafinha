import type { ActivityLevel, Goal, Sex } from './types';

export type BodyData = {
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
};

export type MacroTargets = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

const SEX_CONSTANT: Record<Sex, number> = {
  male: 5,
  female: -161,
  // "Prefiro não informar": média das duas constantes de Mifflin-St Jeor.
  unspecified: (5 + -161) / 2,
};

export const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  intense: 1.725,
};

export const GOAL_ADJUSTMENT_KCAL: Record<Goal, number> = {
  lose: -400,
  gain: 300,
  maintain: 0,
};

export const PROTEIN_G_PER_KG = 1.6;
export const FAT_SHARE_OF_KCAL = 0.28;
const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

export function validateBodyData({ age, weightKg, heightCm }: BodyData): void {
  if (!Number.isFinite(age) || age < 10 || age > 120) throw new RangeError('Idade inválida');
  if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 400)
    throw new RangeError('Peso inválido');
  if (!Number.isFinite(heightCm) || heightCm < 90 || heightCm > 250)
    throw new RangeError('Altura inválida');
}

/** Metabolismo basal (kcal/dia) por Mifflin-St Jeor, com a altura real informada. */
export function basalMetabolicRate(body: BodyData): number {
  validateBodyData(body);
  return 10 * body.weightKg + 6.25 * body.heightCm - 5 * body.age + SEX_CONSTANT[body.sex];
}

export function totalDailyEnergy(body: BodyData, activity: ActivityLevel): number {
  return basalMetabolicRate(body) * ACTIVITY_FACTOR[activity];
}

export function roundTo10(value: number): number {
  return Math.round(value / 10) * 10;
}

/** Meta diária de kcal: gasto total ajustado pelo objetivo, arredondado para múltiplos de 10. */
export function dailyKcalTarget(body: BodyData, activity: ActivityLevel, goal: Goal): number {
  return roundTo10(totalDailyEnergy(body, activity) + GOAL_ADJUSTMENT_KCAL[goal]);
}

/** Proteína 1,6 g/kg, gordura 28% das kcal e carboidrato com o restante (gramas inteiros). */
export function macroTargets(kcal: number, weightKg: number): MacroTargets {
  const protein = Math.round(PROTEIN_G_PER_KG * weightKg);
  const fat = Math.round((kcal * FAT_SHARE_OF_KCAL) / KCAL_PER_G.fat);
  const remaining = kcal - protein * KCAL_PER_G.protein - fat * KCAL_PER_G.fat;
  const carbs = Math.max(0, Math.round(remaining / KCAL_PER_G.carbs));
  return { kcal, protein, carbs, fat };
}

export function computeTargets(body: BodyData, activity: ActivityLevel, goal: Goal): MacroTargets {
  return macroTargets(dailyKcalTarget(body, activity, goal), body.weightKg);
}
