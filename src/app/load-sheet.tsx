import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { Chip } from '@/components/chip';
import { Divider } from '@/components/divider';
import { Icon } from '@/components/icon';
import { Panel } from '@/components/panel';
import { Pressable } from '@/components/pressable';
import { SectionHeader } from '@/components/section-header';
import { useRun } from '@/features/aqua/hooks/use-run';
import { useAquaStore } from '@/features/aqua/store/aqua-store';
import type { RunSlot } from '@/features/aqua/types/aqua';
import { fmtLongDay } from '@/features/aqua/utils/dates';
import { linesText, productById } from '@/features/aqua/utils/schedule';

export default function LoadSheetScreen() {
  const params = useLocalSearchParams<{ date?: string; run?: string }>();
  const runSlot: RunSlot | undefined = params.run === 'afternoon' ? 'afternoon' : params.run === 'morning' ? 'morning' : undefined;
  const run = useRun(params.date, runSlot);
  const role = useAquaStore((s) => s.role);
  const moveStop = useAquaStore((s) => s.moveStop);
  const data = run.data;
  const totals = new Map<string, number>();
  run.stops.forEach((s) => s.delivery.lines.forEach((l) => totals.set(l.productId, (totals.get(l.productId) ?? 0) + l.qty)));
  const canMove = role === 'owner' && !run.locked;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-5">
      <BackHeader
        title="Load sheet"
        subtitle={`${fmtLongDay(run.date)} • ${run.run === 'morning' ? 'Morning' : 'Afternoon'} run • ${run.stops.length} stops`}
        right={run.locked ? <Chip label="Locked" tone="muted" /> : null}
      />

      <View className="gap-3">
        <SectionHeader title="Load the van" />
        <Panel pad="list">
          {totals.size === 0 ? <View className="py-4"><Text className="text-[13px] text-muted">Nothing on this run.</Text></View> : null}
          {[...totals.entries()].map(([pid, qty], i) => {
            const p = productById(data, pid);
            return (
              <View key={pid}>
                {i > 0 ? <Divider /> : null}
                <View className="flex-row items-center justify-between py-3">
                  <Text className="text-[13px] text-foreground">{p?.name ?? pid}{p?.chilled ? ' (chilled box)' : ''}</Text>
                  <Text className="text-[15px] font-bold text-foreground">{qty}</Text>
                </View>
              </View>
            );
          })}
        </Panel>
        <Text className="text-[11px] text-muted">
          Van space {run.load.normal}/{data.settings.normalLimit} • chilled {run.load.chilled}/{data.settings.chilledLimit}
        </Text>
      </View>

      <View className="gap-3">
        <SectionHeader title="Stop order" />
        <Panel pad="list">
          {run.stops.map((s, i) => (
            <View key={s.delivery.householdId}>
              {i > 0 ? <Divider /> : null}
              <View className="flex-row items-center gap-3 py-3">
                <Text className="w-6 text-[13px] font-bold text-accent">{i + 1}</Text>
                <View className="flex-1 gap-0.5">
                  <Text className="text-[13px] font-semibold text-foreground">{s.household?.label}</Text>
                  <Text className="text-[11px] text-muted">{linesText(data, s.delivery.lines)} • {s.eta}</Text>
                </View>
                {canMove ? (
                  <View className="flex-row gap-1">
                    <Pressable onPress={() => moveStop(run.date, run.run, s.delivery.householdId, -1)} isDisabled={i === 0} accessibilityLabel={`Move ${s.household?.label} up`}>
                      <View className={`w-8 h-8 rounded-full bg-sky items-center justify-center ${i === 0 ? 'opacity-40' : ''}`}>
                        <Icon sf="arrow.up" ion="arrow-up" size={13} />
                      </View>
                    </Pressable>
                    <Pressable onPress={() => moveStop(run.date, run.run, s.delivery.householdId, 1)} isDisabled={i === run.stops.length - 1} accessibilityLabel={`Move ${s.household?.label} down`}>
                      <View className={`w-8 h-8 rounded-full bg-sky items-center justify-center ${i === run.stops.length - 1 ? 'opacity-40' : ''}`}>
                        <Icon sf="arrow.down" ion="arrow-down" size={13} />
                      </View>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </Panel>
        {role === 'owner' && run.locked ? <Text className="text-[11px] text-faint">This run is locked, so the stop order is fixed.</Text> : null}
      </View>
    </ScrollView>
  );
}
