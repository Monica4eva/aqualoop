import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Divider } from '@/components/divider';
import { Icon } from '@/components/icon';
import { IconBubble } from '@/components/icon-bubble';
import { Panel } from '@/components/panel';
import { PillButton } from '@/components/pill-button';
import { Pressable } from '@/components/pressable';
import { ScreenHeader } from '@/components/screen-header';
import { SectionHeader } from '@/components/section-header';
import { Segmented } from '@/components/segmented';
import { TileLink } from '@/components/tile-link';
import { NextStopCard } from '@/features/aqua/components/next-stop-card';
import { OrderRow } from '@/features/aqua/components/order-row';
import { RunHero } from '@/features/aqua/components/run-hero';
import { StopTimeline } from '@/features/aqua/components/stop-timeline';
import { VanCapacity } from '@/features/aqua/components/van-capacity';
import { imageFor } from '@/features/aqua/hooks/use-home-screen';
import { defaultRun, useRun } from '@/features/aqua/hooks/use-run';
import { useAquaStore } from '@/features/aqua/store/aqua-store';
import type { RunSlot } from '@/features/aqua/types/aqua';
import { addDays, dateKey, fmtDay, relDay } from '@/features/aqua/utils/dates';
import { linesText, upcomingFor } from '@/features/aqua/utils/schedule';

function CustomerDeliveries() {
  const data = useAquaStore((s) => s.data);
  const hid = useAquaStore((s) => s.householdId);
  const toggleSkip = useAquaStore((s) => s.toggleSkip);
  const list = upcomingFor(data, hid, 5, true);
  const booked = list.filter((x) => !x.skipped).length;
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-22 gap-5">
      <ScreenHeader title="Deliveries" subtitle={`${booked} coming up • skip any you don't need`} />
      <View className="gap-3">
        <SectionHeader title="Coming up" action="My order" onAction={() => router.push('/my-order')} />
        <Panel pad="list">
          {list.length === 0 ? <View className="py-4"><Text className="text-[13px] text-muted">No deliveries booked. Start a chat to set one up.</Text></View> : null}
          {list.map((x, i) => (
            <View key={x.date}>
              {i > 0 ? <Divider inset="thumb" /> : null}
              <OrderRow
                image={imageFor(data, x.delivery ?? { lines: data.standing[hid]?.lines ?? [] })}
                title={relDay(x.date, data.clock)}
                detail={x.skipped ? 'Skipped' : linesText(data, x.delivery?.lines ?? [])}
                sub={x.delivery ? `${x.delivery.run === 'morning' ? 'Morning' : 'Afternoon'} run` : 'Tap to bring it back'}
                right={
                  <PillButton
                    size="sm"
                    variant={x.skipped ? 'filled' : 'soft'}
                    label={x.skipped ? 'Bring back' : 'Skip'}
                    onPress={() => {
                      if (x.skipped) {
                        toggleSkip(hid, x.date);
                        return;
                      }
                      Alert.alert(`Skip ${fmtDay(x.date)}?`, 'Your usual order carries on after that.', [
                        { text: 'Keep it', style: 'cancel' },
                        { text: 'Skip', onPress: () => toggleSkip(hid, x.date) },
                      ]);
                    }}
                  />
                }
              />
            </View>
          ))}
        </Panel>
      </View>
      <Panel tone="sky">
        <View className="flex-row items-center gap-3">
          <Icon sf="message.fill" ion="chatbubble-ellipses" size={18} />
          <Text className="flex-1 text-[12px] text-foreground">Need something different? Message us before 6 PM the day before.</Text>
        </View>
        <PillButton label="Start a chat" next onPress={() => router.push('/chat')} />
      </Panel>
    </ScrollView>
  );
}

