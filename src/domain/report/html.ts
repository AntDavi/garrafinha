import { colors, macroColors } from '../../theme/colors';
import { formatDateBR } from '../dates';
import { formatLiters, formatNumber, formatSigned } from '../format';
import type { ReportAggregate } from './aggregate';

export type ReportHtmlInput = {
  aggregate: ReportAggregate;
  insights: readonly string[];
  /** Momento da geração, exibido no rodapé. */
  generatedAt: Date;
};

export const REPORT_DISCLAIMER =
  'Este relatório não substitui avaliação de médico, nutricionista ou profissional de educação física. ' +
  'Todos os dados foram informados pelo próprio usuário no aplicativo Garrafinha.';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

const dash = '—';

function stat(label: string, value: string, hint?: string): string {
  return `<div class="stat"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div>${
    hint ? `<div class="hint">${escapeHtml(hint)}</div>` : ''
  }</div>`;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/** Gera o HTML A4 do relatório (função pura). */
export function renderReportHtml({ aggregate: a, insights, generatedAt }: ReportHtmlInput): string {
  const period = `${formatDateBR(a.range.start)} a ${formatDateBR(a.range.end)}`;
  const generated = `${pad2(generatedAt.getDate())}/${pad2(generatedAt.getMonth() + 1)}/${generatedAt.getFullYear()} ${pad2(generatedAt.getHours())}:${pad2(generatedAt.getMinutes())}`;

  const adherence =
    a.workoutAdherence === null
      ? undefined
      : `${Math.round(a.workoutAdherence * 100)}% do planejado`;
  const avg = a.avgDaily;

  const macroRow = (name: string, color: string, value: number | undefined, target?: number) =>
    `<tr><td><span class="dot" style="background:${color}"></span>${name}</td><td>${
      value === undefined ? dash : `${formatNumber(value)} g`
    }</td><td>${target === undefined ? dash : `${formatNumber(target)} g`}</td></tr>`;

  const weight =
    a.weightStart && a.weightEnd
      ? stat(
          'Peso',
          `${formatNumber(a.weightEnd.weightKg, 1)} kg`,
          a.weightDelta === null
            ? `uma pesagem em ${formatDateBR(a.weightEnd.date)}`
            : `${formatSigned(a.weightDelta, 1)} kg desde ${formatDateBR(a.weightStart.date)}`,
        )
      : stat('Peso', dash, 'sem pesagens no período');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Relatório Garrafinha</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Manrope, -apple-system, Roboto, 'Helvetica Neue', Arial, sans-serif; color: ${colors.ink}; margin: 0; font-size: 12pt; }
  h1 { font-size: 22pt; font-weight: 800; letter-spacing: -0.5px; margin: 0 0 4px; }
  h2 { font-size: 13pt; font-weight: 800; margin: 22px 0 10px; }
  .muted { color: ${colors.muted}; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .stat { border: 1px solid ${colors.line}; border-radius: 12px; padding: 10px 12px; break-inside: avoid; }
  .label { font-size: 9pt; font-weight: 700; color: ${colors.inkSoft}; text-transform: uppercase; letter-spacing: 0.4px; }
  .value { font-size: 17pt; font-weight: 800; margin-top: 4px; }
  .hint { font-size: 9pt; color: ${colors.muted}; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 7px 4px; border-bottom: 1px solid ${colors.line}; font-size: 11pt; }
  th { font-size: 9pt; color: ${colors.inkSoft}; text-transform: uppercase; }
  .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 8px; }
  ol { padding-left: 18px; margin: 0; } li { margin-bottom: 6px; }
  .disclaimer { margin-top: 28px; padding: 10px 12px; background: ${colors.surfaceAlt}; border-radius: 12px; font-size: 9pt; color: ${colors.inkSoft}; }
</style>
</head>
<body>
  <h1>Relatório Garrafinha</h1>
  <div class="muted">Período: ${escapeHtml(period)} (${a.days} dias)</div>

  <h2>Treino</h2>
  <div class="grid">
    ${stat('Treinos feitos', `${a.workoutsDone} de ${a.workoutsPlanned}`, adherence)}
    ${stat('Tempo ativo', `${formatNumber(a.activeMinutes)} min`)}
    ${weight}
  </div>

  <h2>Alimentação</h2>
  <div class="grid">
    ${stat('Dias com registro', `${a.daysWithFoodLog} de ${a.days}`)}
    ${stat('Média diária', avg ? `${formatNumber(avg.kcal)} kcal` : dash, a.targets ? `meta ${formatNumber(a.targets.kcal)} kcal` : undefined)}
    ${stat('Água média', a.avgWaterMl === null ? dash : formatLiters(a.avgWaterMl), a.waterGoalMl ? `meta ${formatLiters(a.waterGoalMl)}` : undefined)}
  </div>
  <table style="margin-top:12px">
    <thead><tr><th>Macro (média por dia registrado)</th><th>Consumo</th><th>Meta</th></tr></thead>
    <tbody>
      ${macroRow('Proteína', macroColors.protein, avg?.protein, a.targets?.protein)}
      ${macroRow('Carboidrato', macroColors.carbs, avg?.carbs, a.targets?.carbs)}
      ${macroRow('Gordura', macroColors.fat, avg?.fat, a.targets?.fat)}
    </tbody>
  </table>

  <h2>Observações</h2>
  <ol>${insights.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>

  <div class="disclaimer">${escapeHtml(REPORT_DISCLAIMER)}<br />Gerado em ${generated}.</div>
</body>
</html>`;
}
