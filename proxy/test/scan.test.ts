import { describe, expect, it } from 'vitest';

import { handle } from '../src/index';
import { decodedSize, matchesMime } from '../src/scan';
import { fakeDeps, geminiReply, INSTALL_ID, JPEG_BASE64, makeEnv, post } from './helpers';

const ok = { itens: [{ nome: 'arroz branco cozido', gramas: 150, confianca: 0.9 }] };
const body = { image: JPEG_BASE64, mime: 'image/jpeg', installId: INSTALL_ID };

describe('POST /scan', () => {
  it('chama o Gemini com saída JSON e devolve os itens', async () => {
    const deps = fakeDeps([() => geminiReply(ok)]);
    const res = await handle(post('/scan', body), makeEnv(), deps);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(ok);

    const sent = JSON.parse(deps.calls[0]!.body as string);
    expect((deps.calls[0]!.headers as Record<string, string>)['x-goog-api-key']).toBe('test-key');
    expect(sent.generationConfig.responseMimeType).toBe('application/json');
    expect(sent.contents[0].parts[0].inlineData).toEqual({
      mimeType: 'image/jpeg',
      data: JPEG_BASE64,
    });
    // Nada além da imagem e do prompt fixo é enviado (nem o installId).
    expect(JSON.stringify(sent)).not.toContain(INSTALL_ID);
  });

  it('valida tipo, tamanho e formato da imagem', async () => {
    const env = makeEnv();
    const png = await handle(post('/scan', { ...body, mime: 'image/png' }), env, fakeDeps([]));
    expect(png.status).toBe(415);

    const gif = await handle(post('/scan', { ...body, mime: 'image/gif' }), env, fakeDeps([]));
    expect(gif.status).toBe(400);

    const badId = await handle(post('/scan', { ...body, installId: 'abc' }), env, fakeDeps([]));
    expect(badId.status).toBe(400);

    const huge = 'A'.repeat(2_100_000);
    const big = await handle(post('/scan', { ...body, image: huge }), env, fakeDeps([]));
    expect(big.status).toBe(413);
  });

  it('aplica limite diário por instalação', async () => {
    const env = makeEnv();
    const deps = fakeDeps([() => geminiReply(ok), () => geminiReply(ok)]);
    expect((await handle(post('/scan', body), env, deps)).status).toBe(200);
    expect((await handle(post('/scan', body), env, deps)).status).toBe(200);
    const third = await handle(post('/scan', body), env, deps);
    expect(third.status).toBe(429);
    expect(await third.json()).toEqual({ error: 'daily_limit_install' });
  });

  it('aplica limite por IP e o rate limiting de rajada', async () => {
    const env = makeEnv({ SCAN_DAILY_LIMIT_PER_IP: '1', SCAN_DAILY_LIMIT_PER_INSTALL: '10' });
    const deps = fakeDeps([() => geminiReply(ok)]);
    await handle(post('/scan', body), env, deps);
    const other = { ...body, installId: '0e0e0e0e-1111-4222-8333-444455556666' };
    expect((await handle(post('/scan', other), env, deps)).status).toBe(429);

    const burst = makeEnv({ BURST_LIMITER: { limit: async () => ({ success: false }) } });
    expect((await handle(post('/scan', body), burst, fakeDeps([]))).status).toBe(429);
  });

  it('faz retry exponencial curto em 429 do Gemini', async () => {
    const deps = fakeDeps([
      () => new Response('', { status: 429 }),
      () => new Response('', { status: 503 }),
      () => geminiReply(ok),
    ]);
    const res = await handle(post('/scan', body), makeEnv(), deps);
    expect(res.status).toBe(200);
    expect(deps.sleeps).toEqual([250, 500]);
  });

  it('desiste após as tentativas e responde 503', async () => {
    const deps = fakeDeps([0, 1, 2].map(() => () => new Response('', { status: 429 })));
    const res = await handle(post('/scan', body), makeEnv(), deps);
    expect(res.status).toBe(503);
    expect(deps.calls).toHaveLength(3);
  });

  it('rejeita resposta do Gemini fora do schema', async () => {
    const deps = fakeDeps([
      () => geminiReply({ itens: [{ nome: 'x', gramas: -2, confianca: 5 }] }),
    ]);
    expect((await handle(post('/scan', body), makeEnv(), deps)).status).toBe(502);
  });

  it('responde erro tratado sem chave configurada', async () => {
    const res = await handle(
      post('/scan', body),
      makeEnv({ GEMINI_API_KEY: undefined }),
      fakeDeps([]),
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'not_configured' });
  });

  it('utilitários de imagem', () => {
    expect(decodedSize('AAAA')).toBe(3);
    expect(decodedSize('AA==')).toBe(1);
    expect(matchesMime(JPEG_BASE64, 'image/jpeg')).toBe(true);
    expect(matchesMime(JPEG_BASE64, 'image/webp')).toBe(false);
  });
});

describe('CORS e roteamento', () => {
  it('permite app nativo (sem Origin) e origens da lista', async () => {
    const env = makeEnv();
    const pre = await handle(
      new Request('https://proxy.test/scan', {
        method: 'OPTIONS',
        headers: { Origin: 'https://garrafinha.app' },
      }),
      env,
    );
    expect(pre.status).toBe(204);
    expect(pre.headers.get('Access-Control-Allow-Origin')).toBe('https://garrafinha.app');
  });

  it('bloqueia origens desconhecidas', async () => {
    const res = await handle(
      post('/scan', body, { Origin: 'https://evil.example' }),
      makeEnv(),
      fakeDeps([]),
    );
    expect(res.status).toBe(403);
  });

  it('404 e 405', async () => {
    expect((await handle(post('/nada', {}), makeEnv())).status).toBe(404);
    expect((await handle(new Request('https://proxy.test/scan'), makeEnv())).status).toBe(405);
    expect((await handle(new Request('https://proxy.test/health'), makeEnv())).status).toBe(200);
  });
});
