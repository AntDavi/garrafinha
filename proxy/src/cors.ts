const ALLOW_HEADERS = 'Content-Type';

export function parseOrigins(value: string): Set<string> {
  return new Set(
    value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/**
 * CORS restrito: requisições sem Origin (app nativo) passam; navegadores só de origens permitidas.
 * Retorna null se a origem for proibida.
 */
export function corsHeaders(request: Request, allowed: Set<string>): Record<string, string> | null {
  const origin = request.headers.get('Origin');
  if (!origin) return {};
  if (!allowed.has(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': ALLOW_HEADERS,
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
