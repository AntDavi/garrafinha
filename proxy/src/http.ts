export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message = code,
  ) {
    super(message);
  }
}

export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

/** Lê o corpo JSON com limite de tamanho (antes de decodificar). */
export async function readJson(request: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > maxBytes) throw new HttpError(413, 'payload_too_large');
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, 'payload_too_large');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'invalid_json');
  }
}
