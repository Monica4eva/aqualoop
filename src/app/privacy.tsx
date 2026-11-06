import { ScrollView, Text, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { Icon } from '@/components/icon';
import { IconBubble } from '@/components/icon-bubble';
import { Panel } from '@/components/panel';

const ITEMS = [
  { sf: 'person.text.rectangle', ion: 'id-card', title: 'What we keep', body: 'Only your phone number, a household label, your area and your orders. Nothing else.' },
  { sf: 'waveform', ion: 'mic', title: 'Voice notes', body: 'The audio is deleted once your order is confirmed or checked. We keep the written words so you can see what we understood.' },
  { sf: 'text.bubble', ion: 'chatbox', title: 'Reading messages', body: 'The reader only sees the message itself, never your household details or order history.' },
  { sf: 'person.badge.key', ion: 'key', title: 'Who sees what', body: 'The owner sees orders and messages. Drivers see only their own run: stop, address and items. No message text and no voice notes.' },
  { sf: 'testtube.2', ion: 'flask', title: 'Demo data', body: 'Every household, name and number in this demo is made up.' },
] as const;

export default function PrivacyScreen() {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-5">
      <BackHeader title="Privacy and access" subtitle="What we keep and who sees it" />
      <Panel pad="list">
        {ITEMS.map((s) => (
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
    </ScrollView>
  );
}
