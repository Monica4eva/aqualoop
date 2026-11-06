import { Ionicons } from '@expo/vector-icons';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';

import { Palette, type PaletteKey } from '@/constants/theme';

type IconProps = {
  /** SF Symbol (iOS). */
  sf: SFSymbol;
  /** Ionicons name (Android, web). */
  ion: ComponentProps<typeof Ionicons>['name'];
  size?: number;
  color?: PaletteKey;
};

/** One icon, native on each platform: SF Symbols on iOS, Ionicons elsewhere. */
export function Icon({ sf, ion, size = 20, color = 'accent' }: IconProps) {
  const tint = Palette[color];
  if (Platform.OS === 'ios') {
    return <SymbolView name={sf} size={size} tintColor={tint} weight="medium" style={{ width: size, height: size }} />;
  }
  return <Ionicons name={ion} size={size} color={tint} />;
}
