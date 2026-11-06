import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { timing } from '@/lib/motion';

type ProgressBarProps = {
  /** 0..1 */
  value: number;
  tone?: 'accent' | 'warning' | 'danger' | 'success';
};

const FILL = { accent: 'bg-accent', warning: 'bg-amber', danger: 'bg-danger', success: 'bg-lagoon' } as const;

export function ProgressBar({ value, tone = 'accent' }: ProgressBarProps) {
  const v = useSharedValue(0);
  const clamped = Math.max(0, Math.min(1, value));
  useEffect(() => {
    v.set(withTiming(clamped, timing.draw));
  }, [clamped, v]);
  const style = useAnimatedStyle(() => ({ width: `${v.get() * 100}%` }));
  return (
    <View className="h-1.5 rounded-full bg-sky-deep/60 overflow-hidden">
      <Animated.View className={`h-full rounded-full ${FILL[tone]}`} style={style} />
    </View>
  );
}
