import { Text, View } from 'react-native';

import { HeroCard } from '@/components/hero-card';
import { Icon } from '@/components/icon';
import { ProgressBar } from '@/components/progress-bar';
import { ART } from '@/components/product-image';
import type { useRun } from '@/features/aqua/hooks/use-run';

type RunHeroProps = { run: ReturnType<typeof useRun>; area?: string };

/** "Active delivery run" hero from the Deliveries picture. */
export function RunHero({ run, area }: RunHeroProps) {
  const pct = Math.round(run.progress * 100);
  const title = run.stops.length === 0 ? 'No stops on this run' : run.left === 0 ? 'Run complete' : 'Active delivery run';
  return (
    <HeroCard
      eyebrow={
        <View className="flex-row items-center gap-2">
          <Icon sf="box.truck.fill" ion="bus" size={18} />
          <Text className="text-[14px] font-semibold text-accent">{run.run === 'morning' ? 'Morning run' : 'Afternoon run'}</Text>
        </View>
      }
      title={title}
      art={ART.deliveries}
      artWidth={140}
      artRatio={1}
    >
      <View className="gap-1">
        <Text className="text-[12px] text-muted">Run #{run.runNumber} • {area ?? 'All areas'} • {run.driver}</Text>
        <Text className="text-[13px] font-semibold text-foreground">
          {run.left} of {run.stops.length} stops remaining
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <View className="flex-1"><ProgressBar value={run.progress} tone={run.left === 0 && run.stops.length > 0 ? 'success' : 'accent'} /></View>
        <Text className="text-[12px] font-bold text-accent">{pct}%</Text>
      </View>
      <View className="flex-row gap-6">
        <View className="gap-0.5">
          <Text className="text-[10px] text-muted">Started</Text>
          <Text className="text-[13px] font-semibold text-foreground">{run.started}</Text>
        </View>
        <View className="gap-0.5">
          <Text className="text-[10px] text-muted">Estimated finish</Text>
          <Text className="text-[13px] font-semibold text-foreground">{run.finish}</Text>
        </View>
      </View>
    </HeroCard>
  );
}
