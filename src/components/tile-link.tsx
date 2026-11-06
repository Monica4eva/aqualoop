import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { NextMark } from '@/components/next-mark';
import { Panel } from '@/components/panel';
import { Pressable } from '@/components/pressable';

type TileLinkProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  /** row: icon left of the text (Home); stack: icon above (Deliveries quick actions). */
  layout?: 'row' | 'stack';
  badge?: ReactNode;
};

export function TileLink({ icon, title, subtitle, onPress, layout = 'row', badge }: TileLinkProps) {
  if (layout === 'stack') {
    return (
      <Pressable onPress={onPress} className="flex-1">
        <Panel pad="tight" grow className="items-center">
          {icon}
          <View className="self-stretch gap-0.5">
            <Text className="text-[12px] font-semibold text-foreground" numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
            <View className="flex-row items-center gap-0.5">
              <Text className="text-[10px] text-muted flex-shrink" numberOfLines={1}>{subtitle}</Text>
              <NextMark tone="muted" />
            </View>
          </View>
        </Panel>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onPress} className="flex-1">
      <Panel pad="tight" grow>
        <View className="flex-row items-center gap-3">
          {icon}
          <View className="flex-1 gap-0.5">
            <Text className="text-[14px] font-semibold text-foreground" numberOfLines={1}>{title}</Text>
            <Text className="text-[11px] text-muted" numberOfLines={2}>{subtitle}</Text>
          </View>
          {badge ?? <NextMark tone="muted" />}
        </View>
      </Panel>
    </Pressable>
  );
}
