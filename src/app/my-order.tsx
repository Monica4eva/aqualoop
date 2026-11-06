import { ScrollView, Text, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { Chip } from '@/components/chip';
import { Divider } from '@/components/divider';
import { Panel } from '@/components/panel';
import { PillButton } from '@/components/pill-button';
import { SectionHeader } from '@/components/section-header';
import { StandingEditor } from '@/features/aqua/components/standing-editor';
import { useAquaStore } from '@/features/aqua/store/aqua-store';
import { fmtLongDay, weekdayName } from '@/features/aqua/utils/dates';
import { linesText, upcomingFor } from '@/features/aqua/utils/schedule';

export default function MyOrderScreen() {
  const data = useAquaStore((s) => s.data);
  const hid = useAquaStore((s) => s.householdId);
  const toggleSkip = useAquaStore((s) => s.toggleSkip);
  const s = data.standing[hid];
  const upcoming = upcomingFor(data, hid, 4, true);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-5">
      <BackHeader
        title="Repeat Order"
        subtitle={s ? `${linesText(data, s.lines)}, ${s.frequency === 'weekly' ? 'every' : 'every other'} ${weekdayName(s.day)} ${s.run}` : 'No repeat order yet'}
      />
      <View className="gap-3">
        <SectionHeader title="Next deliveries" />
        <Panel pad="list">
          {upcoming.map((u, i) => (
            <View key={u.date}>
              {i > 0 ? <Divider /> : null}
              <View className="flex-row items-center justify-between gap-3 py-3">
                <View className="flex-1 gap-0.5">
                  <Text className="text-[13px] font-semibold text-foreground">{fmtLongDay(u.date)}</Text>
                  <Text className="text-[12px] text-muted">{u.delivery ? `${linesText(data, u.delivery.lines)} • ${u.delivery.run}` : 'Skipped'}</Text>
                </View>
                {u.skipped ? <Chip label="Skipped" tone="muted" /> : null}
                <PillButton size="sm" variant="soft" label={u.skipped ? 'Bring back' : 'Skip'} onPress={() => toggleSkip(hid, u.date)} />
              </View>
            </View>
          ))}
        </Panel>
      </View>
      <View className="gap-3">
        <SectionHeader title="Change my repeat order" />
        <StandingEditor householdId={hid} by="customer" />
      </View>
    </ScrollView>
  );
}
