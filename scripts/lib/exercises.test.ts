import { describe, expect, it } from 'vitest';

import glossaryJson from '../exercises-glossary.pt.json';
import { glossarySchema, transformExercises, type RawExercise } from './exercises';

const glossary = glossarySchema.parse(glossaryJson);

const raw = (id: string, over: Partial<RawExercise> = {}): RawExercise => ({
  id,
  name: id.replace(/_/g, ' '),
  level: 'beginner',
  equipment: 'barbell',
  primaryMuscles: ['chest'],
  secondaryMuscles: ['triceps'],
  instructions: ['Do it.'],
  category: 'strength',
  images: [`${id}/0.jpg`],
  ...over,
});

const allPrototype = Object.keys(glossary.exercises).map((id) => raw(id));

describe('transformExercises', () => {
  it('traduz os 15 exercícios do protótipo e marca o resto como pendente', () => {
    const out = transformExercises([...allPrototype, raw('Some_Other')], glossary);
    expect(out.filter((e) => e.translationStatus === 'translated')).toHaveLength(15);
    const other = out.find((e) => e.id === 'Some_Other');
    expect(other).toMatchObject({
      namePt: 'Some Other',
      instructionsPt: [],
      translationStatus: 'pending',
      primaryMuscles: ['Peitoral'],
      secondaryMuscles: ['Tríceps'],
      equipment: 'Barra',
      category: 'Força',
      level: 'Iniciante',
    });
  });

  it('usa os nomes em português do protótipo', () => {
    const names = transformExercises(allPrototype, glossary)
      .map((e) => e.namePt)
      .sort();
    expect(names).toEqual(
      [
        'Abdominal infra',
        'Agachamento livre',
        'Crucifixo',
        'Desenvolvimento',
        'Elevação lateral',
        'Esteira',
        'Leg press',
        'Prancha',
        'Puxada frontal',
        'Remada curvada',
        'Rosca direta',
        'Stiff',
        'Supino inclinado',
        'Supino reto',
        'Tríceps corda',
      ].sort(),
    );
  });

  it('falha em termo sem tradução em vez de inventar', () => {
    expect(() =>
      transformExercises([...allPrototype, raw('X', { equipment: 'hoverboard' })], glossary),
    ).toThrow(/hoverboard/);
  });

  it('falha se o glossário referencia ID ausente do dataset', () => {
    expect(() => transformExercises([raw('Only_One')], glossary)).toThrow(/IDs inexistentes/);
  });
});
