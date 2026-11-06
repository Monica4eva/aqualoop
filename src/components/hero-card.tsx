import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Text, View } from 'react-native';

import { Image } from '@/components/image';
import { Palette } from '@/constants/theme';

type HeroCardProps = {
  eyebrow: ReactNode;
  title: string;
  body?: string;
  art: ImageSourcePropType;
  /** Art width in points; height follows the art's ratio. */
  artWidth?: number;
  artRatio?: number;
  children?: ReactNode;
};

/** The pale-blue hero banner with the water-drop mascot on the right. */
export function HeroCard({ eyebrow, title, body, art, artWidth = 150, artRatio = 1, children }: HeroCardProps) {
  return (
    <View className="rounded-3xl overflow-hidden">
      <LinearGradient colors={[Palette.hero, Palette.heroEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />
      <View
        pointerEvents="none"
        style={{ position: 'absolute', right: 0, bottom: 0, width: artWidth, height: artWidth / artRatio }}
      >
        <Image source={art} className="w-full h-full" contentFit="contain" />
      </View>
      <View className="p-4 gap-2.5" style={{ paddingRight: artWidth * 0.8 }}>
        {eyebrow}
        <Text className="text-[20px] leading-6 font-bold text-foreground">{title}</Text>
        {body ? <Text className="text-[13px] leading-5 text-muted">{body}</Text> : null}
        {children}
      </View>
    </View>
  );
}
