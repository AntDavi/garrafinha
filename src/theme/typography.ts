import type { TextStyle } from 'react-native';

export const font = {
  medium: 'Manrope_500Medium',
  semiBold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
} as const;

type TypeToken = Required<Pick<TextStyle, 'fontFamily' | 'fontSize' | 'fontWeight'>> &
  Pick<TextStyle, 'letterSpacing'>;

// fontWeight acompanha a família para manter consistência no web; no nativo a família já define o peso.
export const type = {
  numberXL: { fontFamily: font.extraBold, fontSize: 96, fontWeight: '800', letterSpacing: -3 },
  display: { fontFamily: font.extraBold, fontSize: 44, fontWeight: '800', letterSpacing: -1.2 },
  title: { fontFamily: font.extraBold, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  heading: { fontFamily: font.extraBold, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  subheading: { fontFamily: font.extraBold, fontSize: 16, fontWeight: '800' },
  body: { fontFamily: font.medium, fontSize: 15, fontWeight: '500' },
  bodyStrong: { fontFamily: font.bold, fontSize: 14, fontWeight: '700' },
  caption: { fontFamily: font.semiBold, fontSize: 12, fontWeight: '600' },
  micro: { fontFamily: font.bold, fontSize: 11, fontWeight: '700' },
} as const satisfies Record<string, TypeToken>;

export type TypeVariant = keyof typeof type;
