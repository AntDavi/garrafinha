export type Sex = 'male' | 'female' | 'unspecified';
export type Goal = 'lose' | 'gain' | 'maintain';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'intense';
export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type MealSource = 'text' | 'photo' | 'barcode' | 'label' | 'manual';

/** Dia da semana no padrão de Date#getDay: 0 = domingo ... 6 = sábado. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Data local no formato YYYY-MM-DD. */
export type ISODate = string;

export type Macros = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export const SEXES = ['male', 'female', 'unspecified'] as const satisfies readonly Sex[];
export const GOALS = ['lose', 'gain', 'maintain'] as const satisfies readonly Goal[];
export const ACTIVITY_LEVELS = [
  'sedentary',
  'light',
  'moderate',
  'intense',
] as const satisfies readonly ActivityLevel[];
export const MEAL_TYPES = [
  'breakfast',
  'lunch',
  'snack',
  'dinner',
] as const satisfies readonly MealType[];
export const MEAL_SOURCES = [
  'text',
  'photo',
  'barcode',
  'label',
  'manual',
] as const satisfies readonly MealSource[];

export const sexLabels: Record<Sex, string> = {
  male: 'Masculino',
  female: 'Feminino',
  unspecified: 'Prefiro não informar',
};

export const goalLabels: Record<Goal, string> = {
  lose: 'Perder peso',
  gain: 'Ganhar massa',
  maintain: 'Manter',
};

export const activityLabels: Record<ActivityLevel, string> = {
  sedentary: 'Sedentário',
  light: 'Leve',
  moderate: 'Moderado',
  intense: 'Intenso',
};

export const mealTypeLabels: Record<MealType, string> = {
  breakfast: 'Café da manhã',
  lunch: 'Almoço',
  snack: 'Lanche',
  dinner: 'Jantar',
};

export const mealSourceLabels: Record<MealSource, string> = {
  text: 'Texto',
  photo: 'Foto',
  barcode: 'Código de barras',
  label: 'Rótulo',
  manual: 'Manual',
};
