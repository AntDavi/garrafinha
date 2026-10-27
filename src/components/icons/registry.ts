/**
 * Registro de ícones (viewBox 24x24, traço 2, sem preenchimento).
 *
 * PROVISÓRIO: os traços abaixo são placeholders geométricos simples. Substitua cada entrada
 * pelos paths do Mage Icons (mesmo nome de chave) quando os SVGs definitivos forem exportados.
 */
export const iconRegistry = {
  home: ['M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z'],
  dumbbell: ['M6.5 6.5v11', 'M3.5 9v6', 'M17.5 6.5v11', 'M20.5 9v6', 'M6.5 12h11'],
  food: ['M5 3v8a3 3 0 0 0 6 0V3', 'M8 3v18', 'M16 21V3c2.5 1 4 4 4 8h-4'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21a8 8 0 0 1 16 0'],
  drop: ['M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  check: ['M5 12.5 10 17l9-10'],
  chevronRight: ['M9 6l6 6-6 6'],
  chevronLeft: ['M15 6l-6 6 6 6'],
  search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-4-4'],
  camera: [
    'M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z',
    'M12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  ],
  barcode: ['M4 6v12', 'M7 6v12', 'M11 6v12', 'M14 6v12', 'M17 6v12', 'M20 6v12'],
  flame: [
    'M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10-2 2-3 4-3 6-1-1-1.5-2-1.5-3C7 10 6 12.5 6 15a6 6 0 0 0 6 6z',
  ],
  scale: [
    'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z',
    'M9 9l3 3 3-3',
  ],
  chart: ['M4 20h16', 'M7 16v-4', 'M12 16V8', 'M17 16v-7'],
  calendar: [
    'M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z',
    'M4 10h16',
    'M8 4v4',
    'M16 4v4',
  ],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
  share: ['M12 4v11', 'M8 8l4-4 4 4', 'M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6'],
  settings: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M12 3v2', 'M12 19v2', 'M3 12h2', 'M19 12h2'],
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof iconRegistry;
