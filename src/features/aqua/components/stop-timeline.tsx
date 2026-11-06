import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Divider } from '@/components/divider';
import { NextMark } from '@/components/next-mark';
import { Panel } from '@/components/panel';
import { Pressable } from '@/components/pressable';
import { StopBadge } from '@/features/aqua/components/stop-badge';
import type { useRun } from '@/features/aqua/hooks/use-run';
import { linesText } from '@/features/aqua/utils/schedule';

type StopTimelineProps = { run: ReturnType<typeof useRun>; limit?: number };

/** "Today's Stops": done in green, current highlighted in blue, upcoming grey. */
export function StopTimeline({ run, limit }: StopTimelineProps) {
  const list = limit ? run.stops.slice(0, limit) : run.stops;
  if (list.length === 0) {
    return (
      <Panel>
        <Text className="text-[13px] text-muted">No stops booked for this run.</Text>
      </Panel>
    );
  }
  return (
    <Panel pad="list">
      {list.map((s, i) => {
        const current = run.next?.delivery.householdId === s.delivery.householdId;
        const state = s.status === 'not_home' ? 'missed' : s.status === 'pending' ? (current ? 'current' : 'upcoming') : 'done';
        const label = s.status === 'delivered' ? 'Delivered' : s.status === 'partial' ? 'Partly delivered' : s.status === 'not_home' ? 'Not home' : current ? 'Next' : `ETA ${s.eta}`;
        return (
          <View key={s.delivery.householdId}>
            {i > 0 ? <Divider /> : null}
            <Pressable
              onPress={() => router.push({ pathname: '/stop/[hid]', params: { hid: s.delivery.householdId, date: run.date, run: run.run } })}
            >
              <View className={`flex-row items-center gap-3 py-3 ${current ? 'bg-sky -mx-4 px-4' : ''}`}>
                <StopBadge n={i + 1} state={state} />
                <View className="flex-1 gap-0.5">
                  <Text className="text-[14px] font-semibold text-foreground" numberOfLines={1}>{s.household?.label}</Text>
                  <Text className="text-[11px] text-muted" numberOfLines={1}>{linesText(run.data, s.delivery.lines)}</Text>
                </View>
                <Text className={`text-[11px] font-semibold ${current ? 'text-accent' : s.status === 'pending' ? 'text-muted' : s.status === 'not_home' ? 'text-amber' : 'text-lagoon'}`}>{label}</Text>
                <NextMark tone="muted" />
              </View>
            </Pressable>
          </View>
        );
      })}
    </Panel>
  );
}
