import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Pressable } from '@/components/pressable';

type StepperProps = {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: 'sm' | 'md';
  /** Shown after the number, e.g. "%" or a currency. */
  format?: (n: number) => string;
};

/** The round − / + control from the Containers picture. */
export function Stepper({ value, onChange, min = 0, max = 99, step = 1, size = 'md', format }: StepperProps) {
  const btn = size === 'md' ? 'w-9 h-9' : 'w-7 h-7';
  const round = (n: number) => Math.round(n * 100) / 100;
  return (
    <View className="flex-row items-center gap-2">
      <Pressable onPress={() => onChange(round(Math.max(min, value - step)))} isDisabled={value <= min} accessibilityLabel="Less">
        <View className={`${btn} rounded-full bg-sky items-center justify-center ${value <= min ? 'opacity-40' : ''}`}>
          <Icon sf="minus" ion="remove" size={size === 'md' ? 16 : 13} />
        </View>
      </Pressable>
      <Text className={`${size === 'md' ? 'text-lg min-w-8' : 'text-sm min-w-6'} font-bold text-foreground text-center`}>
        {format ? format(value) : value}
      </Text>
      <Pressable onPress={() => onChange(round(Math.min(max, value + step)))} isDisabled={value >= max} accessibilityLabel="More">
        <View className={`${btn} rounded-full bg-sky items-center justify-center ${value >= max ? 'opacity-40' : ''}`}>
          <Icon sf="plus" ion="add" size={size === 'md' ? 16 : 13} />
        </View>
      </Pressable>
    </View>
  );
}
