import { describe, expect, it } from 'vitest';

import {
  addDays,
  eachDay,
  formatDateBR,
  isISODate,
  isWithin,
  periodRange,
  toISODate,
  weekdayOf,
} from './dates';

describe('dates', () => {
  it('formata data local', () => {
    expect(toISODate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('valida datas reais', () => {
    expect(isISODate('2026-02-28')).toBe(true);
    expect(isISODate('2026-02-30')).toBe(false);
    expect(isISODate('26-2-1')).toBe(false);
  });

  it('soma dias atravessando meses e anos', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('calcula dia da semana (0 = domingo)', () => {
    expect(weekdayOf('2026-10-25')).toBe(0);
    expect(weekdayOf('2026-10-27')).toBe(2);
  });

  it('gera períodos inclusivos', () => {
    const r = periodRange('2026-10-27', 7);
    expect(r).toEqual({ start: '2026-10-21', end: '2026-10-27' });
    expect(eachDay(r)).toHaveLength(7);
    expect(isWithin('2026-10-21', r)).toBe(true);
    expect(isWithin('2026-10-20', r)).toBe(false);
  });

  it('formata no padrão brasileiro', () => {
    expect(formatDateBR('2026-10-27')).toBe('27/10/2026');
  });
});
