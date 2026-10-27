import { z } from 'zod';

import { intVar, type Env } from './env';
import { generateJson, type GeminiDeps } from './gemini';
import { HttpError, readJson } from './http';
import { INSIGHTS_SYSTEM_PROMPT } from './prompts';
import { enforceLimits } from './rateLimit';
import { installIdSchema } from './scan';

const metric = z.number().finite().min(-10_000).max(100_000).nullable();

/** Apenas números agregados; chaves desconhecidas são rejeitadas. */
const metricsSchema = z.strictObject({
  days: z.number().int().min(1).max(366),
  workoutsPlanned: z.number().int().min(0).max(10_000),
  workoutsDone: z.number().int().min(0).max(10_000),
  activeMinutes: z.number().min(0).max(1_000_000),
  daysWithFoodLog: z.number().int().min(0).max(366),
  avgKcal: metric,
  avgProteinG: metric,
  avgCarbsG: metric,
  avgFatG: metric,
  targetKcal: metric,
  targetProteinG: metric,
  avgWaterMl: metric,
  waterGoalMl: metric,
  weightDeltaKg: metric,
});

const requestSchema = z.object({ installId: installIdSchema, metrics: metricsSchema });

const responseSchema = z.object({ insights: z.array(z.string().trim().min(1).max(220)).length(3) });

const INSIGHTS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    insights: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } },
  },
  required: ['insights'],
};

/** Barreira final: se o modelo prescrever ou diagnosticar, a resposta é descartada (o app usa as regras locais). */
const FORBIDDEN =
  /(diagn[oó]stic|doen[cç]a|dieta|prescrev|suplement|medicament|voc[eê] deve|recomendo|recomenda-se|\bevite\b|\bcoma\b)/i;

export function isSafeInsight(text: string): boolean {
  return !FORBIDDEN.test(text);
}

export async function handleInsights(request: Request, env: Env, ip: string, deps?: GeminiDeps) {
  if (!env.GEMINI_API_KEY) throw new HttpError(500, 'not_configured');
  const parsed = requestSchema.safeParse(await readJson(request, 8_192));
  if (!parsed.success) throw new HttpError(400, 'invalid_request');

  const perInstall = intVar(env.INSIGHTS_DAILY_LIMIT_PER_INSTALL, 10);
  const limits = await enforceLimits(env, {
    route: 'insights',
    installId: parsed.data.installId,
    ip,
    perInstall,
    perIp: perInstall * 6,
  });

  const raw = await generateJson(
    {
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
      systemPrompt: INSIGHTS_SYSTEM_PROMPT,
      parts: [{ text: `Números do período (JSON):\n${JSON.stringify(parsed.data.metrics)}` }],
      responseJsonSchema: INSIGHTS_JSON_SCHEMA,
      temperature: 0.4,
    },
    deps,
  );
  const result = responseSchema.safeParse(raw);
  if (!result.success || !result.data.insights.every(isSafeInsight)) {
    throw new HttpError(502, 'upstream_invalid');
  }
  await limits.commit();
  return result.data;
}
