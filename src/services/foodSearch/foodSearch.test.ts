import { describe, expect, it } from 'vitest';

import { createFoodSearch, DEFAULT_FOOD_FOR_TERM } from './foodSearch';
import { normalizeQuery, normalizeText, singularize } from './normalize';
import { loadFoodsForTest } from './testing';

const foods = loadFoodsForTest();
const search = createFoodSearch(foods);
const top = (q: string) => search.search(q, 1)[0]?.food.name;

describe('normalize', () => {
  it('remove acentos, pontuação e stopwords', () => {
    expect(normalizeText('Pão, de queijo, assado')).toBe('pao queijo assado');
  });

  it('singulariza plurais comuns', () => {
    expect(['ovos', 'feijoes', 'paes', 'colheres', 'bananas', 'arroz'].map(singularize)).toEqual([
      'ovo',
      'feijao',
      'pao',
      'colher',
      'banana',
      'arroz',
    ]);
  });

  it('aplica sinônimos regionais e reordena sucos', () => {
    expect(normalizeQuery('aipim')).toBe('mandioca');
    expect(normalizeQuery('pão francês')).toBe(normalizeText('pao trigo frances'));
    expect(normalizeQuery('suco de laranja')).toBe('laranja suco');
  });
});

describe('createFoodSearch', () => {
  it('os alimentos padrão existem na TACO embarcada', () => {
    for (const id of Object.values(DEFAULT_FOOD_FOR_TERM)) {
      expect(search.getById(id), id).not.toBeNull();
    }
  });

  it('encontra alimentos comuns com acentos, plural e sinônimos', () => {
    expect(top('arroz')).toBe('Arroz, tipo 1, cozido');
    expect(top('Feijão preto')).toBe('Feijão, preto, cozido');
    expect(top('ovos')).toBe('Ovo, de galinha, inteiro, cozido/10minutos');
    expect(top('pao frances')).toBe('Pão, trigo, francês');
    expect(top('pão integral')).toBe('Pão, trigo, forma, integral');
    expect(top('macaxeira')).toBe('Mandioca, cozida');
    expect(top('frango grelhado')).toBe('Frango, peito, sem pele, grelhado');
    expect(top('carne moída')).toBe('Carne, bovina, acém, moído, cozido');
    expect(top('batata doce')).toBe('Batata, doce, cozida');
  });

  it('tolera pequenos erros de digitação', () => {
    expect(top('abacachi')).toBe('Abacaxi, cru');
  });

  it('não força resultado para termos sem correspondência', () => {
    expect(search.best('xyzzy')).toBeNull();
  });

  it('calcula macros a partir da TACO para a quantidade em gramas', () => {
    const arroz = search.getById('taco:3');
    expect(arroz).not.toBeNull();
    const m = search.nutrientsFor(arroz!, 150);
    expect(m.kcal).toBe(Math.round(arroz!.per100g.kcal * 1.5));
    expect(m.carbs).toBeCloseTo(arroz!.per100g.carbs * 1.5, 1);
  });
});
