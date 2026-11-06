import { Text, View } from 'react-native';

import { NextMark } from '@/components/next-mark';
import { Pressable } from '@/components/pressable';

type SectionHeaderProps = {
  title: string;
  action?: string;
  onAction?: () => void;
};

/** "Repeat Orders ........ See all ›" */
export function SectionHeader({ title, action = 'See all', onAction }: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-lg font-semibold text-foreground">{title}</Text>
      {onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <View className="flex-row items-center gap-1">
            <Text className="text-xs font-medium text-accent">{action}</Text>
            <NextMark />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}
