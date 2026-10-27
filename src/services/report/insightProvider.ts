import { z } from 'zod';

import type { ReportAggregate } from '@/domain/report/aggregate';
import type { InsightProvider } from '@/domain/report/insights';

import type { FetchLike } from '../http';

/** Somente números agregados vão ao proxy; nenhum dado de perfil (sexo, idade, altura). */
export function toInsightsPayload(a: ReportAggregate) {
  return {
    days: a.days,
    workoutsPlanned: a.workoutsPlanned,
    workoutsDone: a.workoutsDone,
    activeMinutes: a.activeMinutes,
    daysWithFoodLog: a.daysWithFoodLog,
    avgKcal: a.avgDaily?.kcal ?? null,
    avgProteinG: a.avgDaily?.protein ?? null,
    avgCarbsG: a.avgDaily?.carbs ?? null,
    avgFatG: a.avgDaily?.fat ?? null,
    targetKcal: a.targets?.kcal ?? null,
    targetProteinG: a.targets?.protein ?? null,
    avgWaterMl: a.avgWaterMl,
    waterGoalMl: a.waterGoalMl,
    weightDeltaKg: a.weightDelta,
  };
}

const responseSchema = z.object({ insights: z.array(z.string()) });

export function createProxyInsightProvider(opts: {
  proxyUrl: string;
  fetch: FetchLike;
  getInstallId: () => Promise<string>;
}): InsightProvider {
  return {
    async getInsights(aggregate, signal) {
      const res = await opts.fetch(`${opts.proxyUrl}/insights`, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installId: await opts.getInstallId(),
          metrics: toInsightsPayload(aggregate),
        }),
      });
      if (!res.ok) throw new Error(`insights ${res.status}`);
      return responseSchema.parse(await res.json()).insights;
    },
  };
}
