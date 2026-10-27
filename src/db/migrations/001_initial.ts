import type { Migration } from './types';

export const migration001: Migration = {
  version: 1,
  name: 'initial',
  sql: `
CREATE TABLE profile (
  id TEXT PRIMARY KEY NOT NULL CHECK (id = 'me'),
  sex TEXT NOT NULL CHECK (sex IN ('male','female','unspecified')),
  age INTEGER NOT NULL CHECK (age BETWEEN 10 AND 120),
  weight_kg REAL NOT NULL CHECK (weight_kg > 0),
  height_cm REAL NOT NULL CHECK (height_cm > 0),
  goal TEXT NOT NULL CHECK (goal IN ('lose','gain','maintain')),
  activity TEXT NOT NULL CHECK (activity IN ('sedentary','light','moderate','intense')),
  water_goal_ml INTEGER NOT NULL DEFAULT 2400 CHECK (water_goal_ml > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE weight_entries (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL,
  weight_kg REAL NOT NULL CHECK (weight_kg > 0),
  created_at TEXT NOT NULL
);
CREATE INDEX idx_weight_entries_date ON weight_entries(date);

CREATE TABLE meals (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','snack','dinner')),
  time TEXT,
  source TEXT NOT NULL CHECK (source IN ('text','photo','barcode','label','manual')),
  created_at TEXT NOT NULL
);
CREATE INDEX idx_meals_date ON meals(date);

CREATE TABLE meal_items (
  id TEXT PRIMARY KEY NOT NULL,
  meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  grams REAL CHECK (grams IS NULL OR grams >= 0),
  quantity_label TEXT,
  kcal REAL NOT NULL CHECK (kcal >= 0),
  protein_g REAL NOT NULL CHECK (protein_g >= 0),
  carbs_g REAL NOT NULL CHECK (carbs_g >= 0),
  fat_g REAL NOT NULL CHECK (fat_g >= 0),
  food_ref TEXT
);
CREATE INDEX idx_meal_items_meal ON meal_items(meal_id);

CREATE TABLE water_logs (
  date TEXT PRIMARY KEY NOT NULL,
  cups INTEGER NOT NULL CHECK (cups >= 0),
  updated_at TEXT NOT NULL
);

CREATE TABLE exercises (
  id TEXT PRIMARY KEY NOT NULL,
  name_pt TEXT NOT NULL,
  name_en TEXT NOT NULL,
  category TEXT,
  level TEXT,
  equipment TEXT,
  primary_muscles TEXT NOT NULL DEFAULT '[]',
  secondary_muscles TEXT NOT NULL DEFAULT '[]',
  instructions_pt TEXT NOT NULL DEFAULT '[]',
  instructions_en TEXT NOT NULL DEFAULT '[]',
  images TEXT NOT NULL DEFAULT '[]',
  translation_status TEXT NOT NULL CHECK (translation_status IN ('translated','pending'))
);
CREATE INDEX idx_exercises_name_pt ON exercises(name_pt);

CREATE TABLE workouts (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  focus TEXT,
  icon TEXT,
  created_on TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- exercise_id não tem FK: a tabela exercises é recarregada pelo seed.
CREATE TABLE workout_exercises (
  id TEXT PRIMARY KEY NOT NULL,
  workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  sets INTEGER NOT NULL CHECK (sets > 0),
  reps TEXT NOT NULL
);
CREATE INDEX idx_workout_exercises_workout ON workout_exercises(workout_id, position);

CREATE TABLE workout_days (
  workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  PRIMARY KEY (workout_id, weekday)
);
CREATE INDEX idx_workout_days_weekday ON workout_days(weekday);

-- Histórico preservado mesmo se o treino for apagado (title é um snapshot).
CREATE TABLE workout_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  workout_id TEXT REFERENCES workouts(id) ON DELETE SET NULL,
  workout_title TEXT NOT NULL,
  date TEXT NOT NULL,
  duration_min INTEGER NOT NULL CHECK (duration_min >= 0),
  created_at TEXT NOT NULL
);
CREATE INDEX idx_workout_sessions_date ON workout_sessions(date);
`,
};
