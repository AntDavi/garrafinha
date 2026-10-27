import { corsHeaders, parseOrigins } from './cors';
import type { Env } from './env';
import type { GeminiDeps } from './gemini';
import { HttpError, json } from './http';
import { handleInsights } from './insights';
import { handleScan } from './scan';

type Handler = (request: Request, env: Env, ip: string, deps?: GeminiDeps) => Promise<unknown>;

const ROUTES: Record<string, Handler> = {
  '/scan': handleScan,
  '/insights': handleInsights,
};

export async function handle(request: Request, env: Env, deps?: GeminiDeps): Promise<Response> {
  const cors = corsHeaders(request, parseOrigins(env.ALLOWED_ORIGINS ?? ''));
  if (cors === null) return json({ error: 'origin_not_allowed' }, 403);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const { pathname } = new URL(request.url);
  if (pathname === '/health') return json({ ok: true }, 200, cors);
  const handler = ROUTES[pathname];
  if (!handler) return json({ error: 'not_found' }, 404, cors);
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors);

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  try {
    return json(await handler(request, env, ip, deps), 200, cors);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.code }, e.status, cors);
    console.error('unexpected', e instanceof Error ? e.message : e);
    return json({ error: 'internal_error' }, 500, cors);
  }
}

export default {
  fetch: (request, env) => handle(request, env),
} satisfies ExportedHandler<Env>;
