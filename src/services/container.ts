import { randomUUID } from 'expo-crypto';

import { DEFAULT_SCAN_DAILY_LIMIT, OFF_USER_AGENT, PROXY_URL } from '@/config';
import { getDatabase } from '@/db/client';

import { appStorage } from './appStorage';
import { createFoodSearch, type FoodSearch } from './foodSearch';
import { createOpenFoodFactsClient } from './openFoodFacts';
import { createProxyInsightProvider } from './report';
import { createScanClient } from './scanApi';
import { createScanLimiter } from './scanLimit';
import { getInstallId } from './storage';

/** Liga os serviços às implementações nativas (banco, AsyncStorage, fetch). */
let foodSearch: Promise<FoodSearch> | null = null;

export function getFoodSearch(): Promise<FoodSearch> {
  foodSearch ??= getDatabase()
    .then(({ repos }) => repos.foods.all())
    .then(createFoodSearch)
    .catch((e: unknown) => {
      foodSearch = null;
      throw e;
    });
  return foodSearch;
}

const installId = () => getInstallId(appStorage, randomUUID);

export const scanLimiter = createScanLimiter({
  store: appStorage,
  defaultLimit: DEFAULT_SCAN_DAILY_LIMIT,
});

export const scanClient = createScanClient({
  proxyUrl: PROXY_URL,
  fetch: (url, init) => fetch(url, init),
  limiter: scanLimiter,
  getInstallId: installId,
  getFoodSearch,
});

export const openFoodFacts = createOpenFoodFactsClient({
  fetch: (url, init) => fetch(url, init),
  userAgent: OFF_USER_AGENT,
});

/** Provedor de insights por IA, se o proxy estiver configurado (senão, só regras locais). */
export const insightProvider = PROXY_URL
  ? createProxyInsightProvider({
      proxyUrl: PROXY_URL,
      fetch: (url, init) => fetch(url, init),
      getInstallId: installId,
    })
  : null;
