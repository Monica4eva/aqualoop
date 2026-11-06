/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0E1E3A',
    background: '#F3F8FD',
    backgroundElement: '#E4F1FC',
    backgroundSelected: '#CFE6FA',
    textSecondary: '#5B6B88',
  },
  dark: {
    text: '#0E1E3A',
    background: '#F3F8FD',
    backgroundElement: '#E4F1FC',
    backgroundSelected: '#CFE6FA',
    textSecondary: '#5B6B88',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/** Native-prop palette (icons, gradients, Skia). Mirrors the tokens in src/global.css. */
export const Palette = {
  foreground: '#0E1E3A',
  muted: '#5B6B88',
  faint: '#A7B3C7',
  accent: '#1E8BE6',
  white: '#FFFFFF',
  background: '#F3F8FD',
  sky: '#E4F1FC',
  skyDeep: '#CFE6FA',
  hero: '#DDF2FC',
  heroEnd: '#EAF5FD',
  ai: '#7B4DFF',
  amber: '#FF8A3D',
  lagoon: '#22C3A0',
  danger: '#E5484D',
  ring: 'rgba(30,139,230,0.35)',
} as const;

export type PaletteKey = keyof typeof Palette;
