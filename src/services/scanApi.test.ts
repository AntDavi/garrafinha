import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { createFoodSearch } from './foodSearch';
import { loadFoodsForTest } from './foodSearch/testing';
import type { FetchLike } from './http';
import { createScanClient, type ScanClientDeps } from './scanApi';
import { createScanLimiter } from './scanLimit';
import { createMemoryStore } from './storage';

const search = createFoodSearch(loadFoodsForTest());
const image = { base64: 'aGVsbG8=', mime: 'image/jpeg' as const };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

let deps: ScanClientDeps;
let fetch: Mock<FetchLike>;

beforeEach(() => {
  fetch = vi.fn<FetchLike>(async () =>
    json({
      itens: [
        { nome: 'arroz branco', gramas: 150.4, confianca: 0.9 },
        { nome: 'feijão', gramas: 100, confianca: 0.4 },
        { nome: 'objeto estranho', gramas: 50, confianca: 0.8 },
      ],
    }),
  );
  deps = {
    proxyUrl: 'https://proxy.test',
    fetch,
    limiter: createScanLimiter({
      store: createMemoryStore(),
      defaultLimit: 2,
      today: () => '2026-10-27',
    }),
    getInstallId: async () => 'install-1',
    getFoodSearch: async () => search,
  };
});

describe('scanApi', () => {
  it('envia só imagem e id anônimo e calcula macros pela TACO', async () => {
    const result = await createScanClient(deps).scan(image);

    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('https://proxy.test/scan');
    expect(JSON.parse(init!.body as string)).toEqual({
      image: 'aGVsbG8=',
      mime: 'image/jpeg',
      installId: 'install-1',
    });

    const [arroz, feijao, estranho] = result.items;
    expect(arroz?.food?.name).toMatch(/^Arroz/);
    expect(arroz?.grams).toBe(150);
    expect(arroz?.macros?.kcal).toBe(Math.round((arroz!.food!.per100g.kcal * 150) / 100));
    expect(arroz?.needsConfirmation).toBe(false);
    expect(feijao?.needsConfirmation).toBe(true); // confiança baixa
    expect(estranho).toMatchObject({ food: null, macros: null, needsConfirmation: true });
    expect(result.remainingToday).toBe(1);
  });

  it('bloqueia localmente ao atingir o limite diário', async () => {
    const client = createScanClient(deps);
    await client.scan(image);
    await client.scan(image);
    await expect(client.scan(image)).rejects.toMatchObject({ code: 'limit_exceeded' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('limite é configurável e reinicia no dia seguinte', async () => {
    let day = '2026-10-27';
    const store = createMemoryStore();
    const limiter = createScanLimiter({ store, defaultLimit: 5, today: () => day });
    await limiter.setLimit(1);
    await limiter.consume();
    expect(await limiter.remaining()).toBe(0);
    day = '2026-10-28';
    expect(await limiter.remaining()).toBe(1);
  });

  it('não consome cota quando a chamada falha', async () => {
    fetch.mockImplementationOnce(async () => {
      throw new TypeError('Network request failed');
    });
    await expect(createScanClient(deps).scan(image)).rejects.toMatchObject({ code: 'network' });
    expect(await deps.limiter.remaining()).toBe(2);
  });

  it('mapeia 429 do proxy para limite excedido', async () => {
    fetch.mockImplementationOnce(async () => json({ error: 'rate_limited' }, 429));
    await expect(createScanClient(deps).scan(image)).rejects.toMatchObject({
      code: 'limit_exceeded',
    });
  });

  it('rejeita resposta fora do contrato', async () => {
    fetch.mockImplementationOnce(async () =>
      json({ itens: [{ nome: 'x', gramas: -1, confianca: 2 }] }),
    );
    await expect(createScanClient(deps).scan(image)).rejects.toMatchObject({
      code: 'invalid_response',
    });
  });

  it('exige proxy configurado', async () => {
    await expect(createScanClient({ ...deps, proxyUrl: null }).scan(image)).rejects.toMatchObject({
      code: 'not_configured',
    });
  });
});
