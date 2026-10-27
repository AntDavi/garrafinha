import { describe, expect, it } from 'vitest';

import { aggregateReport } from './aggregate';
import { escapeHtml, renderReportHtml, REPORT_DISCLAIMER } from './html';

const aggregate = aggregateReport({
  range: { start: '2026-10-21', end: '2026-10-27' },
  workouts: [{ id: 'a', createdOn: '2026-01-01', weekdays: [1, 3, 5] }],
  sessions: [{ date: '2026-10-21', durationMin: 40 }],
  mealItems: [{ date: '2026-10-21', kcal: 2000, protein: 90, carbs: 250, fat: 60 }],
  waterLogs: [],
  weights: [],
});

describe('renderReportHtml', () => {
  const html = renderReportHtml({
    aggregate,
    insights: ['Primeira <b>obs</b>', 'Segunda', 'Terceira'],
    generatedAt: new Date(2026, 9, 27, 9, 5),
  });

  it('gera documento A4 em pt-BR', () => {
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain('size: A4');
    expect(html).toContain('21/10/2026 a 27/10/2026');
  });

  it('inclui o aviso de que não substitui avaliação profissional', () => {
    expect(html).toContain(escapeHtml(REPORT_DISCLAIMER));
    expect(REPORT_DISCLAIMER).toMatch(/não substitui/);
    expect(REPORT_DISCLAIMER).toMatch(/informados pelo próprio usuário/);
  });

  it('escapa o texto das observações', () => {
    expect(html).toContain('Primeira &lt;b&gt;obs&lt;/b&gt;');
    expect(html).not.toContain('<b>obs</b>');
  });

  it('mostra traço quando não há dados em vez de zero inventado', () => {
    expect(html).toContain('sem pesagens no período');
    expect(html).toMatch(/Água média<\/div><div class="value">—/);
  });
});
