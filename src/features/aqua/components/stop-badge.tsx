import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';

type StopBadgeProps = {
  n: number;
  state: 'done' | 'current' | 'upcoming' | 'missed';
};

/** The numbered disc on the stop timeline: green check when done, blue for the current stop. */
export function StopBadge({ n, state }: StopBadgeProps) {
  if (state === 'done') {
    return (
      <View className="w-7 h-7 rounded-full bg-lagoon items-center justify-center">
        <Icon sf="checkmark" ion="checkmark" size={13} color="white" />
      </View>
    );
  }
  if (state === 'missed') {
    return (
      <View className="w-7 h-7 rounded-full bg-amber items-center justify-center">
        <Icon sf="house" ion="home-outline" size={12} color="white" />
      </View>
    );
  }
  return (
    <View className={`w-7 h-7 rounded-full items-center justify-center ${state === 'current' ? 'bg-accent' : 'bg-border'}`}>
      <Text className={`text-[12px] font-bold ${state === 'current' ? 'text-white' : 'text-muted'}`}>{n}</Text>
    </View>
  );
}
