import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, type, type ColorName, type TypeVariant } from '@/theme';

export type TextProps = RNTextProps & {
  variant?: TypeVariant;
  color?: ColorName;
};

/** Wrapper mínimo que aplica os tokens tipográficos do tema. */
export function Text({ variant = 'body', color = 'ink', style, ...rest }: TextProps) {
  return <RNText {...rest} style={[type[variant], { color: colors[color] }, style]} />;
}
