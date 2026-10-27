import { colors } from './colors';
import { font } from './typography';

/** Altura base da tab bar; somar o inset inferior da área segura no layout. */
export const tabBar = {
  height: 76,
  iconSize: 24,
  label: { fontFamily: font.bold, fontSize: 11, fontWeight: '700' },
  activeTint: colors.ink,
  inactiveTint: '#97a3ae',
} as const;
