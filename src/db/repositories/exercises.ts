import { parseJsonArray, type RepoDeps } from './deps';

export type TranslationStatus = 'translated' | 'pending';

/** Formato de cada exercício em assets/data/exercises.pt.json (gerado por scripts/build-exercises.ts). */
export type Exercise = {
  id: string;
  namePt: string;
  nameEn: string;
  category: string | null;
  level: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructionsPt: string[];
  instructionsEn: string[];
  images: string[];
  translationStatus: TranslationStatus;
};

type Row = {
  id: string;
  name_pt: string;
  name_en: string;
  category: string | null;
  level: string | null;
  equipment: string | null;
  primary_muscles: string;
  secondary_muscles: string;
  instructions_pt: string;
  instructions_en: string;
  images: string;
  translation_status: TranslationStatus;
};

const toExercise = (r: Row): Exercise => ({
  id: r.id,
  namePt: r.name_pt,
  nameEn: r.name_en,
  category: r.category,
  level: r.level,
  equipment: r.equipment,
  primaryMuscles: parseJsonArray(r.primary_muscles),
  secondaryMuscles: parseJsonArray(r.secondary_muscles),
  instructionsPt: parseJsonArray(r.instructions_pt),
  instructionsEn: parseJsonArray(r.instructions_en),
  images: parseJsonArray(r.images),
  translationStatus: r.translation_status,
});

export type ExerciseFilter = { muscle?: string; query?: string; limit?: number };

export function createExercisesRepository({ db }: Pick<RepoDeps, 'db'>) {
  return {
    async count(): Promise<number> {
      const row = await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM exercises');
      return row?.n ?? 0;
    },

    async getById(id: string): Promise<Exercise | null> {
      const row = await db.first<Row>('SELECT * FROM exercises WHERE id = ?', [id]);
      return row ? toExercise(row) : null;
    },

    /** Lista com filtro simples por músculo principal e trecho do nome (pt ou en). */
    async list({ muscle, query, limit = 200 }: ExerciseFilter = {}): Promise<Exercise[]> {
      const where: string[] = [];
      const params: (string | number)[] = [];
      if (muscle) {
        where.push('EXISTS (SELECT 1 FROM json_each(primary_muscles) WHERE value = ?)');
        params.push(muscle);
      }
      if (query) {
        where.push('(name_pt LIKE ? OR name_en LIKE ?)');
        params.push(`%${query}%`, `%${query}%`);
      }
      params.push(limit);
      const rows = await db.all<Row>(
        `SELECT * FROM exercises ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY translation_status = 'pending', name_pt LIMIT ?`,
        params,
      );
      return rows.map(toExercise);
    },

    async muscles(): Promise<string[]> {
      const rows = await db.all<{ value: string }>(
        'SELECT DISTINCT j.value AS value FROM exercises, json_each(exercises.primary_muscles) j ORDER BY j.value',
      );
      return rows.map((r) => r.value);
    },

    /** Substitui toda a base (somente leitura para o app; usado pelo seed). */
    async replaceAll(list: readonly Exercise[]): Promise<void> {
      await db.transaction(async (tx) => {
        await tx.run('DELETE FROM exercises');
        for (const e of list) {
          await tx.run(
            `INSERT INTO exercises (id, name_pt, name_en, category, level, equipment, primary_muscles, secondary_muscles,
               instructions_pt, instructions_en, images, translation_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              e.id,
              e.namePt,
              e.nameEn,
              e.category,
              e.level,
              e.equipment,
              JSON.stringify(e.primaryMuscles),
              JSON.stringify(e.secondaryMuscles),
              JSON.stringify(e.instructionsPt),
              JSON.stringify(e.instructionsEn),
              JSON.stringify(e.images),
              e.translationStatus,
            ],
          );
        }
      });
    },
  };
}

export type ExercisesRepository = ReturnType<typeof createExercisesRepository>;
