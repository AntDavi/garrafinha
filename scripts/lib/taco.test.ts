import { describe, expect, it } from 'vitest';

import { parseTacoRows, parseTacoValue } from './taco';

// Reproduz o layout real da aba "CMVCol taco3": cabeçalho em 3 linhas e categorias intercaladas.
const header = [
  [null, null, null, null, null, null, null, null, 'Carbo-', 'Fibra'],
  [
    'Número do',
    null,
    'Umidade',
    'Energia',
    null,
    'Proteína',
    'Lipídeos',
    'Colesterol',
    'idrato',
    'Alimentar',
  ],
  [
    'Alimento',
    'Descrição dos alimentos',
    '(%)',
    '(kcal)',
    '(kJ)',
    '(g)',
    '(g)',
    '(mg)',
    '(g)',
    '(g)',
  ],
];

const rows = [
  ...header,
  ['Cereais e derivados', null, null, null, null, null, null, null, null, null],
  [3, 'Arroz, tipo 1, cozido', 69.1, 128.2584, 536.6, 2.5208, 0.227, 'NA', 28.0598, 1.56],
  ...header,
  ['Gorduras e óleos', null, null, null, null, null, null, null, null, null],
  [268, 'Óleo,  de canola', 0, 884, 3699, 'NA', 100, 'NA', 'NA', 'NA'],
  [999, 'Teste, traço', 0, 10, 40, 'Tr', 'Tr', 'Tr', 2, 0],
  [1000, 'Cerveja, pilsen 2', 0, 41, 170, 0.6, 'Tr', 'NA', 3.3, 0],
  [1001, 'Arroz, tipo 1', 0, 41, 170, 0.6, 'Tr', 'NA', 3.3, 0],
  ['Leite e derivados', null, null, null, null, null, null, null, null, null],
  [457, 'Leite, de vaca, desnatado, UHT', '*', '*', '*', '*', '*', '*', '*', '*'],
  [472, 'Cana, aguardente', 1, 215.66, 902, null, null, null, null, null],
  ['Legenda', null, null, null, null, null, null, null, null, null],
  ['*', 'as análises estão sendo reavaliadas', null, null, null, null, null, null, null, null],
];

describe('parseTacoValue', () => {
  it('segue a legenda oficial', () => {
    expect(parseTacoValue(12.5)).toEqual({ ok: true, value: 12.5 });
    expect(parseTacoValue('Tr')).toEqual({ ok: true, value: 0 });
    expect(parseTacoValue('NA')).toEqual({ ok: true, value: 0 });
    expect(parseTacoValue('*').ok).toBe(false);
    expect(parseTacoValue(null).ok).toBe(false);
  });

  it('trata resíduo negativo do carboidrato por diferença como traço', () => {
    expect(parseTacoValue(-0.045)).toEqual({ ok: true, value: 0 });
    expect(parseTacoValue(-1).ok).toBe(false);
  });
});

describe('parseTacoRows', () => {
  const { foods, excluded } = parseTacoRows(rows);

  it('extrai nome, categoria e macros por 100 g', () => {
    expect(foods[0]).toEqual({
      id: 'taco:3',
      name: 'Arroz, tipo 1, cozido',
      category: 'Cereais e derivados',
      per100g: { kcal: 128.26, protein: 2.52, carbs: 28.06, fat: 0.23 },
      portions: [],
    });
  });

  it('normaliza espaços e trata NA/Tr como zero', () => {
    expect(foods[1]).toMatchObject({
      name: 'Óleo, de canola',
      category: 'Gorduras e óleos',
      per100g: { kcal: 884, protein: 0, carbs: 0, fat: 100 },
    });
    expect(foods[2]?.per100g).toEqual({ kcal: 10, protein: 0, carbs: 2, fat: 0 });
  });

  it('remove marcas de nota de rodapé sem afetar "tipo 1"', () => {
    expect(foods[3]?.name).toBe('Cerveja, pilsen');
    expect(foods[4]?.name).toBe('Arroz, tipo 1');
  });

  it('exclui alimentos sem valores analisados e para na legenda', () => {
    expect(foods).toHaveLength(5);
    expect(excluded.map((e) => e.id)).toEqual(['taco:457', 'taco:472']);
    expect(excluded[0]?.reason).toMatch(/reavaliação/);
  });

  it('falha com mensagem clara se o cabeçalho não existir', () => {
    expect(() => parseTacoRows([[1, 'x', 2]])).toThrow(/Cabeçalho da TACO/);
  });
});
