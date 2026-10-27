import { z } from 'zod';

import { scaleNutrients } from '@/domain/macros';
import type { Macros } from '@/domain/types';

import { ServiceError } from './errors';
import { fetchWithTimeout, type FetchLike } from './http';

const BASE_URL = 'https://world.openfoodfacts.org/api/v2/product';
const FIELDS = [
  'code',
  'product_name',
  'product_name_pt',
  'brands',
  'quantity',
  'serving_size',
  'serving_quantity',
  'nutriments',
].join(',');

const num = z.preprocess((v) => (typeof v === 'string' ? Number(v) : v), z.number().finite());
const optNum = num.optional().catch(undefined);

const responseSchema = z.object({
  status: z.number(),
  product: z
    .object({
      code: z.string().optional(),
      product_name: z.string().optional(),
      product_name_pt: z.string().optional(),
      brands: z.string().optional(),
      quantity: z.string().optional(),
      serving_size: z.string().optional(),
      serving_quantity: optNum,
      nutriments: z
        .object({
          'energy-kcal_100g': optNum,
          'energy-kj_100g': optNum,
          proteins_100g: optNum,
          carbohydrates_100g: optNum,
          fat_100g: optNum,
        })
        .partial()
        .optional(),
    })
    .optional(),
});

export type OffProduct = {
  barcode: string;
  name: string;
  brand: string | null;
  packageQuantity: string | null;
  /** Valores por 100 g/ml como informados no rótulo. null se o produto não tiver tabela completa. */
  per100g: Macros | null;
  serving: { label: string | null; grams: number; macros: Macros } | null;
  /** Campos ausentes na base (para a UI pedir confirmação ao usuário). */
  missing: string[];
  /** Exigido pela licença ODbL. */
  attribution: 'Dados de Open Food Facts (ODbL)';
};

export function isValidBarcode(code: string): boolean {
  return /^\d{8,14}$/.test(code);
}

const KJ_PER_KCAL = 4.184;

export function mapOffProduct(barcode: string, json: unknown): OffProduct {
  const parsed = responseSchema.safeParse(json);
  if (!parsed.success) {
    throw new ServiceError(
      'invalid_response',
      'Resposta inesperada da Open Food Facts',
      'Não foi possível ler os dados do produto.',
      { cause: parsed.error },
    );
  }
  const { status, product } = parsed.data;
  if (status !== 1 || !product) {
    throw new ServiceError(
      'not_found',
      `Produto ${barcode} não encontrado`,
      'Produto não encontrado. Você pode cadastrar os valores do rótulo manualmente.',
    );
  }

  const n = product.nutriments ?? {};
  const kcal =
    n['energy-kcal_100g'] ??
    (n['energy-kj_100g'] !== undefined ? n['energy-kj_100g'] / KJ_PER_KCAL : undefined);
  const values = {
    kcal,
    protein: n.proteins_100g,
    carbs: n.carbohydrates_100g,
    fat: n.fat_100g,
  };
  const missing = Object.entries(values)
    .filter(([, v]) => v === undefined || v < 0)
    .map(([k]) => k);

  const per100g: Macros | null =
    missing.length === 0
      ? {
          kcal: Math.round(values.kcal!),
          protein: values.protein!,
          carbs: values.carbs!,
          fat: values.fat!,
        }
      : null;

  const servingGrams = product.serving_quantity;
  const serving =
    per100g && servingGrams && servingGrams > 0
      ? {
          label: product.serving_size?.trim() || null,
          grams: servingGrams,
          macros: scaleNutrients(per100g, servingGrams),
        }
      : null;

  return {
    barcode,
    name: product.product_name_pt?.trim() || product.product_name?.trim() || 'Produto sem nome',
    brand: product.brands?.split(',')[0]?.trim() || null,
    packageQuantity: product.quantity?.trim() || null,
    per100g,
    serving,
    missing,
    attribution: 'Dados de Open Food Facts (ODbL)',
  };
}

export function createOpenFoodFactsClient(opts: {
  fetch: FetchLike;
  userAgent: string;
  timeoutMs?: number;
}) {
  return {
    async getProduct(barcode: string): Promise<OffProduct> {
      const code = barcode.trim();
      if (!isValidBarcode(code)) {
        throw new ServiceError(
          'invalid_input',
          `Código inválido: ${barcode}`,
          'Código de barras inválido.',
        );
      }
      const res = await fetchWithTimeout(opts.fetch, `${BASE_URL}/${code}?fields=${FIELDS}`, {
        timeoutMs: opts.timeoutMs ?? 10_000,
        headers: { 'User-Agent': opts.userAgent, Accept: 'application/json' },
      });
      // A v2 responde 404 com {status: 0} para produto inexistente.
      if (!res.ok && res.status !== 404) {
        throw new ServiceError(
          'service_unavailable',
          `Open Food Facts respondeu ${res.status}`,
          'O serviço de produtos está indisponível. Tente mais tarde.',
        );
      }
      let json: unknown;
      try {
        json = await res.json();
      } catch (e) {
        throw new ServiceError(
          'invalid_response',
          'JSON inválido da Open Food Facts',
          'Não foi possível ler os dados do produto.',
          { cause: e },
        );
      }
      return mapOffProduct(code, json);
    },
  };
}
