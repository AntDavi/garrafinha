export const CUP_ML = 300;
export const DEFAULT_WATER_GOAL_ML = 2400;

export function cupsToMl(cups: number): number {
  return cups * CUP_ML;
}

/** Quantidade de copos necessária para atingir a meta (arredonda para cima). */
export function goalInCups(goalMl: number = DEFAULT_WATER_GOAL_ML): number {
  return Math.ceil(goalMl / CUP_ML);
}

/** Progresso de 0 a 1 em relação à meta. */
export function waterProgress(cups: number, goalMl: number = DEFAULT_WATER_GOAL_ML): number {
  if (goalMl <= 0) return 0;
  return Math.min(1, cupsToMl(cups) / goalMl);
}
