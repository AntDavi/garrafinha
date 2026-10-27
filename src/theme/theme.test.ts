import { describe, expect, it } from 'vitest';

import { colors, macroColors, radius, space, type } from './index';

describe('theme tokens', () => {
  it('mapeia macros para as cores definidas', () => {
    expect(macroColors).toEqual({
      protein: colors.danger,
      carbs: colors.warning,
      fat: colors.primary,
    });
  });

  it('mantém escala de espaçamento e raios', () => {
    expect(Object.values(space)).toEqual([4, 8, 12, 16, 20, 24, 32]);
    expect(radius.full).toBe(999);
  });

  it('define tipografia com Manrope', () => {
    expect(type.display).toMatchObject({ fontSize: 44, letterSpacing: -1.2 });
    expect(type.numberXL.fontSize).toBe(96);
  });
});