export default function DeliveriesScreen() {
  const role = useAquaStore((s) => s.role);
  const clock = useAquaStore((s) => s.data.clock);
  const setRunLocked = useAquaStore((s) => s.setRunLocked);
  const waiting = useAquaStore((s) => s.data.reviews.filter((r) => r.status === 'waiting').length);
  const today = dateKey(clock);
  const [dayOffset, setDayOffset] = useState(0);
  const [slot, setSlot] = useState<RunSlot>(defaultRun(clock));
  const run = useRun(addDays(today, dayOffset), slot);
  if (role === 'customer') return <CustomerDeliveries />;
  const owner = role === 'owner';
  const days = [0, 1, 2, 3, 4];

  const lock = () => {
    if (!owner) return;
    Alert.alert(
      run.locked ? 'Unlock this run?' : 'Lock this run?',
      run.locked ? 'Stops can be moved again.' : 'The stop order is fixed for the driver. New messages still go to owner checks.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: run.locked ? 'Unlock' : 'Lock', onPress: () => setRunLocked(run.date, run.run, !run.locked) },
      ],
    );
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-22 gap-5">
      <ScreenHeader title="Deliveries" subtitle={`1 active run • ${run.left} stops left`} />

      <View className="gap-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {days.map((n) => {
            const key = addDays(today, n);
            const on = n === dayOffset;
            return (
              <Pressable key={n} onPress={() => setDayOffset(n)}>
                <View className={`px-4 py-2 rounded-full ${on ? 'bg-accent' : 'bg-surface'}`}>
                  <Text className={`text-[12px] font-semibold ${on ? 'text-white' : 'text-foreground'}`}>{n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : fmtDay(key)}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        <Segmented values={['morning', 'afternoon'] as const} labels={['Morning', 'Afternoon']} value={slot} onChange={setSlot} />
      </View>

      <RunHero run={run} />

      <View className="flex-row gap-2">
        <TileLink
          layout="stack"
          icon={<IconBubble><Icon sf="list.clipboard" ion="clipboard-outline" size={18} /></IconBubble>}
          title="Load sheet"
          subtitle="What to pack"
          onPress={() => router.push({ pathname: '/load-sheet', params: { date: run.date, run: run.run } })}
        />
        <TileLink
          layout="stack"
          icon={<IconBubble tone="lagoon"><Icon sf="shippingbox" ion="cube-outline" size={18} color="white" /></IconBubble>}
          title="Stock"
          subtitle="Milk use-by"
          onPress={() => router.push('/stock')}
        />
        <TileLink
          layout="stack"
          icon={<IconBubble tone="amber"><Icon sf="waterbottle" ion="water-outline" size={18} color="amber" /></IconBubble>}
          title="Empties"
          subtitle="To collect"
          onPress={() => router.push('/containers')}
        />
        {owner ? (
          <TileLink
            layout="stack"
            icon={<IconBubble tone="ai"><Icon sf={run.locked ? 'lock.fill' : 'lock.open'} ion={run.locked ? 'lock-closed' : 'lock-open-outline'} size={18} color="ai" /></IconBubble>}
            title={run.locked ? 'Locked' : 'Lock run'}
            subtitle={run.locked ? 'Tap to unlock' : 'Fix the order'}
            onPress={lock}
          />
        ) : (
          <TileLink
            layout="stack"
            icon={<IconBubble tone="ai"><Icon sf="gearshape" ion="settings-outline" size={18} color="ai" /></IconBubble>}
            title="Settings"
            subtitle="Switch role"
            onPress={() => router.push('/settings')}
          />
        )}
      </View>

      {owner && waiting > 0 ? (
        <Pressable onPress={() => router.push('/review')}>
          <Panel tone="amber">
            <View className="flex-row items-center gap-3">
              <Icon sf="exclamationmark.bubble.fill" ion="alert-circle" size={18} color="amber" />
              <Text className="flex-1 text-[12px] text-foreground">{waiting} messages still need you before the run.</Text>
              <Chip label="Open" tone="warning" />
            </View>
          </Panel>
        </Pressable>
      ) : null}

      <View className="gap-3">
        <SectionHeader title="Next Stop" action="See all stops" onAction={() => router.push({ pathname: '/load-sheet', params: { date: run.date, run: run.run } })} />
        <NextStopCard run={run} />
      </View>

      <View className="gap-3">
        <SectionHeader title={dayOffset === 0 ? "Today's Stops" : `Stops • ${relDay(run.date, clock)}`} action={run.locked ? 'Locked' : ''} />
        <StopTimeline run={run} />
      </View>

      <View className="gap-3">
        <SectionHeader title="Van Capacity" action="View details" onAction={() => router.push({ pathname: '/load-sheet', params: { date: run.date, run: run.run } })} />
        <VanCapacity normal={run.load.normal} chilled={run.load.chilled} limits={run.limits} />
      </View>
    </ScrollView>
  );
}
