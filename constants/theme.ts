import { TextStyle } from 'react-native';

/**
 * Layout, type and motion tokens. Colour lives in Colors.ts.
 *
 * The type scale exists because the app previously had none: Inter-Medium 99
 * uses, Bold 96, SemiBold 65, Regular 2 — everything between 10 and 12pt. A
 * screen where nothing is bigger than anything else has no hierarchy, only
 * texture.
 */

/** 4-based. Use these rather than arbitrary numbers so rhythm stays even. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

/** Tighter than the previous 16–20, which read soft. Gym kit is not soft. */
export const radius = {
  input: 8,
  card: 12,
  slab: 18,
  pill: 999,
} as const;

/**
 * A 1px border is the default separator. Shadow is reserved for the two
 * things that genuinely sit above the page: the active slab and a card being
 * dragged.
 *
 * Note: RN-web logs `"shadow*" style props are deprecated. Use "boxShadow"`.
 * Keeping the values here means that migration is one edit, not thirty.
 */
export const elevation = {
  slab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  dragging: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 12,
  },
} as const;

export const fonts = {
  display: 'ArchivoNarrow-Bold',
  title: 'ArchivoNarrow-Bold',
  section: 'ArchivoNarrow-SemiBold',
  numeric: 'ArchivoNarrow-SemiBold',
  body: 'Archivo-Regular',
  bodyMedium: 'Archivo-Medium',
  label: 'Archivo-Medium',
  eyebrow: 'Archivo-SemiBold',
} as const;

/** Anything that changes over time must not reflow as it changes. */
const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const type = {
  /** Weight numerals and timers. The loudest thing on any screen. */
  display: {
    fontFamily: fonts.display,
    fontSize: 44,
    lineHeight: 48,
    ...tabular,
  } as TextStyle,

  /** Screen titles. */
  title: {
    fontFamily: fonts.title,
    fontSize: 28,
    lineHeight: 34,
  } as TextStyle,

  /** Card headings, exercise names. */
  section: {
    fontFamily: fonts.section,
    fontSize: 20,
    lineHeight: 26,
  } as TextStyle,

  /** Set inputs and inline figures. */
  numeric: {
    fontFamily: fonts.numeric,
    fontSize: 17,
    lineHeight: 22,
    ...tabular,
  } as TextStyle,

  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
  } as TextStyle,

  bodyMedium: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    lineHeight: 24,
  } as TextStyle,

  label: {
    fontFamily: fonts.label,
    fontSize: 13,
    lineHeight: 18,
  } as TextStyle,

  /** Small uppercase signposts. Tracking is what makes these readable. */
  eyebrow: {
    fontFamily: fonts.eyebrow,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  } as TextStyle,
} as const;

/**
 * Motion exists to carry information. There are deliberately no page-load
 * sequences, staggered reveals or count-up numbers: this app is opened
 * mid-set, and every animation is latency between a user and their next rep.
 */
export const motion = {
  /** Gesture release and set completion. */
  spring: { damping: 18, stiffness: 220, mass: 1 },
  /** Colour and opacity. */
  fast: 140,
  /** Sheets, strip cross-fade. */
  base: 220,
} as const;

/** Minimum touch target. The app currently has zero uses of hitSlop. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
