import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Pressable } from '@/components/pressable';

type BackHeaderProps = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

/** Top of every pushed screen: a round back button, then the title. */
export function BackHeader({ title, subtitle, right }: BackHeaderProps) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} accessibilityLabel="Back" hitSlop={8}>
          <View className="w-9 h-9 rounded-full bg-surface items-center justify-center">
            <Icon sf="chevron.left" ion="chevron-back" size={16} color="foreground" />
          </View>
        </Pressable>
        {right}
      </View>
      <View className="gap-1">
        <Text className="text-2xl font-bold text-foreground">{title}</Text>
        {subtitle ? <Text className="text-sm text-muted">{subtitle}</Text> : null}
      </View>
    </View>
  );
}
