import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { IconBubble } from '@/components/icon-bubble';
import type { Activity } from '@/features/aqua/types/aqua';
import { fmtStamp } from '@/features/aqua/utils/dates';

const LOOK = {
  returned: { sf: 'checkmark', ion: 'checkmark', tone: 'lagoon', color: 'white' },
  delivered: { sf: 'box.truck.fill', ion: 'bus', tone: 'accent', color: 'white' },
  collected: { sf: 'minus', ion: 'remove', tone: 'sky', color: 'accent' },
  confirmed: { sf: 'checkmark.message.fill', ion: 'chatbubble', tone: 'sky', color: 'accent' },
  review: { sf: 'person.fill.questionmark', ion: 'help', tone: 'amber', color: 'amber' },
  skipped: { sf: 'forward.fill', ion: 'play-skip-forward', tone: 'muted', color: 'muted' },
  reminder: { sf: 'bell.fill', ion: 'notifications', tone: 'sky', color: 'accent' },
  restock: { sf: 'shippingbox.fill', ion: 'cube', tone: 'sky', color: 'accent' },
} as const;

/** One line of Recent / Container activity. */
export function ActivityRow({ item, now }: { item: Activity; now: number }) {
  const look = LOOK[item.kind];
  return (
    <View className="flex-row items-center gap-3 py-3">
      <IconBubble size="md" tone={look.tone}>
        <Icon sf={look.sf} ion={look.ion} size={16} color={look.color} />
      </IconBubble>
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-baseline justify-between gap-2">
          <Text className="text-[14px] font-semibold text-foreground flex-shrink" numberOfLines={1}>{item.title}</Text>
          <Text className="text-[10px] text-muted">{fmtStamp(item.at, now)}</Text>
        </View>
        <Text className="text-[12px] text-muted" numberOfLines={1}>{item.detail}</Text>
      </View>
    </View>
  );
}
