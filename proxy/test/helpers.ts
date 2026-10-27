import type { Env } from '../src/env';
import type { GeminiDeps } from '../src/gemini';

export const INSTALL_ID = '6f1c2a4e-8b7d-4c3a-9e2f-1a2b3c4d5e6f';

// JPEG mínimo válido nos primeiros bytes (FF D8 FF) + preenchimento.
export const JPEG_BASE64 = btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0xe0) + 'x'.repeat(200));

export function memoryKv(): KVNamespace {
  const data = new Map<string, string>();
  return {
    get: async (k: string) => data.get(k) ?? null,
    put: async (k: string, v: string) => {
      data.set(k, v);
    },
  } as unknown as KVNamespace;
}

export function makeEnv(over: Partial<Env> = {}): Env {
  return {
    GEMINI_API_KEY: 'test-key',
    GEMINI_MODEL: 'gemini-test',
    ALLOWED_ORIGINS: 'https://garrafinha.app',
    SCAN_DAILY_LIMIT_PER_INSTALL: '2',
    SCAN_DAILY_LIMIT_PER_IP: '30',
    INSIGHTS_DAILY_LIMIT_PER_INSTALL: '10',
    RATE_KV: memoryKv(),
    ...over,
  };
}

export function geminiReply(payload: unknown, status = 200): Response {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }),
    { status },
  );
}

export function fakeDeps(
  responses: (() => Response)[],
): GeminiDeps & { calls: RequestInit[]; sleeps: number[] } {
  const calls: RequestInit[] = [];
  const sleeps: number[] = [];
  return {
    calls,
    sleeps,
    fetch: (async (_url: string, init: RequestInit) => {
      calls.push(init);
      const next = responses.shift();
      if (!next) throw new Error('sem resposta configurada');
      return next();
    }) as unknown as typeof fetch,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
  };
}

export const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://proxy.test${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7', ...headers },
    body: JSON.stringify(body),
  });
