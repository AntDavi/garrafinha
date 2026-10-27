export interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL: string;
  ALLOWED_ORIGINS: string;
  SCAN_DAILY_LIMIT_PER_INSTALL: string;
  SCAN_DAILY_LIMIT_PER_IP: string;
  INSIGHTS_DAILY_LIMIT_PER_INSTALL: string;
  RATE_KV: KVNamespace;
  BURST_LIMITER?: { limit(opts: { key: string }): Promise<{ success: boolean }> };
}

export const intVar = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
};
