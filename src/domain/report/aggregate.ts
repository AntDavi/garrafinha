import { eachDay, isWithin, weekdayOf, type DateRange } from '../dates';
import { round1 } from '../macros';
import type { ISODate, Macros, Weekday } from '../types';
import { cupsToMl } from '../water';

/** Registros reais vindos do banco. Nada aqui é estimado ou simulado. */
export type ReportInput = {
  range: DateRange;
  workouts: readonly { id: string; createdOn: ISODate; weekdays: readonly Weekday[] }[];
  sessions: readonly { date: ISODate; durationMin: number }[];
  mealItems: readonly ({ date: ISODate } & Macros)[];
  waterLogs: readonly { date: ISODate; cups: number }[];
  weights: readonly { date: ISODate; weightKg: number }[];
  /** Metas atuais do perfil, apenas para comparação. */
  targets?: Macros | null;
  waterGoalMl?: number;
};

export type ReportAggregate = {
  range: DateRange;
  days: number;
  workoutsPlanned: number;
  workoutsDone: number;
  /** done / planned (0..∞) ou null quando nada foi planejado. */
  workoutAdherence: number | null;
  activeMinutes: number;
  daysWithFoodLog: number;
  /** Médias por dia COM registro alimentar (dias sem registro não entram como zero). */
  avgDaily: Macros | null;
  daysWithWaterLog: number;
  /** Média de água em ml nos dias com registro de água. */
  avgWaterMl: number | null;
  weightStart: { date: ISODate; weightKg: number } | null;
  weightEnd: { date: ISODate; weightKg: number } | null;
  weightDelta: number | null;
  targets: Macros | null;
  waterGoalMl: number | null;
};

export function aggregateReport(input: ReportInput): ReportAggregate {
  const { range } = input;
  const days = eachDay(range);

  // Planejados: para cada dia, treinos já existentes naquele dia e marcados para o dia da semana.
  let workoutsPlanned = 0;
  for (const day of days) {
    const wd = weekdayOf(day);
    for (const w of input.workouts) {
      if (w.createdOn <= day && w.weekdays.includes(wd)) workoutsPlanned++;
    }
  }

  const sessions = input.sessions.filter((s) => isWithin(s.date, range));
  const workoutsDone = sessions.length;
  const activeMinutes = sessions.reduce((acc, s) => acc + Math.max(0, s.durationMin), 0);

  const foodByDay = new Map<ISODate, Macros>();
  for (const it of input.mealItems) {
    if (!isWithin(it.date, range)) continue;
    const acc = foodByDay.get(it.date) ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    foodByDay.set(it.date, {
      kcal: acc.kcal + it.kcal,
      protein: acc.protein + it.protein,
      carbs: acc.carbs + it.carbs,
      fat: acc.fat + it.fat,
    });
  }
  const daysWithFoodLog = foodByDay.size;
  let avgDaily: Macros | null = null;
  if (daysWithFoodLog > 0) {
    const totals = [...foodByDay.values()].reduce(
      (a, d) => ({
        kcal: a.kcal + d.kcal,
        protein: a.protein + d.protein,
        carbs: a.carbs + d.carbs,
        fat: a.fat + d.fat,
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    );
    avgDaily = {
      kcal: Math.round(totals.kcal / daysWithFoodLog),
      protein: round1(totals.protein / daysWithFoodLog),
      carbs: round1(totals.carbs / daysWithFoodLog),
      fat: round1(totals.fat / daysWithFoodLog),
    };
  }

  const water = input.waterLogs.filter((w) => isWithin(w.date, range) && w.cups > 0);
  const daysWithWaterLog = new Set(water.map((w) => w.date)).size;
  const avgWaterMl =
    daysWithWaterLog > 0
      ? Math.round(water.reduce((a, w) => a + cupsToMl(w.cups), 0) / daysWithWaterLog)
      : null;

  const weights = input.weights
    .filter((w) => isWithin(w.date, range))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  const first = weights[0];
  const last = weights[weights.length - 1];
  const weightStart = first ? { date: first.date, weightKg: first.weightKg } : null;
  const weightEnd = last ? { date: last.date, weightKg: last.weightKg } : null;
  const weightDelta =
    first && last && weights.length > 1 ? round1(last.weightKg - first.weightKg) : null;

  return {
    range,
    days: days.length,
    workoutsPlanned,
    workoutsDone,
    workoutAdherence: workoutsPlanned > 0 ? workoutsDone / workoutsPlanned : null,
    activeMinutes,
    daysWithFoodLog,
    avgDaily,
    daysWithWaterLog,
    avgWaterMl,
    weightStart,
    weightEnd,
    weightDelta,
    targets: input.targets ?? null,
    waterGoalMl: input.waterGoalMl ?? null,
  };
}
