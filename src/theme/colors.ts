export const colors = {
  ink: '#14202b',
  inkSoft: '#41505d',
  muted: '#8793a0',
  mutedLight: '#a3adb7',
  line: '#e6eaed',
  lineStrong: '#d9dfe4',
  bg: '#f7f8f6',
  surface: '#ffffff',
  surfaceAlt: '#f2f5f7',
  surfaceTint: '#eef3f6',
  primary: '#1f86c8',
  primaryDark: '#16679e',
  primarySoft: '#e4f2fb',
  water: '#4aaee8',
  accent: '#f2711c',
  success: '#3fae5a',
  danger: '#e5484d',
  warning: '#f2b01e',
  scrim: 'rgba(20,32,43,0.45)',
} as const;

export type ColorName = keyof typeof colors;

/** Cores fixas por macronutriente: proteína = danger, carboidrato = warning, gordura = primary. */
export const macroColors = {
  protein: colors.danger,
  carbs: colors.warning,
  fat: colors.primary,
} as const;
