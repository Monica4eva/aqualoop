import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Panel } from '@/components/panel';
import { Pressable } from '@/components/pressable';
import type { useRun } from '@/features/aqua/hooks/use-run';
import { linesText, returnsText, expectedReturns } from '@/features/aqua/utils/schedule';

type NextStopCardProps = { run: ReturnType<typeof useRun> };

export function NextStopCard({ run }: NextStopCardProps) {
  const s = run.next;
  if (!s) {
    return (
      <Panel>
        <Text className="text-[13px] text-muted">{run.stops.length === 0 ? 'Nothing on this run.' : 'Every stop is done. Nice work.'}</Text>
      </Panel>
    );
  }
  const back = returnsText(expectedReturns(run.data, s.delivery));
  return (
    <Pressable onPress={() => router.push({ pathname: '/stop/[hid]', params: { hid: s.delivery.householdId, date: run.date, run: run.run } })}>
      <Panel>
        <View className="flex-row items-start gap-3">
          <View className="w-10 h-10 rounded-full bg-accent items-center justify-center">
            <Text className="text-[15px] font-bold text-white">{s.index + 1}</Text>
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-[15px] font-semibold text-foreground">{s.household?.label}</Text>
            <Text className="text-[12px] text-muted">{s.household?.address}</Text>
            <Text className="text-[12px] text-foreground/80">{linesText(run.data, s.delivery.lines)}</Text>
            {back ? <Text className="text-[11px] text-lagoon">Collect {back}</Text> : null}
          </View>
          <View className="items-end gap-1">
            {run.arrivingIn !== null ? <Chip label={`Arriving in ${run.arrivingIn} min`} tone="success" /> : null}
            <Text className="text-[11px] text-muted">ETA {s.eta}</Text>
          </View>
        </View>
      </Panel>
    </Pressable>
  );
}
