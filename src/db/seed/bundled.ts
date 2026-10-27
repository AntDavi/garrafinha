import type { SeedFiles } from './loader';

/** Dados embarcados no bundle (gerados pelos scripts em /scripts). */
export function loadBundledSeed(): SeedFiles {
  return {
    exercises: require('../../../assets/data/exercises.pt.json'),
    foods: require('../../../assets/data/foods.json'),
  };
}
