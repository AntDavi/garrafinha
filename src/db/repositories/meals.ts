import type { DateRange } from '@/domain/dates';
import { sumMacros } from '@/domain/macros';
import type { ISODate, Macros, MealSource, MealType } from '@/domain/types';

import type { SqlDb } from '../types';
import { placeholders, type RepoDeps } from './deps';

export type MealItem = {
  id: string;
  mealId: string;
  position: number;
  name: string;
  grams: number | null;
  /** Quantidade como o usuário descreveu (ex.: "2 unidades"), opcional. */
  quantityLabel: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Origem nutricional, ex.: "taco:123" ou "off:7891000100103". */
  foodRef: string | null;
};

export type Meal = {
  id: string;
  date: ISODate;
  mealType: MealType;
  time: string | null;
  source: MealSource;
  createdAt: string;
  items: MealItem[];
};

export type MealItemInput = Omit<MealItem, 'id' | 'mealId' | 'position'>;

export type MealInput = {
  date: ISODate;
  mealType: MealType;
  time?: string | null;
  source: MealSource;
  items: MealItemInput[];
};

type MealRow = {
  id: string;
  date: string;
  meal_type: MealType;
  time: string | null;
  source: MealSource;
  created_at: string;
};

type ItemRow = {
  id: string;
  meal_id: string;
  position: number;
  name: string;
  grams: number | null;
  quantity_label: string | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  food_ref: string | null;
};

const toItem = (r: ItemRow): MealItem => ({
  id: r.id,
  mealId: r.meal_id,
  position: r.position,
  name: r.name,
  grams: r.grams,
  quantityLabel: r.quantity_label,
  kcal: r.kcal,
  protein: r.protein_g,
  carbs: r.carbs_g,
  fat: r.fat_g,
  foodRef: r.food_ref,
});

async function insertItem(
  db: SqlDb,
  id: string,
  mealId: string,
  position: number,
  it: MealItemInput,
) {
  await db.run(
    `INSERT INTO meal_items (id, meal_id, position, name, grams, quantity_label, kcal, protein_g, carbs_g, fat_g, food_ref)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      mealId,
      position,
      it.name,
      it.grams,
      it.quantityLabel,
      it.kcal,
      it.protein,
      it.carbs,
      it.fat,
      it.foodRef,
    ],
  );
}

export function createMealsRepository({ db, newId, now }: RepoDeps) {
  async function loadMeals(rows: MealRow[]): Promise<Meal[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const items = await db.all<ItemRow>(
      `SELECT * FROM meal_items WHERE meal_id IN (${placeholders(ids.length)}) ORDER BY position`,
      ids,
    );
    const byMeal = new Map<string, MealItem[]>();
    for (const it of items) {
      const list = byMeal.get(it.meal_id) ?? [];
      list.push(toItem(it));
      byMeal.set(it.meal_id, list);
    }
    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      mealType: r.meal_type,
      time: r.time,
      source: r.source,
      createdAt: r.created_at,
      items: byMeal.get(r.id) ?? [],
    }));
  }

  return {
    async create(input: MealInput): Promise<Meal> {
      const mealId = newId();
      await db.transaction(async (tx) => {
        await tx.run(
          'INSERT INTO meals (id, date, meal_type, time, source, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [mealId, input.date, input.mealType, input.time ?? null, input.source, now()],
        );
        for (const [i, it] of input.items.entries()) {
          await insertItem(tx, newId(), mealId, i, it);
        }
      });
      const meal = await this.getById(mealId);
      if (!meal) throw new Error('Falha ao salvar a refeição');
      return meal;
    },

    async getById(id: string): Promise<Meal | null> {
      const row = await db.first<MealRow>('SELECT * FROM meals WHERE id = ?', [id]);
      if (!row) return null;
      const [meal] = await loadMeals([row]);
      return meal ?? null;
    },

    async listByDate(date: ISODate): Promise<Meal[]> {
      const rows = await db.all<MealRow>(
        `SELECT * FROM meals WHERE date = ?
         ORDER BY CASE meal_type WHEN 'breakfast' THEN 0 WHEN 'lunch' THEN 1 WHEN 'snack' THEN 2 ELSE 3 END, time, created_at`,
        [date],
      );
      return loadMeals(rows);
    },

    async addItem(mealId: string, item: MealItemInput): Promise<MealItem> {
      const id = newId();
      await db.transaction(async (tx) => {
        const row = await tx.first<{ next: number }>(
          'SELECT COALESCE(MAX(position) + 1, 0) AS next FROM meal_items WHERE meal_id = ?',
          [mealId],
        );
        await insertItem(tx, id, mealId, row?.next ?? 0, item);
      });
      const created = await db.first<ItemRow>('SELECT * FROM meal_items WHERE id = ?', [id]);
      if (!created) throw new Error('Falha ao salvar o item');
      return toItem(created);
    },

    async updateItem(id: string, item: MealItemInput): Promise<void> {
      await db.run(
        `UPDATE meal_items SET name = ?, grams = ?, quantity_label = ?, kcal = ?, protein_g = ?, carbs_g = ?, fat_g = ?, food_ref = ?
         WHERE id = ?`,
        [
          item.name,
          item.grams,
          item.quantityLabel,
          item.kcal,
          item.protein,
          item.carbs,
          item.fat,
          item.foodRef,
          id,
        ],
      );
    },

    async removeItem(id: string): Promise<void> {
      await db.run('DELETE FROM meal_items WHERE id = ?', [id]);
    },

    /** Apaga a refeição e seus itens (cascade). */
    async remove(id: string): Promise<void> {
      await db.run('DELETE FROM meals WHERE id = ?', [id]);
    },

    async dayTotals(date: ISODate): Promise<Macros> {
      const items = await db.all<{ kcal: number; protein: number; carbs: number; fat: number }>(
        `SELECT i.kcal, i.protein_g AS protein, i.carbs_g AS carbs, i.fat_g AS fat
         FROM meal_items i JOIN meals m ON m.id = i.meal_id WHERE m.date = ?`,
        [date],
      );
      return sumMacros(items);
    },

    /** Itens com a data da refeição, para agregações do relatório. */
    async listItemsInRange(range: DateRange): Promise<({ date: ISODate } & Macros)[]> {
      return db.all(
        `SELECT m.date AS date, i.kcal AS kcal, i.protein_g AS protein, i.carbs_g AS carbs, i.fat_g AS fat
         FROM meal_items i JOIN meals m ON m.id = i.meal_id
         WHERE m.date BETWEEN ? AND ? ORDER BY m.date`,
        [range.start, range.end],
      );
    },
  };
}

export type MealsRepository = ReturnType<typeof createMealsRepository>;
