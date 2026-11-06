import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Switch, Text, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { Chip } from '@/components/chip';
import { Divider } from '@/components/divider';
import { Panel } from '@/components/panel';
import { SectionHeader } from '@/components/section-header';
import { Palette } from '@/constants/theme';
import { StandingEditor } from '@/features/aqua/components/standing-editor';
import { useAquaStore } from '@/features/aqua/store/aqua-store';
import { fmtLongDay, fmtStamp } from '@/features/aqua/utils/dates';
import { CONTAINER_NAMES, CONTAINER_TYPES, linesText, upcomingFor } from '@/features/aqua/utils/schedule';

export default function HouseholdScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useAquaStore((s) => s.data);
  const setReminders = useAquaStore((s) => s.setReminders);
  const h = data.households.find((x) => x.id === id);
  if (!h) {
    return (
      <View className="flex-1 bg-background px-5 pt-safe-offset-2 gap-5">
        <BackHeader title="Household not found" />
      </View>
    );
  }
  const upcoming = upcomingFor(data, h.id, 4, true);
  const audit = data.audit.filter((a) => a.householdId === h.id).slice(0, 8);
  const ledger = data.ledger[h.id];
  const ended = data.standing[h.id]?.status === 'ended';

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-5">
      <BackHeader title={h.label} subtitle={`${h.contact} • ${h.phone} • ${h.area}`} right={ended ? <Chip label="Deliveries stopped" tone="muted" /> : null} />

      <Panel>
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 gap-0.5">
            <Text className="text-[14px] font-semibold text-foreground">Reminders</Text>
            <Text className="text-[11px] text-muted">A message at {data.settings.reminderHour - 12} PM the day before each delivery</Text>
          </View>
          <Switch value={h.reminders} onValueChange={(v) => setReminders(h.id, v)} trackColor={{ true: Palette.accent, false: Palette.skyDeep }} />
        </View>
      </Panel>

      <View className="gap-3">
        <SectionHeader title="Upcoming" />
        <Panel pad="list">
          {upcoming.length === 0 ? <View className="py-4"><Text className="text-[13px] text-muted">Nothing booked.</Text></View> : null}
          {upcoming.map((u, i) => (
            <View key={u.date}>
              {i > 0 ? <Divider /> : null}
              <View className="flex-row items-center justify-between gap-3 py-3">
                <View className="flex-1 gap-0.5">
                  <Text className="text-[13px] font-semibold text-foreground">{fmtLongDay(u.date)}</Text>
                  <Text className="text-[12px] text-muted">{u.delivery ? `${linesText(data, u.delivery.lines)} • ${u.delivery.run}` : 'Skipped'}</Text>
                </View>
                {u.skipped ? <Chip label="Skipped" tone="muted" /> : u.delivery?.source === 'override' ? <Chip label="Changed" tone="warning" /> : <Chip label="Repeats" />}
              </View>
            </View>
          ))}
        </Panel>
      </View>

      <View className="gap-3">
        <SectionHeader title="Repeat order" />
        <StandingEditor householdId={h.id} by="owner" />
      </View>

      <View className="gap-3">
        <SectionHeader title="Containers" />
        <Panel pad="list">
          {CONTAINER_TYPES.map((t, i) => (
            <View key={t}>
              {i > 0 ? <Divider /> : null}
              <View className="flex-row items-center justify-between py-3">
                <Text className="text-[13px] text-foreground">{CONTAINER_NAMES[t]}</Text>
                <Text className="text-[12px] text-muted">
                  {ledger?.[t].held ?? 0} held • {ledger?.[t].ready ?? 0} ready • {ledger?.[t].damaged ?? 0} damaged
                </Text>
              </View>
            </View>
          ))}
        </Panel>
      </View>

      <View className="gap-3">
        <SectionHeader title="Change history" />
        <Panel pad="list">
          {audit.length === 0 ? <View className="py-4"><Text className="text-[13px] text-muted">No changes yet.</Text></View> : null}
          {audit.map((a, i) => (
            <View key={a.id}>
              {i > 0 ? <Divider /> : null}
              <View className="py-3 gap-1">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="flex-1 text-[13px] font-semibold text-foreground">{a.field}</Text>
                  <Text className="text-[10px] text-faint">{fmtStamp(a.at, data.clock)}</Text>
                </View>
                <Text className="text-[12px] text-muted">{a.oldValue} → {a.newValue}</Text>
                <Text className="text-[11px] text-faint">By {a.by === 'system' ? 'the app' : a.by}{a.message ? ` • "${a.message}"` : ''}</Text>
              </View>
            </View>
          ))}
        </Panel>
      </View>
    </ScrollView>
  );
}
