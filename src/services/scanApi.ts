import { z } from 'zod';

import type { Food } from '@/data/schemas';
import type { Macros } from '@/domain/types';

import { ServiceError } from './errors';
import type { FoodSearch } from './foodSearch';
import { fetchWithTimeout, type FetchLike } from './http';
import type { ScanLimiter } from './scanLimit';

/** Imagem pronta para envio (redimensionada/comprimida). */
export type PreparedImage = { base64: string; mime: 'image/jpeg' | 'image/png' | 'image/webp' };

/** Contrato do proxy: a IA só identifica alimento e porção estimada. */
export const scanResponseSchema = z.object({
  itens: z
    .array(
      z.object({
        nome: z.string().trim().min(1).max(120),
        gramas: z.number().finite().positive().max(3000),
        confianca: z.number().min(0).max(1),
      }),
    )
    .max(20),
});

export type ScanResponse = z.infer<typeof scanResponseSchema>;

export const LOW_CONFIDENCE = 0.6;

export type ScanItem = {
  /** Nome como a IA identificou. */
  detectedName: string;
  grams: number;
  confidence: number;
  /** Alimento resolvido na TACO (macros SEMPRE da tabela). */
  food: Food | null;
  alternatives: Food[];
  macros: Macros | null;
  needsConfirmation: boolean;
};

export type ScanResult = { items: ScanItem[]; remainingToday: number };

export function resolveScanItems(response: ScanResponse, search: FoodSearch): ScanItem[] {
  return response.itens.map((it) => {
    const best = search.best(it.nome);
    const food = best?.food ?? null;
    const grams = Math.round(it.gramas);
    return {
      detectedName: it.nome,
      grams,
      confidence: it.confianca,
      food,
      alternatives: search
        .search(it.nome, 5)
        .map((h) => h.food)
        .filter((f) => f.id !== food?.id),
      macros: food ? search.nutrientsFor(food, grams) : null,
      needsConfirmation: !food || it.confianca < LOW_CONFIDENCE,
    };
  });
}

export type ScanClientDeps = {
  proxyUrl: string | null;
  fetch: FetchLike;
  limiter: ScanLimiter;
  getInstallId: () => Promise<string>;
  getFoodSearch: () => Promise<FoodSearch>;
  timeoutMs?: number;
};

export function createScanClient(deps: ScanClientDeps) {
  return {
    /** Envia a foto ao proxy, recebe {nome, gramas, confianca} e resolve nutrientes na TACO. */
    async scan(image: PreparedImage): Promise<ScanResult> {
      if (!deps.proxyUrl) {
        throw new ServiceError(
          'not_configured',
          'EXPO_PUBLIC_PROXY_URL não definido',
          'O reconhecimento por foto não está disponível nesta versão.',
        );
      }
      if ((await deps.limiter.remaining()) <= 0) {
        throw new ServiceError(
          'limit_exceeded',
          'Limite diário local de scans atingido',
          'Você atingiu o limite de fotos de hoje. Registre por texto ou tente amanhã.',
        );
      }

      const res = await fetchWithTimeout(deps.fetch, `${deps.proxyUrl}/scan`, {
        method: 'POST',
        timeoutMs: deps.timeoutMs ?? 30_000,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: image.base64,
          mime: image.mime,
          installId: await deps.getInstallId(),
        }),
      });

      if (res.status === 429) {
        throw new ServiceError(
          'limit_exceeded',
          'Proxy respondeu 429',
          'Você atingiu o limite de fotos de hoje. Registre por texto ou tente amanhã.',
        );
      }
      if (!res.ok) {
        throw new ServiceError(
          'service_unavailable',
          `Proxy respondeu ${res.status}`,
          'Não foi possível analisar a foto agora. Tente de novo em instantes.',
        );
      }

      let parsed: ScanResponse;
      try {
        parsed = scanResponseSchema.parse(await res.json());
      } catch (e) {
        throw new ServiceError(
          'invalid_response',
          'Resposta do proxy fora do contrato',
          'Não foi possível entender a análise da foto.',
          { cause: e },
        );
      }

      await deps.limiter.consume();
      const search = await deps.getFoodSearch();
      return {
        items: resolveScanItems(parsed, search),
        remainingToday: await deps.limiter.remaining(),
      };
    },
  };
}

export type ScanClient = ReturnType<typeof createScanClient>;
