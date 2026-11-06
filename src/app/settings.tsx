import { router } from 'expo-router';
import { ScrollView, Switch, Text, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { Chip } from '@/components/chip';
import { Divider } from '@/components/divider';
import { Panel } from '@/components/panel';
import { PillButton } from '@/components/pill-button';
import { SectionHeader } from '@/components/section-header';
import { Segmented } from '@/components/segmented';
import { Stepper } from '@/components/stepper';
import { Palette } from '@/constants/theme';
import { ListRow } from '@/components/list-row';
import { useAquaStore } from '@/features/aqua/store/aqua-store';
import { at, DEMO_START, fmtLongDay, fmtTime, dateKey } from '@/features/aqua/utils/dates';
import { PARSER_NAME } from '@/features/aqua/utils/parse-message';
import { confirmDelete } from '@/lib/confirm';

const JUMPS = [
  { label: '3 PM reminders', ms: at(17, 15, 0) },
  { label: 'After 6 PM cutoff', ms: at(17, 18, 1) },
  { label: 'Thu 8 AM run', ms: at(19, 8, 0) },
];

function Row({ title, sub, right }: { title: string; sub?: string; right: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-3">
      <View className="flex-1 gap-0.5">
        <Text className="text-[13px] font-semibold text-foreground">{title}</Text>
        {sub ? <Text className="text-[11px] text-muted">{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export default function SettingsScreen() {
  const data = useAquaStore((s) => s.data);
  const role = useAquaStore((s) => s.role);
  const hid = useAquaStore((s) => s.householdId);
  const setRole = useAquaStore((s) => s.setRole);
  const setClock = useAquaStore((s) => s.setClock);
  const setSetting = useAquaStore((s) => s.setSetting);
  const reset = useAquaStore((s) => s.reset);
  const st = data.settings;
  const owner = role === 'owner';
  const household = data.households.find((h) => h.id === hid);
  const currencies = ['$', '€', '£'] as const;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-5">
      <BackHeader title="Settings" subtitle={`Signed in as ${role === 'customer' ? `customer • ${household?.label ?? ''}` : (role ?? '')}`} />

      <Panel pad="list">
        <Row
          title="Switch role"
          sub="Customer, owner or driver"
          right={<PillButton size="sm" variant="soft" label="Switch" onPress={() => { setRole(null); router.replace('/welcome'); }} />}
        />
      </Panel>

      <View className="gap-3">
        <SectionHeader title="Demo clock" />
        <Panel>
          <View className="flex-row items-center justify-between">
            <Text className="text-[14px] font-semibold text-foreground">{fmtLongDay(dateKey(data.clock))}, {fmtTime(data.clock)}</Text>
            {data.clock === DEMO_START ? <Chip label="Start" tone="muted" /> : null}
          </View>
          <View className="flex-row flex-wrap gap-2">
            {JUMPS.map((j) => (
              <PillButton key={j.label} size="sm" variant={data.clock >= j.ms ? 'soft' : 'filled'} disabled={data.clock >= j.ms} label={j.label} onPress={() => setClock(j.ms)} />
            ))}
            <PillButton size="sm" variant="soft" label="Back to start" onPress={() => setClock(DEMO_START)} />
          </View>
          <Text className="text-[11px] text-muted">Moving past 3 PM sends tomorrow's reminders. The clock only moves when you tap.</Text>
        </Panel>
        <PillButton
          label="Reset demo"
          variant="danger"
          onPress={() =>
            confirmDelete({
              title: 'Reset the demo?',
              message: 'All orders, messages and changes go back to Tue 17 Nov, 2 PM.',
              confirmLabel: 'Reset',
              onConfirm: reset,
            })
          }
        />
      </View>

      {owner ? (
        <View className="gap-3">
          <SectionHeader title="Business" />
          <Panel pad="list">
            <Row title="Currency" right={<View className="w-32"><Segmented values={currencies} value={currencies.includes(st.currency as (typeof currencies)[number]) ? (st.currency as (typeof currencies)[number]) : '$'} onChange={(v) => setSetting('currency', v)} /></View>} />
            <Divider />
            <Row title="Order cutoff" sub="Changes for the next day close at" right={<Stepper size="sm" value={st.cutoffHour} min={12} max={22} onChange={(n) => setSetting('cutoffHour', n)} format={(n) => `${n - 12} PM`} />} />
            <Divider />
            <Row title="Sureness needed" sub="Below this, the owner checks it" right={<Stepper size="sm" value={st.threshold} min={0.5} max={0.95} step={0.05} onChange={(n) => setSetting('threshold', n)} format={(n) => `${Math.round(n * 100)}%`} />} />
            <Divider />
            <Row title="Van space" sub="Normal load limit" right={<Stepper size="sm" value={st.normalLimit} min={10} max={60} onChange={(n) => setSetting('normalLimit', n)} />} />
            <Divider />
            <Row title="Chilled box" sub="Chilled load limit" right={<Stepper size="sm" value={st.chilledLimit} min={4} max={30} onChange={(n) => setSetting('chilledLimit', n)} />} />
          </Panel>
        </View>
      ) : null}

      {owner ? (
        <View className="gap-3">
          <SectionHeader title="Message reading" />
          <Panel pad="list">
            <Row title="Reader" sub="Reads messages on this phone, no internet" right={<Chip label={PARSER_NAME} tone="ai" />} />
            <Divider />
            <Row
              title="NVIDIA second check"
              sub="Placeholder: not connected in this demo. When on, unsure messages go to you."
              right={<Switch value={st.nvidiaCheck} onValueChange={(v) => setSetting('nvidiaCheck', v)} trackColor={{ true: Palette.accent, false: Palette.skyDeep }} />}
            />
          </Panel>
        </View>
      ) : null}

      <Panel pad="list">
        {owner ? <ListRow title="Test Lab" subtitle="25 sample messages and a score" onPress={() => router.push('/test-lab')} /> : null}
        {owner ? <Divider /> : null}
        <ListRow title="Privacy and access" subtitle="What we keep and who sees it" onPress={() => router.push('/privacy')} />
        <Divider />
        <ListRow title="How returns work" onPress={() => router.push('/how-it-works')} />
      </Panel>
      <Text className="text-[11px] text-faint text-center">AquaLoop demo • all data is fictional</Text>
    </ScrollView>
  );
}
