import { ScrollView, Text, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { Icon } from '@/components/icon';
import { IconBubble } from '@/components/icon-bubble';
import { Panel } from '@/components/panel';
import { useAquaStore } from '@/features/aqua/store/aqua-store';
import { CONTAINER_NAMES, CONTAINER_TYPES, DEPOSITS } from '@/features/aqua/utils/schedule';

const STEPS = [
  { sf: 'bubble.left.fill', ion: 'chatbubble', title: 'Order', body: 'Message us in plain words, or tap Add in the shop. We confirm straight away, or a person checks it first.' },
  { sf: 'truck.box.fill', ion: 'car', title: 'Deliver', body: 'Your driver brings it on your usual day and run. Reminders arrive at 3 PM the day before.' },
  { sf: 'arrow.uturn.left', ion: 'return-up-back', title: 'Return', body: 'Leave rinsed empties out. Mark them ready in Containers and the driver takes them back.' },
  { sf: 'arrow.triangle.2.circlepath', ion: 'sync', title: 'Repeat', body: 'We wash, check and refill every container, so nothing is thrown away.' },
] as const;

export default function HowItWorksScreen() {
  const currency = useAquaStore((s) => s.data.settings.currency);
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-5">
      <BackHeader title="How returns work" subtitle="Order. Deliver. Return. Repeat." />
      <Panel pad="list">
        {STEPS.map((s) => (
          <View key={s.title} className="flex-row items-start gap-3 py-3">
            <IconBubble>
              <Icon sf={s.sf} ion={s.ion} size={16} color="accent" />
            </IconBubble>
            <View className="flex-1 gap-0.5">
              <Text className="text-[13px] font-semibold text-foreground">{s.title}</Text>
              <Text className="text-[12px] text-muted">{s.body}</Text>
            </View>
          </View>
        ))}
      </Panel>
      <Panel tone="lagoon">
        <Text className="text-[13px] font-semibold text-foreground">Deposits</Text>
        {CONTAINER_TYPES.map((t) => (
          <View key={t} className="flex-row justify-between">
            <Text className="text-[12px] text-muted">{CONTAINER_NAMES[t]}</Text>
            <Text className="text-[12px] font-semibold text-foreground">{currency}{DEPOSITS[t]} each</Text>
          </View>
        ))}
        <Text className="text-[11px] text-muted">You get the deposit back when a container comes home in one piece. A cracked one is logged as damaged.</Text>
      </Panel>
      <Panel>
        <Text className="text-[13px] font-semibold text-foreground">Holding more than 3?</Text>
        <Text className="text-[12px] text-muted">We'll ask to collect them on your next run, so there are enough to go round.</Text>
      </Panel>
    </ScrollView>
  );
}
