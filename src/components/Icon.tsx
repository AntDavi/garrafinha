import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme';

import { iconRegistry, type IconName } from './icons/registry';

export type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
};

export function Icon({ name, size = 24, color = colors.ink, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {iconRegistry[name].map((d) => (
        <Path
          key={d}
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

export type { IconName };
