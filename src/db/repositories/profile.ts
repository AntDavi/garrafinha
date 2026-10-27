import type { ActivityLevel, Goal, Sex } from '@/domain/types';
import { DEFAULT_WATER_GOAL_ML } from '@/domain/water';

import type { RepoDeps } from './deps';

export type Profile = {
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  goal: Goal;
  activity: ActivityLevel;
  waterGoalMl: number;
  createdAt: string;
  updatedAt: string;
};

export type ProfileInput = Omit<Profile, 'createdAt' | 'updatedAt' | 'waterGoalMl'> & {
  waterGoalMl?: number;
};

type Row = {
  sex: Sex;
  age: number;
  weight_kg: number;
  height_cm: number;
  goal: Goal;
  activity: ActivityLevel;
  water_goal_ml: number;
  created_at: string;
  updated_at: string;
};

const toProfile = (r: Row): Profile => ({
  sex: r.sex,
  age: r.age,
  weightKg: r.weight_kg,
  heightCm: r.height_cm,
  goal: r.goal,
  activity: r.activity,
  waterGoalMl: r.water_goal_ml,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export function createProfileRepository({ db, now }: Pick<RepoDeps, 'db' | 'now'>) {
  return {
    async get(): Promise<Profile | null> {
      const row = await db.first<Row>("SELECT * FROM profile WHERE id = 'me'");
      return row ? toProfile(row) : null;
    },
    async exists(): Promise<boolean> {
      return (await db.first("SELECT 1 AS x FROM profile WHERE id = 'me'")) !== null;
    },
    /** Cria ou atualiza o único perfil do aparelho. */
    async save(input: ProfileInput): Promise<Profile> {
      const ts = now();
      await db.run(
        `INSERT INTO profile (id, sex, age, weight_kg, height_cm, goal, activity, water_goal_ml, created_at, updated_at)
         VALUES ('me', ?, ?, ?, ?, ?, ?, COALESCE(?, ${DEFAULT_WATER_GOAL_ML}), ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           sex = excluded.sex, age = excluded.age, weight_kg = excluded.weight_kg,
           height_cm = excluded.height_cm, goal = excluded.goal, activity = excluded.activity,
           water_goal_ml = COALESCE(?, profile.water_goal_ml), updated_at = excluded.updated_at`,
        [
          input.sex,
          input.age,
          input.weightKg,
          input.heightCm,
          input.goal,
          input.activity,
          input.waterGoalMl ?? null,
          ts,
          ts,
          input.waterGoalMl ?? null,
        ],
      );
      const saved = await this.get();
      if (!saved) throw new Error('Falha ao salvar o perfil');
      return saved;
    },
    async setWaterGoal(ml: number): Promise<void> {
      await db.run("UPDATE profile SET water_goal_ml = ?, updated_at = ? WHERE id = 'me'", [
        ml,
        now(),
      ]);
    },
  };
}

export type ProfileRepository = ReturnType<typeof createProfileRepository>;
