import { periodRange, toISODate, type ReportPeriodDays } from '@/domain/dates';
import { computeTargets } from '@/domain/nutrition';
import { aggregateReport, type ReportAggregate, type ReportInput } from '@/domain/report/aggregate';
import { renderReportHtml } from '@/domain/report/html';
import { getInsights, type InsightProvider, type InsightsResult } from '@/domain/report/insights';
import type { Repositories } from '@/db/repositories';

type ReportRepos = Pick<
  Repositories,
  'profile' | 'workouts' | 'sessions' | 'meals' | 'water' | 'weight'
>;

/** Busca no banco somente registros reais do período. */
export async function collectReportInput(
  repos: ReportRepos,
  days: ReportPeriodDays,
  today: string,
): Promise<ReportInput> {
  const range = periodRange(today, days);
  const [profile, workouts, sessions, mealItems, waterLogs, weights] = await Promise.all([
    repos.profile.get(),
    repos.workouts.listSchedules(),
    repos.sessions.list(range),
    repos.meals.listItemsInRange(range),
    repos.water.list(range),
    repos.weight.list(range),
  ]);
  return {
    range,
    workouts,
    sessions,
    mealItems,
    waterLogs,
    weights,
    targets: profile
      ? computeTargets(
          {
            sex: profile.sex,
            age: profile.age,
            weightKg: profile.weightKg,
            heightCm: profile.heightCm,
          },
          profile.activity,
          profile.goal,
        )
      : null,
    waterGoalMl: profile?.waterGoalMl,
  };
}

export type BuiltReport = { aggregate: ReportAggregate; insights: InsightsResult; html: string };

export async function buildReport(
  repos: ReportRepos,
  days: ReportPeriodDays,
  opts: { today?: string; provider?: InsightProvider | null; now?: Date } = {},
): Promise<BuiltReport> {
  const today = opts.today ?? toISODate(new Date());
  const aggregate = aggregateReport(await collectReportInput(repos, days, today));
  const insights = await getInsights(aggregate, { provider: opts.provider });
  const html = renderReportHtml({
    aggregate,
    insights: insights.insights,
    generatedAt: opts.now ?? new Date(),
  });
  return { aggregate, insights, html };
}
