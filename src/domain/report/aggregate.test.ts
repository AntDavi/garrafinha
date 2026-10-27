import { describe, expect, it } from 'vitest';

import { aggregateReport, type ReportInput } from './aggregate';

// 2026-10-21 (quarta) a 2026-10-27 (terça)
const range = { start: '2026-10-21', end: '2026-10-27' };

const empty: ReportInput = {
  range,
  workouts: [],
  sessions: [],
  mealItems: [],
  waterLogs: [],
  weights: [],
};

describe('aggregateReport', () => {
  it('não inventa números quando não há registros', () => {
    const r = aggregateReport(empty);
    expect(r).toMatchObject({
      days: 7,
      workoutsPlanned: 0,
      workoutsDone: 0,
      workoutAdherence: null,
      activeMinutes: 0,
      daysWithFoodLog: 0,
      avgDaily: null,
      avgWaterMl: null,
      weightStart: null,
      weightDelta: null,
    });
  });

  it('conta treinos planejados por dia da semana a partir da criação do treino', () => {
    const r = aggregateReport({
      ...empty,
      workouts: [
        { id: 'a', createdOn: '2026-01-01', weekdays: [1, 3, 5] }, // seg, qua, sex → 3 no período
        { id: 'b', createdOn: '2026-10-25', weekdays: [0, 2] }, // criado no domingo → dom 25 e ter 27
      ],
      sessions: [
        { date: '2026-10-21', durationMin: 45 },
        { date: '2026-10-23', durationMin: 50 },
        { date: '2026-10-20', durationMin: 60 }, // fora do período
      ],
    });
    expect(r.workoutsPlanned).toBe(5);
    expect(r.workoutsDone).toBe(2);
    expect(r.workoutAdherence).toBeCloseTo(0.4);
    expect(r.activeMinutes).toBe(95);
  });

  it('calcula médias apenas sobre dias com registro alimentar', () => {
    const r = aggregateReport({
      ...empty,
      mealItems: [
        { date: '2026-10-21', kcal: 1000, protein: 50, carbs: 100, fat: 30 },
        { date: '2026-10-21', kcal: 800, protein: 40, carbs: 90, fat: 20 },
        { date: '2026-10-22', kcal: 2200, protein: 110, carbs: 250, fat: 70 },
        { date: '2026-09-01', kcal: 9999, protein: 1, carbs: 1, fat: 1 },
      ],
    });
    expect(r.daysWithFoodLog).toBe(2);
    expect(r.avgDaily).toEqual({ kcal: 2000, protein: 100, carbs: 220, fat: 60 });
  });

  it('calcula água média e variação de peso', () => {
    const r = aggregateReport({
      ...empty,
      waterLogs: [
        { date: '2026-10-21', cups: 8 },
        { date: '2026-10-22', cups: 6 },
        { date: '2026-10-23', cups: 0 },
      ],
      weights: [
        { date: '2026-10-27', weightKg: 79.4 },
        { date: '2026-10-21', weightKg: 80.6 },
        { date: '2026-10-24', weightKg: 80.0 },
      ],
    });
    expect(r.daysWithWaterLog).toBe(2);
    expect(r.avgWaterMl).toBe(2100);
    expect(r.weightStart).toEqual({ date: '2026-10-21', weightKg: 80.6 });
    expect(r.weightEnd).toEqual({ date: '2026-10-27', weightKg: 79.4 });
    expect(r.weightDelta).toBe(-1.2);
  });

  it('não calcula variação com uma única pesagem', () => {
    const r = aggregateReport({ ...empty, weights: [{ date: '2026-10-22', weightKg: 70 }] });
    expect(r.weightStart).toEqual(r.weightEnd);
    expect(r.weightDelta).toBeNull();
  });
});
