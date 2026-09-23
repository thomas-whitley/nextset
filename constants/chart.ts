import Colors from '@/constants/Colors';
import { radius, fonts } from '@/constants/theme';

/**
 * chart-kit wants `(opacity) => rgba(...)` colour functions, not hex. Every
 * chart colour still has to trace back to a `Colors.light.*` token, so this
 * converts one rather than letting a raw rgb literal creep in.
 */
const hexToRgba = (hex: string, opacity: number): string => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const chartConfig = {
  backgroundGradientFrom: Colors.light.card,
  backgroundGradientTo: Colors.light.card,
  decimalPlaces: 0,
  color: (opacity = 1) => hexToRgba(Colors.light.primary, opacity),
  labelColor: (opacity = 1) => hexToRgba(Colors.light.textTertiary, opacity),
  style: {
    borderRadius: radius.card,
  },
  propsForDots: {
    r: '6',
    strokeWidth: '3',
    stroke: Colors.light.primary,
    fill: Colors.light.card,
  },
  propsForBackgroundLines: {
    strokeWidth: 1,
    stroke: Colors.light.border,
  },
  // react-native-svg Text accepts fontFamily directly; this is the one place
  // chart-kit exposes label typography, so point it at the numeric face.
  propsForLabels: {
    fontFamily: fonts.numeric,
  },
};
