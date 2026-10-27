import { HttpError } from './http';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export type GeminiRequest = {
  apiKey: string;
  model: string;
  systemPrompt: string;
  parts: GeminiPart[];
  /** JSON Schema da resposta (saída estruturada). */
  responseJsonSchema: Record<string, unknown>;
  temperature?: number;
};

export type GeminiDeps = {
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
};

export const defaultGeminiDeps: GeminiDeps = {
  fetch: (input, init) => fetch(input, init),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};

const RETRY_STATUSES = new Set([429, 503]);
export const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 250;
const MAX_DELAY_MS = 2000;

/** Chama generateContent com saída JSON e retry exponencial curto em 429/503. Retorna o JSON já parseado. */
export async function generateJson(
  req: GeminiRequest,
  deps: GeminiDeps = defaultGeminiDeps,
): Promise<unknown> {
  const url = `${API_BASE}/${encodeURIComponent(req.model)}:generateContent`;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: req.systemPrompt }] },
    contents: [{ role: 'user', parts: req.parts }],
    generationConfig: {
      temperature: req.temperature ?? 0.2,
      responseMimeType: 'application/json',
      responseJsonSchema: req.responseJsonSchema,
    },
  });

  let res: Response | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    res = await deps.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': req.apiKey },
      body,
    });
    if (!RETRY_STATUSES.has(res.status) || attempt === MAX_ATTEMPTS) break;
    const retryAfter = Number(res.headers.get('Retry-After')) * 1000;
    const backoff = BASE_DELAY_MS * 2 ** (attempt - 1);
    await deps.sleep(
      Math.min(MAX_DELAY_MS, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : backoff),
    );
  }

  if (!res || res.status === 429) throw new HttpError(503, 'upstream_busy');
  if (!res.ok) throw new HttpError(502, 'upstream_error', `Gemini ${res.status}`);

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(502, 'upstream_invalid');
  }
}
