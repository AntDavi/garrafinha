import type { Food } from '@/data/schemas';

import { parseJsonArray, type RepoDeps } from './deps';

type Row = {
  id: string;
  name: string;
  category: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  portions: string;
};

const toFood = (r: Row): Food => ({
  id: r.id,
  name: r.name,
  category: r.category,
  per100g: { kcal: r.kcal, protein: r.protein_g, carbs: r.carbs_g, fat: r.fat_g },
  portions: parseJsonArray(r.portions),
});

export function createFoodsRepository({ db }: Pick<RepoDeps, 'db'>) {
  return {
    async count(): Promise<number> {
      return (await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM foods'))?.n ?? 0;
    },
    async all(): Promise<Food[]> {
      return (await db.all<Row>('SELECT * FROM foods ORDER BY name')).map(toFood);
    },
    async getById(id: string): Promise<Food | null> {
      const row = await db.first<Row>('SELECT * FROM foods WHERE id = ?', [id]);
      return row ? toFood(row) : null;
    },
    /** Substitui toda a tabela (usado apenas pelo seed). */
    async replaceAll(list: readonly Food[]): Promise<void> {
      await db.transaction(async (tx) => {
        await tx.run('DELETE FROM foods');
        for (const f of list) {
          await tx.run(
            'INSERT INTO foods (id, name, category, kcal, protein_g, carbs_g, fat_g, portions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
              f.id,
              f.name,
              f.category,
              f.per100g.kcal,
              f.per100g.protein,
              f.per100g.carbs,
              f.per100g.fat,
              JSON.stringify(f.portions),
            ],
          );
        }
      });
    },
  };
}

export type FoodsRepository = ReturnType<typeof createFoodsRepository>;
