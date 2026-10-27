import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStore } from './storage';

/** Store persistente do app (preferências leves). Dados de saúde ficam no SQLite. */
export const appStorage: KeyValueStore = AsyncStorage;
