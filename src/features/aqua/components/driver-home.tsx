import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Panel } from '@/components/panel';
import { PillButton } from '@/components/pill-button';
import { ScreenHeader } from '@/components/screen-header';
import { SectionHeader } from '@/components/section-header';
import { NextStopCard } from '@/features/aqua/components/next-stop-card';
import { RunHero } from '@/features/aqua/components/run-hero';
import { StopTimeline } from '@/features/aqua/components/stop-timeline';
import { useRun } from '@/features/aqua/hooks/use-run';
import { CONTAINER_TYPES, expectedReturns } from '@/features/aqua/utils/schedule';

/** The driver's Home: the run, the next stop, what to collect. No messages, no other runs. */
export function DriverHome() {
  const run = useRun();
  const toCollect = run.stops
    .filter((s) => s.status === 'pending')
    .reduce((n, s) => {
      const r = expectedReturns(run.data, s.delivery);
      return n + CONTAINER_TYPES.reduce((m, t) => m + (r[t] ?? 0), 0);
    }, 0);
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-22 gap-5">
      <ScreenHeader title="Today's Run" subtitle={`${run.stops.length} stops • ${run.left} left`} />
      <RunHero run={run} />
      <View className="gap-3">
        <SectionHeader title="Next Stop" />
        <NextStopCard run={run} />
      </View>
      <Panel tone="lagoon">
        <View className="flex-row items-center gap-3">
          <Icon sf="arrow.uturn.backward.circle.fill" ion="return-up-back" size={20} color="lagoon" />
          <Text className="flex-1 text-[13px] text-foreground">{toCollect} empties to collect on the stops left</Text>
        </View>
      </Panel>
      <View className="gap-3">
        <SectionHeader title="Stops" action="Load sheet" onAction={() => router.push({ pathname: '/load-sheet', params: { date: run.date, run: run.run } })} />
        <StopTimeline run={run} />
      </View>
      <PillButton label="Open the full run" variant="soft" next onPress={() => router.push('/deliveries')} />
    </ScrollView>
  );
}
