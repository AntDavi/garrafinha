import type { Env } from './env';
import { HttpError } from './http';

const DAY_TTL_SECONDS = 60 * 60 * 48;

const today = (now: Date) => now.toISOString().slice(0, 10);

/**
 * Contador diário em KV. KV é eventualmente consistente: o limite é "suave" (pode passar de 1–2
 * em acessos simultâneos), suficiente para proteger a cota gratuita do Gemini.
 * Free tier do KV: 1.000 escritas/dia → cada scan consome 2 escritas (instalação + IP).
 */
export async function consumeDaily(
  kv: KVNamespace,
  key: string,
  limit: number,
  now = new Date(),
): Promise<{ ok: boolean; count: number }> {
  const fullKey = `${key}:${today(now)}`;
  const current = Number((await kv.get(fullKey)) ?? '0');
  if (current >= limit) return { ok: false, count: current };
  await kv.put(fullKey, String(current + 1), { expirationTtl: DAY_TTL_SECONDS });
  return { ok: true, count: current + 1 };
}

/** Aplica burst por IP (Rate Limiting binding) e limites diários por instalação e por IP. */
export async function enforceLimits(
  env: Env,
  opts: { route: string; installId: string; ip: string; perInstall: number; perIp: number },
): Promise<void> {
  if (env.BURST_LIMITER) {
    const { success } = await env.BURST_LIMITER.limit({ key: `${opts.route}:${opts.ip}` });
    if (!success) throw new HttpError(429, 'rate_limited');
  }
  const byIp = await consumeDaily(env.RATE_KV, `${opts.route}:ip:${opts.ip}`, opts.perIp);
  if (!byIp.ok) throw new HttpError(429, 'daily_limit_ip');
  const byInstall = await consumeDaily(
    env.RATE_KV,
    `${opts.route}:inst:${opts.installId}`,
    opts.perInstall,
  );
  if (!byInstall.ok) throw new HttpError(429, 'daily_limit_install');
}
