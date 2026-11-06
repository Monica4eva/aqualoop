import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Panel } from '@/components/panel';

type StatTileProps = { icon: ReactNode; value: string; label: string; sub: string };

/** One of the four stat tiles on the Containers picture. */
export function StatTile({ icon, value, label, sub }: StatTileProps) {
  return (
    <View className="flex-1">
      <Panel pad="tight" grow>
        {icon}
        <Text className="text-[22px] font-bold text-foreground leading-7">{value}</Text>
        <View className="gap-0.5">
          <Text className="text-[11px] font-semibold text-foreground" numberOfLines={1}>{label}</Text>
          <Text className="text-[10px] text-muted" numberOfLines={2}>{sub}</Text>
        </View>
      </Panel>
    </View>
  );
}
