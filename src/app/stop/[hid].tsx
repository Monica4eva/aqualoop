import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { Chip } from '@/components/chip';
import { Divider } from '@/components/divider';
import { Panel } from '@/components/panel';
import { PillButton } from '@/components/pill-button';
import { RippleCheck } from '@/components/ripple-check';
import { SectionHeader } from '@/components/section-header';
import { Stepper } from '@/components/stepper';
import { useRun } from '@/features/aqua/hooks/use-run';
import { useAquaStore } from '@/features/aqua/store/aqua-store';
import type { ContainerType, Line, RunSlot } from '@/features/aqua/types/aqua';
import { CONTAINER_NAMES, CONTAINER_TYPES, expectedReturns, linesText, productById, returnsText } from '@/features/aqua/utils/schedule';

const RESULT = { delivered: 'Delivered', partial: 'Partly delivered', not_home: 'Not home', pending: 'To do' } as const;

export default function StopScreen() {
  const params = useLocalSearchParams<{ hid: string; date: string; run: string }>();
  const runSlot: RunSlot = params.run === 'afternoon' ? 'afternoon' : 'morning';
  const run = useRun(params.date, runSlot);
  const completeStop = useAquaStore((s) => s.completeStop);
  const stop = run.stops.find((s) => s.delivery.householdId === params.hid);
  const data = run.data;
  const expected = stop ? expectedReturns(data, stop.delivery) : {};
  const [drops, setDrops] = useState<Line[]>(stop?.delivery.lines.map((l) => ({ ...l })) ?? []);
  const [back, setBack] = useState<Partial<Record<ContainerType, number>>>(expected);
  const [damaged, setDamaged] = useState(0);
  const [play, setPlay] = useState(0);

  if (!stop) {
    return (
      <View className="flex-1 bg-background px-5 pt-safe-offset-2 gap-5">
        <BackHeader title="Stop not found" subtitle="It may have moved to another run." />
      </View>
    );
  }
  const record = data.stops[`${run.date}|${run.run}`]?.[stop.delivery.householdId];
  const done = stop.status !== 'pending';
  const nextStop = run.stops.find((s) => s.status === 'pending' && s.delivery.householdId !== stop.delivery.householdId);
  const held = (t: ContainerType) => data.ledger[stop.delivery.householdId]?.[t].held ?? 0;

  const finish = (status: 'delivered' | 'partial' | 'not_home') => {
    const delivered = status === 'not_home' ? [] : status === 'delivered' ? stop.delivery.lines : drops.filter((l) => l.qty > 0);
    const collected = status === 'not_home' ? {} : back;
    completeStop({ date: run.date, run: run.run, householdId: stop.delivery.householdId, status, delivered, collected, damaged: status === 'not_home' ? 0 : damaged });
    if (status === 'delivered') setPlay((n) => n + 1);
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-5">
      <BackHeader
        title={`${stop.index + 1}. ${stop.household?.label ?? ''}`}
        subtitle={`${stop.household?.address ?? ''} • ETA ${stop.eta}`}
        right={<Chip label={RESULT[stop.status]} tone={stop.status === 'pending' ? 'accent' : stop.status === 'not_home' ? 'warning' : 'success'} />}
      />

      {done ? (
        <Panel>
          <View className="items-center gap-3 py-4">
            {stop.status === 'delivered' ? <RippleCheck play={play} size={96} /> : null}
            <Text className="text-[18px] font-bold text-foreground">{RESULT[stop.status]}</Text>
            <Text className="text-[12px] text-muted text-center">
              {record ? `${record.delivered.length > 0 ? linesText(data, record.delivered) : 'Nothing dropped'}${returnsText(record.collected) ? ` • collected ${returnsText(record.collected)}` : ''}${record.damaged > 0 ? ` • ${record.damaged} damaged` : ''}` : ''}
            </Text>
            <View className="flex-row justify-center self-stretch">
            {nextStop ? (
              <PillButton
                label={`Next: ${nextStop.household?.label ?? ''}`}
                next
                onPress={() => router.replace({ pathname: '/stop/[hid]', params: { hid: nextStop.delivery.householdId, date: run.date, run: run.run } })}
              />
            ) : (
              <PillButton label="Run finished, back to the run" onPress={() => router.back()} />
            )}
            </View>
          </View>
        </Panel>
      ) : (
        <>
          <View className="gap-3">
            <SectionHeader title="Drop off" />
            <Panel pad="list">
              {drops.map((l, i) => {
                const p = productById(data, l.productId);
                const ordered = stop.delivery.lines.find((x) => x.productId === l.productId)?.qty ?? 0;
                return (
                  <View key={l.productId}>
                    {i > 0 ? <Divider /> : null}
                    <View className="flex-row items-center justify-between gap-3 py-3">
                      <View className="flex-1 gap-0.5">
                        <Text className="text-[13px] font-semibold text-foreground">{p?.name ?? l.productId}</Text>
                        <Text className="text-[11px] text-muted">Ordered {ordered}{p?.chilled ? ' • chilled box' : ''}</Text>
                      </View>
                      <Stepper size="sm" value={l.qty} max={ordered} onChange={(n) => setDrops(drops.map((x) => (x.productId === l.productId ? { ...x, qty: n } : x)))} />
                    </View>
                  </View>
                );
              })}
            </Panel>
          </View>

          <View className="gap-3">
            <SectionHeader title="Empties collected" />
            <Panel pad="list">
              {CONTAINER_TYPES.map((t, i) => (
                <View key={t}>
                  {i > 0 ? <Divider /> : null}
                  <View className="flex-row items-center justify-between gap-3 py-3">
                    <View className="flex-1 gap-0.5">
                      <Text className="text-[13px] font-semibold text-foreground">{CONTAINER_NAMES[t]}</Text>
                      <Text className="text-[11px] text-muted">{expected[t] ? `${expected[t]} expected` : 'None expected'} • {held(t)} at the house</Text>
                    </View>
                    <Stepper size="sm" value={back[t] ?? 0} max={held(t)} onChange={(n) => setBack({ ...back, [t]: n })} />
                  </View>
                </View>
              ))}
              <Divider />
              <View className="flex-row items-center justify-between gap-3 py-3">
                <View className="flex-1 gap-0.5">
                  <Text className="text-[13px] font-semibold text-foreground">Damaged</Text>
                  <Text className="text-[11px] text-muted">Cracked or leaking 20L containers</Text>
                </View>
                <Stepper size="sm" value={damaged} max={Math.max(0, held('20L_container') - (back['20L_container'] ?? 0))} onChange={setDamaged} />
              </View>
            </Panel>
          </View>

          <View className="gap-2">
            <PillButton label="Delivered" variant="success" onPress={() => finish('delivered')} />
            <View className="flex-row gap-2">
              <PillButton label="Partly delivered" variant="soft" grow onPress={() => finish('partial')} />
              <PillButton label="Not home" variant="soft" grow onPress={() => finish('not_home')} />
            </View>
            <Text className="text-[11px] text-faint text-center">Delivered drops the full order. Partly delivered uses the numbers above.</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}
