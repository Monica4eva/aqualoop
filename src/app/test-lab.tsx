import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Presets } from 'react-native-pulsar';

import { BackHeader } from '@/components/back-header';
import { Chip } from '@/components/chip';
import { Divider } from '@/components/divider';
import { Panel } from '@/components/panel';
import { PillButton } from '@/components/pill-button';
import { RouteChip } from '@/features/aqua/components/route-chip';
import { useAquaStore } from '@/features/aqua/store/aqua-store';
import { LAB_CASES, runCase, type LabOutcome } from '@/features/aqua/utils/test-lab';
import { PARSER_NAME } from '@/features/aqua/utils/parse-message';

export default function TestLabScreen() {
  const [results, setResults] = useState<Record<number, LabOutcome>>({});
  const reset = useAquaStore((s) => s.reset);
  const sendMessage = useAquaStore((s) => s.sendMessage);
  const setRole = useAquaStore((s) => s.setRole);
  const ran = Object.keys(results).length;
  const passed = Object.values(results).filter((r) => r.pass).length;

  const runAll = () => {
    const out: Record<number, LabOutcome> = {};
    LAB_CASES.forEach((c) => {
      out[c.id] = runCase(c);
    });
    setResults(out);
    if (Object.values(out).every((r) => r.pass)) Presets.System.notificationSuccess();
  };

  const send = (text: string, hid: string | null) => {
    setRole('customer', hid ?? 'H07');
    sendMessage(text, 'text', hid);
    router.push('/chat');
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-5">
      <BackHeader title="Test Lab" subtitle={`25 sample messages • ${PARSER_NAME}`} />
      <Panel tone="sky">
        <View className="flex-row items-end justify-between">
          <View className="gap-0.5">
            <Text className="text-[11px] font-semibold uppercase text-muted">Score</Text>
            <Text className="text-[28px] font-bold text-foreground">{ran > 0 ? `${passed}/${LAB_CASES.length}` : '–'}</Text>
          </View>
          {ran > 0 ? <Chip label={passed === LAB_CASES.length ? 'All passed' : `${LAB_CASES.length - passed} failed`} tone={passed === LAB_CASES.length ? 'success' : 'danger'} /> : null}
        </View>
        <Text className="text-[11px] text-muted">Each case runs on its own fresh copy of Tue 17 Nov, 2 PM. Your demo data is not touched.</Text>
        <PillButton label="Run all from fresh start" icon="play.fill" onPress={runAll} />
      </Panel>

      <Panel pad="list">
        {LAB_CASES.map((c, i) => {
          const r = results[c.id];
          return (
            <View key={c.id}>
              {i > 0 ? <Divider /> : null}
              <View className="gap-2 py-3">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1 gap-0.5">
                    <Text className="text-[11px] font-semibold text-muted">#{c.id} • {c.note}{c.householdId ? '' : ' • unknown number'}</Text>
                    <Text className="text-[13px] font-semibold text-foreground">"{c.text}"</Text>
                  </View>
                  {r ? <Chip label={r.pass ? 'Pass' : 'Fail'} tone={r.pass ? 'success' : 'danger'} /> : null}
                </View>
                <View className="flex-row flex-wrap items-center gap-1.5">
                  <Text className="text-[11px] text-muted">Expect</Text>
                  <RouteChip route={c.route} />
                  {c.rules.map((rule) => <Chip key={rule} label={rule} tone="muted" />)}
                </View>
                {r ? (
                  <View className="flex-row flex-wrap items-center gap-1.5">
                    <Text className="text-[11px] text-muted">Got</Text>
                    <RouteChip route={r.result.route} />
                    {r.result.rules.map((rule) => <Chip key={rule} label={rule} tone="muted" />)}
                    <Chip label={`Intent ${r.intentOK ? 'ok' : r.result.parsed.intent}`} tone={r.intentOK ? 'success' : 'danger'} />
                    <Chip label={`Route ${r.routeOK ? 'ok' : 'off'}`} tone={r.routeOK ? 'success' : 'danger'} />
                    <Chip label={`Rules ${r.rulesOK ? 'ok' : 'off'}`} tone={r.rulesOK ? 'success' : 'danger'} />
                  </View>
                ) : null}
                <View className="flex-row">
                  <PillButton size="sm" variant="soft" label="Send to chat" next onPress={() => send(c.text, c.householdId)} />
                </View>
              </View>
            </View>
          );
        })}
      </Panel>
      <PillButton variant="soft" label="Reset demo data" onPress={reset} />
    </ScrollView>
  );
}
