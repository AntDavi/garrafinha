import { ServiceError } from './errors';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** fetch com timeout, convertendo falhas de rede/timeout em ServiceError. */
export async function fetchWithTimeout(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit & { timeoutMs: number },
): Promise<Response> {
  const { timeoutMs, signal, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  signal?.addEventListener('abort', () => controller.abort());
  try {
    return await fetchImpl(url, { ...rest, signal: controller.signal });
  } catch (e) {
    if (controller.signal.aborted) {
      throw new ServiceError(
        'timeout',
        `Timeout após ${timeoutMs} ms: ${url}`,
        'A conexão demorou demais. Tente de novo.',
        { cause: e },
      );
    }
    throw new ServiceError('network', `Falha de rede: ${url}`, 'Sem conexão com a internet.', {
      cause: e,
    });
  } finally {
    clearTimeout(timer);
  }
}
