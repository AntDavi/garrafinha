import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { foodsFileSchema, type Food } from '@/data/schemas';

/** Carrega o foods.json real (TACO) para testes. */
export function loadFoodsForTest(): Food[] {
  const path = resolve(__dirname, '../../../assets/data/foods.json');
  return foodsFileSchema.parse(JSON.parse(readFileSync(path, 'utf8'))).foods;
}
