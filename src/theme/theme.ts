import { colors, macroColors } from './colors';
import { shadow } from './shadows';
import { radius, space } from './spacing';
import { tabBar } from './tabBar';
import { font, type } from './typography';

export const theme = { colors, macroColors, space, radius, font, type, shadow, tabBar } as const;

export type Theme = typeof theme;
