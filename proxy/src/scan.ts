import { z } from 'zod';

import { intVar, type Env } from './env';
import { generateJson, type GeminiDeps } from './gemini';
import { HttpError, readJson } from './http';
import { SCAN_SYSTEM_PROMPT, SCAN_USER_PROMPT } from './prompts';
import { enforceLimits } from './rateLimit';

export const MAX_IMAGE_BYTES = 1_500_000;
// base64 ≈ 4/3 do binário + margem para o restante do JSON.
const MAX_BODY_BYTES = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 4096;

const MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const installIdSchema = z.uuid();

const requestSchema = z.object({
  image: z
    .string()
    .min(100)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'base64 inválido'),
  mime: z.enum(MIME_TYPES),
  installId: installIdSchema,
});

/** Saída do Gemini e resposta ao app (mesmo contrato do src/services/scanApi.ts do app). */
export const scanResultSchema = z.object({
  itens: z
    .array(
      z.object({
        nome: z.string().trim().min(1).max(120),
        gramas: z.number().positive().max(3000),
        confianca: z.number().min(0).max(1),
      }),
    )
    .max(20),
});

const SCAN_JSON_SCHEMA = {
  type: 'object',
  properties: {
    itens: {
      type: 'array',
      maxItems: 20,
      items: {
        type: 'object',
        properties: {
          nome: { type: 'string', description: 'Nome do alimento em português do Brasil' },
          gramas: { type: 'number', description: 'Porção estimada em gramas' },
          confianca: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['nome', 'gramas', 'confianca'],
      },
    },
  },
  required: ['itens'],
};

export function decodedSize(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/** Confere os bytes iniciais com o tipo declarado. */
export function matchesMime(base64: string, mime: (typeof MIME_TYPES)[number]): boolean {
  const head = atob(base64.slice(0, 24));
  const bytes = Array.from(head, (c) => c.charCodeAt(0));
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === 'image/png') return head.startsWith('\x89PNG');
  return head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP';
}

export async function handleScan(request: Request, env: Env, ip: string, deps?: GeminiDeps) {
  if (!env.GEMINI_API_KEY) throw new HttpError(500, 'not_configured');

  const parsed = requestSchema.safeParse(await readJson(request, MAX_BODY_BYTES));
  if (!parsed.success) throw new HttpError(400, 'invalid_request');
  const { image, mime, installId } = parsed.data;
  if (decodedSize(image) > MAX_IMAGE_BYTES) throw new HttpError(413, 'image_too_large');
  if (!matchesMime(image, mime)) throw new HttpError(415, 'unsupported_image');

  const limits = await enforceLimits(env, {
    route: 'scan',
    installId,
    ip,
    perInstall: intVar(env.SCAN_DAILY_LIMIT_PER_INSTALL, 5),
    perIp: intVar(env.SCAN_DAILY_LIMIT_PER_IP, 30),
  });

  // Somente a imagem vai ao Gemini: nenhum dado de perfil ou identificador.
  const raw = await generateJson(
    {
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
      systemPrompt: SCAN_SYSTEM_PROMPT,
      parts: [{ inlineData: { mimeType: mime, data: image } }, { text: SCAN_USER_PROMPT }],
      responseJsonSchema: SCAN_JSON_SCHEMA,
    },
    deps,
  );
  const result = scanResultSchema.safeParse(raw);
  if (!result.success) throw new HttpError(502, 'upstream_invalid');
  await limits.commit();
  return result.data;
}
