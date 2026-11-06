import type { ReactNode } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Text, View } from 'react-native';

import { NextMark } from '@/components/next-mark';
import { Pressable } from '@/components/pressable';
import { Thumb } from '@/features/aqua/components/thumb';

type OrderRowProps = {
  image: ImageSourcePropType;
  title: string;
  detail: string;
  sub?: string;
  badge?: ReactNode;
  onPress?: () => void;
  right?: ReactNode;
};

/** Thumbnail row: "Riverside Apartments / 2 × 20L water / Next delivery: …  [Repeats] ›" */
export function OrderRow({ image, title, detail, sub, badge, onPress, right }: OrderRowProps) {
  const body = (
    <View className="flex-row items-center gap-3 py-3">
      <Thumb source={image} />
      <View className="flex-1 gap-0.5">
        <Text className="text-[14px] font-semibold text-foreground" numberOfLines={1}>{title}</Text>
        <Text className="text-[12px] text-foreground/80" numberOfLines={2}>{detail}</Text>
        {sub ? <Text className="text-[11px] text-muted" numberOfLines={1}>{sub}</Text> : null}
      </View>
      {badge}
      {right}
      {onPress ? <NextMark tone="muted" /> : null}
    </View>
  );
  if (!onPress) return body;
  return <Pressable onPress={onPress}>{body}</Pressable>;
}
