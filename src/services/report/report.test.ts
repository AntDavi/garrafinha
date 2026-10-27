import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestDb } from '@/db/testing/setup';

import { createProxyInsightProvider, toInsightsPayload } from './insightProvider';
import { buildReport, collectReportInput } from './report';

let t: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => {
  t = await createTestDb();
});
afterEach(() => t.db.close());

describe('report service', () => {
  it('monta o relatório só com registros do banco', async () => {
    await t.repos.profile.save({
      sex: 'female',
      age: 28,
      weightKg: 62,
      heightCm: 165,
      goal: 'maintain',
      activity: 'light',
    });
    const w = await t.repos.workouts.create(
      { title: 'A', weekdays: [2], exercises: [] },
      '2026-01-01',
    );
    await t.repos.sessions.complete({ workoutId: w.id, date: '2026-10-27', durationMin: 30 });
    await t.repos.water.setCups('2026-10-27', 8);
    await t.repos.weight.add({ date: '2026-10-21', weightKg: 62.4 });
    await t.repos.weight.add({ date: '2026-10-27', weightKg: 62 });

    const input = await collectReportInput(t.repos, 7, '2026-10-27');
    expect(input.range).toEqual({ start: '2026-10-21', end: '2026-10-27' });
    expect(input.targets?.kcal).toBeGreaterThan(0);

    const r = await buildReport(t.repos, 7, {
      today: '2026-10-27',
      now: new Date(2026, 9, 27, 10),
    });
    expect(r.aggregate).toMatchObject({
      workoutsPlanned: 1,
      workoutsDone: 1,
      avgWaterMl: 2400,
      weightDelta: -0.4,
    });
    expect(r.insights.source).toBe('rules');
    expect(r.insights.insights).toHaveLength(3);
    expect(r.html).toContain('não substitui');
  });

  it('funciona sem perfil e sem registros', async () => {
    const r = await buildReport(t.repos, 30, { today: '2026-10-27' });
    expect(r.aggregate).toMatchObject({ days: 30, avgDaily: null, targets: null });
  });

  it('o provedor de IA envia apenas números agregados', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ insights: ['a', 'b', 'c'] })));
    const provider = createProxyInsightProvider({
      proxyUrl: 'https://p.test',
      fetch,
      getInstallId: async () => 'i',
    });
    const r = await buildReport(t.repos, 7, { today: '2026-10-27', provider });
    expect(r.insights).toEqual({ source: 'ai', insights: ['a', 'b', 'c'] });

    const body = JSON.parse(
      (fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(Object.keys(body)).toEqual(['installId', 'metrics']);
    expect(Object.values(body.metrics).every((v) => v === null || typeof v === 'number')).toBe(
      true,
    );
    expect(Object.keys(toInsightsPayload(r.aggregate))).not.toContain('sex');
  });
});
