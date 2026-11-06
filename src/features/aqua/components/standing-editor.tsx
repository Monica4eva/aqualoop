import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Divider } from '@/components/divider';
import { Panel } from '@/components/panel';
import { PillButton } from '@/components/pill-button';
import { Segmented } from '@/components/segmented';
import { Stepper } from '@/components/stepper';
import { useAquaStore } from '@/features/aqua/store/aqua-store';
import type { Line, RunSlot, StandingOrder } from '@/features/aqua/types/aqua';
import { shortWeekday } from '@/features/aqua/utils/dates';
import { sameLines } from '@/features/aqua/utils/schedule';

type StandingEditorProps = { householdId: string; by: 'owner' | 'customer' };

const DAYS = [1, 2, 3, 4, 5, 6];

/** Edit a repeat order: what, how often, which day and run. Saves to the audit trail. */
export function StandingEditor({ householdId, by }: StandingEditorProps) {
  const data = useAquaStore((s) => s.data);
  const update = useAquaStore((s) => s.updateStanding);
  const standing = data.standing[householdId];
  const [lines, setLines] = useState<Line[]>(standing?.lines ?? []);
  const [day, setDay] = useState(standing?.day ?? 4);
  const [run, setRun] = useState<RunSlot>(standing?.run ?? 'morning');
  const [freq, setFreq] = useState<StandingOrder['frequency']>(standing?.frequency ?? 'weekly');
  if (!standing) return null;

  const qty = (pid: string) => lines.find((l) => l.productId === pid)?.qty ?? 0;
  const setQty = (pid: string, n: number) => {
    const rest = lines.filter((l) => l.productId !== pid);
    setLines(n > 0 ? [...rest, { productId: pid, qty: n }] : rest);
  };
  const changed = !sameLines(lines, standing.lines) || day !== standing.day || run !== standing.run || freq !== standing.frequency;
  const ended = standing.status === 'ended';

  return (
    <View className="gap-3">
      <Panel pad="list">
        {data.products.filter((p) => p.active).map((p, i) => (
          <View key={p.id}>
            {i > 0 ? <Divider /> : null}
            <View className="flex-row items-center justify-between gap-3 py-2.5">
              <View className="flex-1">
                <Text className="text-[13px] text-foreground">{p.name}</Text>
                <Text className="text-[11px] text-muted">{data.settings.currency}{p.price.toFixed(2)}</Text>
              </View>
              <Stepper size="sm" value={qty(p.id)} max={p.maxPerOrder} onChange={(n) => setQty(p.id, n)} />
            </View>
          </View>
        ))}
      </Panel>
      <Segmented values={['weekly', 'fortnightly'] as const} labels={['Every week', 'Every 2 weeks']} value={freq} onChange={setFreq} />
      <View className="flex-row gap-1.5">
        {DAYS.map((d) => (
          <PillButton key={d} size="sm" grow variant={d === day ? 'filled' : 'soft'} label={shortWeekday(d)} onPress={() => setDay(d)} />
        ))}
      </View>
      <Segmented values={['morning', 'afternoon'] as const} labels={['Morning run', 'Afternoon run']} value={run} onChange={setRun} />
      <PillButton
        label={ended ? 'Start this order again' : 'Save repeat order'}
        disabled={lines.length === 0 || (!changed && !ended)}
        onPress={() => {
          update(householdId, { lines, day, run, frequency: freq, status: 'active' }, by);
          Alert.alert('Saved', 'Your repeat order is updated.');
        }}
      />
    </View>
  );
}
