import { Text, View } from 'react-native';

import { Image } from '@/components/image';
import { Panel } from '@/components/panel';
import { ProgressBar } from '@/components/progress-bar';
import { ART } from '@/components/product-image';

type VanCapacityProps = { normal: number; chilled: number; limits: { normal: number; chilled: number } };

function Half({ label, used, limit, art }: { label: string; used: number; limit: number; art: number }) {
  const ratio = limit === 0 ? 0 : used / limit;
  return (
    <View className="flex-1 flex-row items-center gap-3">
      <Image source={art} className="w-10 h-12" contentFit="contain" />
      <View className="flex-1 gap-1">
        <Text className="text-[11px] text-muted">{label}</Text>
        <Text className="text-[14px] font-bold text-foreground">
          {Math.round(used * 10) / 10} <Text className="text-[11px] font-normal text-muted">/ {limit}</Text>
        </Text>
        <ProgressBar value={Math.min(1, ratio)} tone={ratio > 1 ? 'danger' : ratio > 0.85 ? 'warning' : 'accent'} />
      </View>
    </View>
  );
}

/** Van limits: normal space and the chilled box. */
export function VanCapacity({ normal, chilled, limits }: VanCapacityProps) {
  return (
    <Panel>
      <View className="flex-row gap-5">
        <Half label="Normal space" used={normal} limit={limits.normal} art={ART.jug} />
        <Half label="Chilled box" used={chilled} limit={limits.chilled} art={ART.milkJug} />
      </View>
    </Panel>
  );
}
