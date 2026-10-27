import { formatLiters, formatNumber, formatSigned } from '../format';
import type { ReportAggregate } from './aggregate';

export const INSIGHT_COUNT = 3;
export const INSIGHT_MAX_LENGTH = 220;

/**
 * Provedor opcional (ex.: proxy de IA). Recebe apenas números agregados.
 * Deve devolver exatamente 3 frases descritivas, sem diagnóstico nem prescrição.
 */
export type InsightProvider = {
  getInsights(aggregate: ReportAggregate, signal: AbortSignal): Promise<string[]>;
};

export type InsightsResult = { source: 'ai' | 'rules'; insights: string[] };

type Candidate = { priority: number; text: string };

function workoutInsight(a: ReportAggregate): Candidate {
  if (a.workoutsPlanned > 0) {
    const pct = Math.round((a.workoutsDone / a.workoutsPlanned) * 100);
    return {
      priority: 1,
      text: `Você concluiu ${a.workoutsDone} de ${a.workoutsPlanned} treinos planejados no período (${pct}%).`,
    };
  }
  if (a.workoutsDone > 0) {
    return {
      priority: 1,
      text: `Você registrou ${a.workoutsDone} ${a.workoutsDone === 1 ? 'treino' : 'treinos'}, somando ${a.activeMinutes} minutos ativos.`,
    };
  }
  return { priority: 5, text: 'Nenhum treino foi planejado ou registrado neste período.' };
}

function foodLogInsight(a: ReportAggregate): Candidate {
  if (a.daysWithFoodLog === 0) {
    return { priority: 4, text: 'Não há refeições registradas neste período.' };
  }
  return {
    priority: 2,
    text: `Você registrou refeições em ${a.daysWithFoodLog} de ${a.days} dias.`,
  };
}

function kcalInsight(a: ReportAggregate): Candidate | null {
  if (!a.avgDaily) return null;
  const base = `A média foi de ${formatNumber(a.avgDaily.kcal)} kcal nos dias com registro`;
  if (!a.targets) return { priority: 3, text: `${base}.` };
  return {
    priority: 3,
    text: `${base}, para uma meta de ${formatNumber(a.targets.kcal)} kcal.`,
  };
}

function proteinInsight(a: ReportAggregate): Candidate | null {
  if (!a.avgDaily || !a.targets) return null;
  return {
    priority: 3.5,
    text: `A proteína ficou em média em ${formatNumber(a.avgDaily.protein)} g por dia registrado, com meta de ${formatNumber(a.targets.protein)} g.`,
  };
}

function waterInsight(a: ReportAggregate): Candidate | null {
  if (a.avgWaterMl === null) return null;
  const goal = a.waterGoalMl ? `, com meta de ${formatLiters(a.waterGoalMl)}` : '';
  return {
    priority: 3.2,
    text: `Você bebeu em média ${formatLiters(a.avgWaterMl)} de água nos ${a.daysWithWaterLog} dias com registro${goal}.`,
  };
}

function weightInsight(a: ReportAggregate): Candidate | null {
  if (a.weightDelta === null || !a.weightStart || !a.weightEnd) return null;
  if (a.weightDelta === 0) {
    return {
      priority: 3.1,
      text: `Seu peso se manteve em ${formatNumber(a.weightEnd.weightKg, 1)} kg entre a primeira e a última pesagem.`,
    };
  }
  return {
    priority: 3.1,
    text: `Seu peso variou ${formatSigned(a.weightDelta, 1)} kg no período (de ${formatNumber(a.weightStart.weightKg, 1)} para ${formatNumber(a.weightEnd.weightKg, 1)} kg).`,
  };
}

const FILLERS = [
  'Registrar refeições, água e pesagens com regularidade deixa este relatório mais completo.',
  'Nenhuma pesagem com variação foi registrada neste período.',
  'Nenhum registro de água foi feito neste período.',
];

/** Gera 3 observações curtas, descritivas, apenas com base nos números agregados. */
export function ruleBasedInsights(a: ReportAggregate): string[] {
  const candidates = [
    workoutInsight(a),
    foodLogInsight(a),
    kcalInsight(a),
    weightInsight(a),
    waterInsight(a),
    proteinInsight(a),
  ].filter((c): c is Candidate => c !== null);

  const picked = candidates
    .slice()
    .sort((x, y) => x.priority - y.priority)
    .slice(0, INSIGHT_COUNT)
    .map((c) => c.text);

  for (const filler of FILLERS) {
    if (picked.length >= INSIGHT_COUNT) break;
    if (!picked.includes(filler)) picked.push(filler);
  }
  return picked;
}

export function isValidInsightList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length === INSIGHT_COUNT &&
    value.every(
      (s) => typeof s === 'string' && s.trim().length > 0 && s.length <= INSIGHT_MAX_LENGTH,
    )
  );
}

/** Tenta o provedor de IA (se houver) e cai automaticamente para as regras locais. */
export async function getInsights(
  aggregate: ReportAggregate,
  options: { provider?: InsightProvider | null; timeoutMs?: number } = {},
): Promise<InsightsResult> {
  const { provider, timeoutMs = 8000 } = options;
  if (provider) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const result = await provider.getInsights(aggregate, controller.signal);
      if (isValidInsightList(result)) {
        return { source: 'ai', insights: result.map((s) => s.trim()) };
      }
    } catch {
      // Falha de rede/timeout/resposta: segue para as regras locais.
    } finally {
      clearTimeout(timer);
    }
  }
  return { source: 'rules', insights: ruleBasedInsights(aggregate) };
}
