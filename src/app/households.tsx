import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Input } from 'heroui-native';

import { BackHeader } from '@/components/back-header';
import { Chip } from '@/components/chip';
import { Divider } from '@/components/divider';
import { Icon } from '@/components/icon';
import { Panel } from '@/components/panel';
import { OrderRow } from '@/features/aqua/components/order-row';
import { imageFor } from '@/features/aqua/hooks/use-home-screen';
import { useAquaStore } from '@/features/aqua/store/aqua-store';
import { fmtDay, weekdayName } from '@/features/aqua/utils/dates';
import { CONTAINER_TYPES, linesText, nextDelivery } from '@/features/aqua/utils/schedule';

export default function HouseholdsScreen() {
  const data = useAquaStore((s) => s.data);
  const [q, setQ] = useState('');
  const list = data.households.filter((h) => `${h.label} ${h.area} ${h.id}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-5">
      <BackHeader title="Households" subtitle={`${data.households.length} households • repeat orders`} />
      <Panel pad="list">
        <View className="flex-row items-center gap-2">
          <Icon sf="magnifyingglass" ion="search" size={15} color="muted" />
          <Input value={q} onChangeText={setQ} placeholder="Search households or areas" className="flex-1 bg-transparent border-0 shadow-none px-0 h-11 text-[14px] leading-none" />
        </View>
      </Panel>
      <Panel pad="list">
        {list.length === 0 ? <View className="py-4"><Text className="text-[13px] text-muted">No household matches "{q}".</Text></View> : null}
        {list.map((h, i) => {
          const s = data.standing[h.id];
          const next = nextDelivery(data, h.id);
          const held = CONTAINER_TYPES.reduce((n, t) => n + (data.ledger[h.id]?.[t].held ?? 0), 0);
          const ended = s?.status === 'ended';
          return (
            <View key={h.id}>
              {i > 0 ? <Divider inset="thumb" /> : null}
              <OrderRow
                image={imageFor(data, { lines: s?.lines ?? [] })}
                title={h.label}
                detail={s ? `${linesText(data, s.lines)} • ${s.frequency === 'weekly' ? 'every' : 'every other'} ${weekdayName(s.day)}` : 'No repeat order'}
                sub={next ? `Next: ${fmtDay(next.date)}, ${next.run} • ${h.area}` : `${h.area} • nothing booked`}
                badge={ended ? <Chip label="Ended" tone="muted" /> : held > 3 ? <Chip label={`${held} empties`} tone="warning" /> : null}
                onPress={() => router.push({ pathname: '/household/[id]', params: { id: h.id } })}
              />
            </View>
          );
        })}
      </Panel>
    </ScrollView>
  );
}
