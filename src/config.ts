/** URL do proxy de IA (Cloudflare Worker). Definida em .env como EXPO_PUBLIC_PROXY_URL. */
export const PROXY_URL: string | null =
  process.env.EXPO_PUBLIC_PROXY_URL?.replace(/\/+$/, '') || null;

export const APP_NAME = 'Garrafinha';
export const APP_VERSION = '1.0.0';

/** Contato público do app (e-mail ou site), usado no User-Agent da Open Food Facts. */
const CONTACT = process.env.EXPO_PUBLIC_CONTACT?.trim() || null;

/** Identificação pedida pela Open Food Facts: "NomeApp/Versão (contato)". */
export const OFF_USER_AGENT = `${APP_NAME}/${APP_VERSION}${CONTACT ? ` (${CONTACT})` : ''}`;

export const DEFAULT_SCAN_DAILY_LIMIT = 5;
