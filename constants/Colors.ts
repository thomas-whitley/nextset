/**
 * NextSet palette — spec §12.2.
 *
 * Derived from gym materials and IWF competition plates rather than from
 * taste: the action colour is the 20 kg plate, success is the 10 kg plate,
 * error is the 25 kg plate. That derivation is what lets the bar-loading
 * strip use the same colours as information rather than decoration.
 *
 * The key names are unchanged from the previous blue/Inter palette so the
 * ~659 existing `Colors.light.*` call sites keep compiling; only the values
 * moved. `dark` is intentionally unreferenced — the app is light-only.
 */

// Plate weights, for anything that needs to map a denomination to its colour.
export const PLATE_COLORS: Record<number, string> = {
  25: '#B8232F', // red
  20: '#1C4FA1', // blue
  15: '#E9B400', // yellow
  10: '#2F7D4F', // green
  5: '#F3F3F1', // white — needs a border to read
  2.5: '#141517', // rubber
  1.25: '#141517', // rubber
};

const tintColorLight = '#1C4FA1';
const tintColorDark = '#4F8EF7';

export default {
  light: {
    // Plate blue — the one action colour.
    primary: '#1C4FA1',
    primaryLight: '#E4EAF4',
    accent: '#E9B400',
    accentLight: '#FBF2D5',

    // Plate green / yellow / red.
    success: '#2F7D4F',
    warning: '#E9B400',
    error: '#B8232F',

    focus: '#1C4FA1',
    focusRing: 'rgba(28, 79, 161, 0.35)',

    // Rubber, and the two greys beneath it. Tertiary is 4.9:1 on white.
    text: '#141517',
    textSecondary: '#4A4F55',
    textTertiary: '#6B7178',

    // Concrete ground, cards sit on top of it in white.
    background: '#EEF0ED',
    backgroundSecondary: '#FFFFFF',
    card: '#FFFFFF',
    border: '#D7DAD5',

    tint: tintColorLight,
    tabIconDefault: '#6B7178',
    tabIconSelected: tintColorLight,

    // Named material tokens, for places that mean the material rather than
    // the role — the slab background, a plate face.
    rubber: '#141517',
    concrete: '#EEF0ED',
    plateWhite: '#F3F3F1',

    // Text and hairlines when sitting on a rubber slab.
    onRubber: '#EEF0ED',
    onRubberSecondary: '#9BA1A6',
    borderOnRubber: '#2A2D30',
  },
  dark: {
    primary: '#4F8EF7',
    primaryLight: '#1E3A8A',
    accent: '#FF6B35',
    accentLight: '#7F1D1D',
    success: '#059669',
    warning: '#D97706',
    error: '#B91C1C',
    focus: '#4F8EF7',
    focusRing: 'rgba(79, 142, 247, 0.3)',
    text: '#F9FAFB',
    textSecondary: '#E5E7EB',
    textTertiary: '#9CA3AF',
    background: '#111827',
    backgroundSecondary: '#1F2937',
    card: '#1F2937',
    border: '#374151',
    tint: tintColorDark,
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorDark,
    rubber: '#141517',
    concrete: '#EEF0ED',
    plateWhite: '#F3F3F1',
    onRubber: '#EEF0ED',
    onRubberSecondary: '#9BA1A6',
    borderOnRubber: '#2A2D30',
  },
};
