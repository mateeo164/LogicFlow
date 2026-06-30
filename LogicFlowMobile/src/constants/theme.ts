import { Platform, TextStyle, ViewStyle } from 'react-native'

/**
 * LogicFlow — Editorial design system (mobile)
 * Mirrors the premium web look: warm paper canvas, Playfair Display serif
 * headings, a navy + amber palette and soft, refined shadows.
 */

export const Colors = {
  // Canvas — warm paper
  background: '#fbf9f4',
  backgroundAlt: '#f5f2ea',

  // Surfaces
  surface: '#ffffff',
  surfaceAlt: '#f7f4ee',
  surfaceSunken: '#efebe1',

  // Borders / hairlines
  border: '#e7e3d8',
  borderStrong: '#d8d3c5',

  // Brand — navy ink
  primary: '#243b53',
  primaryDeep: '#102a43',
  primaryMid: '#486581',
  primarySoft: '#dde5ee',
  primaryTint: 'rgba(36, 59, 83, 0.06)',

  // Accent — warm amber (the logo accent)
  accent: '#b45309',
  accentBright: '#d97706',
  accentDeep: '#92400e',
  accentSoft: '#f7ead2',
  accentTint: 'rgba(180, 83, 9, 0.08)',

  // Secondary (replaces the old purple) — slate
  secondary: '#486581',

  // Semantic
  success: '#047857',
  successSoft: '#d9efe6',
  successTint: 'rgba(4, 120, 87, 0.08)',
  warning: '#b45309',
  warningSoft: '#f7ead2',
  error: '#c2410c',
  errorSoft: '#f8ddcf',
  errorTint: 'rgba(194, 65, 12, 0.08)',

  // Text
  text: '#1c1917',
  textSecondary: '#57534e',
  textMuted: '#8a8378',
  textInverse: '#fafaf9',

  white: '#ffffff',
  black: '#000000',
  overlay: 'rgba(28, 25, 23, 0.45)',
} as const

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const Radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 9999,
} as const

export const Fonts = {
  serif: 'PlayfairDisplay_700Bold',
  serifBlack: 'PlayfairDisplay_800ExtraBold',
  serifSemi: 'PlayfairDisplay_600SemiBold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemi: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }) as string,
} as const

export const Shadow: Record<'sm' | 'md' | 'lg' | 'xl', ViewStyle> = {
  sm: {
    shadowColor: '#1c1917',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: '#1c1917',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  lg: {
    shadowColor: '#1c1917',
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 7,
  },
  xl: {
    shadowColor: '#1c1917',
    shadowOpacity: 0.14,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
}

export const Typography: Record<string, TextStyle> = {
  display: { fontFamily: Fonts.serifBlack, fontSize: 34, color: Colors.text, letterSpacing: -0.6, lineHeight: 40 },
  h1: { fontFamily: Fonts.serif, fontSize: 28, color: Colors.text, letterSpacing: -0.4, lineHeight: 34 },
  h2: { fontFamily: Fonts.serif, fontSize: 22, color: Colors.text, letterSpacing: -0.2, lineHeight: 28 },
  h3: { fontFamily: Fonts.sansBold, fontSize: 17, color: Colors.text, lineHeight: 23 },
  bodyStrong: { fontFamily: Fonts.sansSemi, fontSize: 15, color: Colors.text, lineHeight: 22 },
  body: { fontFamily: Fonts.sans, fontSize: 15, color: Colors.text, lineHeight: 22 },
  caption: { fontFamily: Fonts.sans, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  captionStrong: { fontFamily: Fonts.sansSemi, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  small: { fontFamily: Fonts.sans, fontSize: 11, color: Colors.textMuted, lineHeight: 15 },
  overline: {
    fontFamily: Fonts.sansSemi,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1.4,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  mono: { fontFamily: Fonts.mono, fontSize: 13, color: Colors.textSecondary },
}
