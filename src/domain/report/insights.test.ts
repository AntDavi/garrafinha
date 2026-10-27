import { describe, expect, it } from 'vitest';

import { aggregateReport, type ReportInput } from './aggregate';
import { getInsights, ruleBasedInsights, type InsightProvider } from './insights';

const range = { start: '2026-10-21', end: '2026-10-27' };
const empty: ReportInput = {
  range,
  workouts: [],
  sessions: [],
  mealItems: [],
  waterLogs: [],
  weights: [],
};

const full = aggregateReport({
  ...empty,
  workouts: [{ id: 'a', createdOn: '2026-01-01', weekdays: [1, 3, 5] }],
  sessions: [{ date: '2026-10-21', durationMin: 40 }],
  mealItems: [{ date: '2026-10-21', kcal: 2000, protein: 90, carbs: 250, fat: 60 }],
  waterLogs: [{ date: '2026-10-21', cups: 6 }],
  weights: [
    { date: '2026-10-21', weightKg: 80 },
    { date: '2026-10-27', weightKg: 79.5 },
  ],
  targets: { kcal: 2200, protein: 128, carbs: 250, fat: 68 },
  waterGoalMl: 2400,
});

const FORBIDDEN = /(diagn|deve |recomend|precisa |dieta)/i;

describe('ruleBasedInsights', () => {
  it('sempre devolve 3 observações, mesmo sem dados', () => {
    const list = ruleBasedInsights(aggregateReport(empty));
    expect(list).toHaveLength(3);
    expect(new Set(list).size).toBe(3);
  });

  it('prioriza treino, registro alimentar e kcal', () => {
    const list = ruleBasedInsights(full);
    expect(list[0]).toBe('Você concluiu 1 de 3 treinos planejados no período (33%).');
    expect(list[1]).toBe('Você registrou refeições em 1 de 7 dias.');
    expect(list[2]).toBe(
      'A média foi de 2.000 kcal nos dias com registro, para uma meta de 2.200 kcal.',
    );
  });

  it('usa linguagem descritiva, sem diagnóstico ou prescrição', () => {
    for (const s of [...ruleBasedInsights(full), ...ruleBasedInsights(aggregateReport(empty))]) {
      expect(s).not.toMatch(FORBIDDEN);
    }
  });
});

describe('getInsights', () => {
  it('usa a IA quando a resposta é válida', async () => {
    const provider: InsightProvider = { getInsights: async () => ['a', 'b', 'c'] };
    expect(await getInsights(full, { provider })).toEqual({
      source: 'ai',
      insights: ['a', 'b', 'c'],
    });
  });

  it('cai para as regras quando a IA falha ou responde fora do formato', async () => {
    const failing: InsightProvider = {
      getInsights: async () => {
        throw new Error('offline');
      },
    };
    const wrong: InsightProvider = { getInsights: async () => ['só uma'] };
    expect((await getInsights(full, { provider: failing })).source).toBe('rules');
    expect((await getInsights(full, { provider: wrong })).source).toBe('rules');
    expect((await getInsights(full)).source).toBe('rules');
  });

  it('respeita o timeout', async () => {
    const slow: InsightProvider = {
      getInsights: (_a, signal) =>
        new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('t')))),
    };
    const r = await getInsights(full, { provider: slow, timeoutMs: 10 });
    expect(r.source).toBe('rules');
  });
});
