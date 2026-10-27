import type { SqlDb } from '../types';
import { createAppMetaRepository } from './appMeta';
import { defaultNow, type RepoDeps } from './deps';
import { createExercisesRepository } from './exercises';
import { createFoodsRepository } from './foods';
import { createMealsRepository } from './meals';
import { createProfileRepository } from './profile';
import { createSessionsRepository } from './sessions';
import { createWaterRepository } from './water';
import { createWeightRepository } from './weight';
import { createWorkoutsRepository } from './workouts';

export function createRepositories(db: SqlDb, opts: { newId: () => string; now?: () => string }) {
  const deps: RepoDeps = { db, newId: opts.newId, now: opts.now ?? defaultNow };
  return {
    appMeta: createAppMetaRepository(deps),
    profile: createProfileRepository(deps),
    weight: createWeightRepository(deps),
    meals: createMealsRepository(deps),
    water: createWaterRepository(deps),
    exercises: createExercisesRepository(deps),
    foods: createFoodsRepository(deps),
    workouts: createWorkoutsRepository(deps),
    sessions: createSessionsRepository(deps),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;

export type { AppMetaKey } from './appMeta';
export type { Exercise, ExerciseFilter, TranslationStatus } from './exercises';
export type { Meal, MealInput, MealItem, MealItemInput } from './meals';
export type { Profile, ProfileInput } from './profile';
export type { WorkoutSession } from './sessions';
export type { WaterLog } from './water';
export type { WeightEntry } from './weight';
export type { Workout, WorkoutExercise, WorkoutInput } from './workouts';
