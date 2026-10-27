import { describe, expect, it } from 'vitest';

import { createFoodSearch } from './foodSearch';
import { loadFoodsForTest } from './testing';
import { parseEntry, parseFoodText, resolveFoodText, splitFoodText } from './textParser';

const search = createFoodSearch(loadFoodsForTest());

describe('splitFoodText', () => {
  it('separa por vírgula, "e", "com", "+" e quebra de linha', () => {
    expect(splitFoodText('arroz, feijão e frango')).toEqual(['arroz', 'feijão', 'frango']);
    expect(splitFoodText('pão com manteiga + café\nbanana')).toEqual([
      'pão',
      'manteiga',
      'café',
      'banana',
    ]);
  });

  it('não quebra número decimal com vírgula', () => {
    expect(splitFoodText('1,5 xícara de feijão, arroz')).toEqual(['1,5 xícara de feijão', 'arroz']);
  });
});

describe('parseEntry', () => {
  it.each([
    ['2 ovos', { name: 'ovos', quantity: 2, unit: null }],
    ['200g de arroz', { name: 'arroz', quantity: 200, unit: 'g' }],
    ['200 gramas de arroz', { name: 'arroz', quantity: 200, unit: 'g' }],
    ['1,5 xícara de feijão', { name: 'feijão', quantity: 1.5, unit: 'xicara' }],
    ['meia banana', { name: 'banana', quantity: 0.5, unit: null }],
    ['duas colheres de sopa de aveia', { name: 'aveia', quantity: 2, unit: 'colher_sopa' }],
    ['1/2 copo de leite', { name: 'leite', quantity: 0.5, unit: 'copo' }],
    ['0,3 kg de batata', { name: 'batata', quantity: 0.3, unit: 'kg' }],
    ['arroz 150 g', { name: 'arroz', quantity: 150, unit: 'g' }],
    ['pão integral', { name: 'pão integral', quantity: null, unit: null }],
    ['uma fatia de pão', { name: 'pão', quantity: 1, unit: 'fatia' }],
  ])('%s', (input, expected) => {
    expect(parseEntry(input)).toMatchObject(expected);
  });

  it('não confunde palavra comum com número', () => {
    expect(parseEntry('maçã')).toMatchObject({ name: 'maçã', quantity: null });
  });
});

describe('resolveFoodText', () => {
  it('resolve "2 ovos e pão integral" marcando quantidade para confirmar', () => {
    const items = resolveFoodText('2 ovos e pão integral', search);
    expect(items.map((i) => [i.food?.name, i.status])).toEqual([
      ['Ovo, de galinha, inteiro, cozido/10minutos', 'needs_quantity'],
      ['Pão, trigo, forma, integral', 'needs_quantity'],
    ]);
    // Sem porção caseira cadastrada, não inventa gramas.
    expect(items.every((i) => i.grams === null && i.macros === null && i.needsConfirmation)).toBe(
      true,
    );
  });

  it('resolve "arroz, feijão e frango" com alternativas', () => {
    const items = resolveFoodText('arroz, feijão e frango', search);
    expect(items.map((i) => i.food?.id)).toEqual(['taco:3', 'taco:561', 'taco:410']);
    expect(items[0]?.alternatives.length).toBeGreaterThan(0);
  });

  it('calcula macros quando há gramas', () => {
    const [item] = resolveFoodText('200g de arroz', search);
    expect(item).toMatchObject({ status: 'resolved', grams: 200, needsConfirmation: false });
    expect(item?.macros?.kcal).toBe(Math.round(item!.food!.per100g.kcal * 2));
  });

  it('pede confirmação para volume convertido', () => {
    const [item] = resolveFoodText('300ml de suco de laranja', search);
    expect(item?.status).toBe('resolved');
    expect(item?.needsConfirmation).toBe(true);
    expect(item?.notes[0]).toMatch(/1 ml = 1 g/);
  });

  it('marca itens não encontrados', () => {
    const [item] = resolveFoodText('100g de xyzzy', search);
    expect(item).toMatchObject({ status: 'not_found', food: null, needsConfirmation: true });
  });

  it('usa porção caseira quando o alimento tiver', () => {
    const base = search.getById('taco:488')!;
    const withPortion = createFoodSearch([
      { ...base, portions: [{ label: 'unidade', grams: 50 }] },
    ]);
    const [item] = resolveFoodText('2 ovos', withPortion);
    expect(item).toMatchObject({ grams: 100, status: 'resolved' });
  });

  it('parseFoodText devolve lista vazia para texto vazio', () => {
    expect(parseFoodText('  ')).toEqual([]);
  });
});
