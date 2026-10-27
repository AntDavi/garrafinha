import { describe, expect, it, vi } from 'vitest';

import { ServiceError } from './errors';
import { createOpenFoodFactsClient, isValidBarcode, mapOffProduct } from './openFoodFacts';

const found = {
  code: '7891000100103',
  status: 1,
  product: {
    product_name: 'Leite condensado',
    brands: 'Nestlé, Moça',
    quantity: '395 g',
    serving_size: '20 g',
    serving_quantity: 20,
    nutriments: {
      'energy-kcal_100g': 325,
      proteins_100g: 7,
      carbohydrates_100g: 55,
      fat_100g: 8,
    },
  },
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('mapOffProduct', () => {
  it('mapeia valores por 100 g e por porção', () => {
    const p = mapOffProduct('7891000100103', found);
    expect(p).toMatchObject({
      name: 'Leite condensado',
      brand: 'Nestlé',
      per100g: { kcal: 325, protein: 7, carbs: 55, fat: 8 },
      serving: {
        label: '20 g',
        grams: 20,
        macros: { kcal: 65, protein: 1.4, carbs: 11, fat: 1.6 },
      },
      missing: [],
    });
  });

  it('converte kJ quando falta kcal e marca campos ausentes sem inventar', () => {
    const p = mapOffProduct('123456789', {
      status: 1,
      product: { product_name: 'X', nutriments: { 'energy-kj_100g': 418.4, proteins_100g: 1 } },
    });
    expect(p.per100g).toBeNull();
    expect(p.serving).toBeNull();
    expect(p.missing).toEqual(['carbs', 'fat']);
  });

  it('lança not_found para status 0', () => {
    expect(() =>
      mapOffProduct('00000000', { status: 0, status_verbose: 'product not found' }),
    ).toThrow(expect.objectContaining({ code: 'not_found' }));
  });
});

describe('createOpenFoodFactsClient', () => {
  it('envia User-Agent e usa o endpoint v2', async () => {
    const fetch = vi.fn(async () => jsonResponse(found));
    const client = createOpenFoodFactsClient({ fetch, userAgent: 'Garrafinha/1.0' });
    await client.getProduct('7891000100103');
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(
      /^https:\/\/world\.openfoodfacts\.org\/api\/v2\/product\/7891000100103\?fields=/,
    );
    expect((init.headers as Record<string, string>)['User-Agent']).toBe('Garrafinha/1.0');
  });

  it('trata 404 como produto não encontrado', async () => {
    const client = createOpenFoodFactsClient({
      fetch: async () => jsonResponse({ status: 0 }, 404),
      userAgent: 'x',
    });
    await expect(client.getProduct('7890000000000')).rejects.toMatchObject({ code: 'not_found' });
  });

  it('valida o código antes de chamar a rede', async () => {
    const fetch = vi.fn();
    const client = createOpenFoodFactsClient({ fetch, userAgent: 'x' });
    await expect(client.getProduct('abc')).rejects.toMatchObject({ code: 'invalid_input' });
    expect(fetch).not.toHaveBeenCalled();
    expect(isValidBarcode('12345678')).toBe(true);
  });

  it('converte timeout e falha de rede em erros tipados', async () => {
    const hang = createOpenFoodFactsClient({
      fetch: (_u, init) =>
        new Promise((_, reject) =>
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
        ),
      userAgent: 'x',
      timeoutMs: 5,
    });
    await expect(hang.getProduct('7891000100103')).rejects.toMatchObject({ code: 'timeout' });

    const offline = createOpenFoodFactsClient({
      fetch: async () => {
        throw new TypeError('Network request failed');
      },
      userAgent: 'x',
    });
    const err = await offline.getProduct('7891000100103').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ServiceError);
    expect(err).toMatchObject({ code: 'network' });
  });

  it('trata erro 5xx como indisponibilidade', async () => {
    const client = createOpenFoodFactsClient({
      fetch: async () => new Response('', { status: 503 }),
      userAgent: 'x',
    });
    await expect(client.getProduct('7891000100103')).rejects.toMatchObject({
      code: 'service_unavailable',
    });
  });
});
