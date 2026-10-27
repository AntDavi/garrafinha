import type { ISODate, Weekday } from './types';

export type ReportPeriodDays = 7 | 30 | 90;
export const REPORT_PERIODS: readonly ReportPeriodDays[] = [7, 30, 90];

export type DateRange = { start: ISODate; end: ISODate };

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number) => String(n).padStart(2, '0');

/** Data local (não UTC) no formato YYYY-MM-DD. */
export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isISODate(value: string): boolean {
  const m = ISO_RE.exec(value);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return toISODate(d) === value;
}

/** Converte YYYY-MM-DD em Date ao meio-dia local, evitando saltos de horário de verão. */
export function parseISODate(value: ISODate): Date {
  const m = ISO_RE.exec(value);
  if (!m || !isISODate(value)) throw new RangeError(`Data inválida: ${value}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = parseISODate(date);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function weekdayOf(date: ISODate): Weekday {
  return parseISODate(date).getDay() as Weekday;
}

/** Período de N dias terminando em `end` (inclusivo). */
export function periodRange(end: ISODate, days: number): DateRange {
  return { start: addDays(end, -(days - 1)), end };
}

export function eachDay({ start, end }: DateRange): ISODate[] {
  const out: ISODate[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

export function isWithin(date: ISODate, { start, end }: DateRange): boolean {
  return date >= start && date <= end;
}

export function formatDateBR(date: ISODate): string {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}
