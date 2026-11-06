import { useEffect } from 'react';
import { View } from 'react-native';
import { Presets } from 'react-native-pulsar';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { durations, easings } from '@/lib/motion';

type RippleCheckProps = {
  /** Change this number to replay the ripple. */
  play: number;
  size?: number;
};

function Ring({ v, size }: { v: SharedValue<number>; size: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: (1 - v.get()) * 0.55,
    transform: [{ scale: 0.5 + v.get() * 1.6 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      className="absolute rounded-full border-2 border-accent"
      style={[{ width: size, height: size }, style]}
    />
  );
}

/** The Delivered moment: three water rings spread from the drop, then a green check stamps in. */
export function RippleCheck({ play, size = 96 }: RippleCheckProps) {
  const r1 = useSharedValue(0);
  const r2 = useSharedValue(0);
  const r3 = useSharedValue(0);
  const stamp = useSharedValue(play > 0 ? 0 : 1);

  useEffect(() => {
    if (play === 0) return;
    const ripple = { duration: durations.draw, easing: easings.enter };
    [r1, r2, r3].forEach((r, i) => {
      r.set(0);
      r.set(withDelay(i * 120, withTiming(1, ripple)));
    });
    stamp.set(0);
    stamp.set(withDelay(durations.fast, withTiming(1, { duration: durations.gentle, easing: easings.enter })));
    Presets.System.notificationSuccess();
  }, [play, r1, r2, r3, stamp]);

  const stampStyle = useAnimatedStyle(() => ({
    opacity: stamp.get(),
    transform: [{ scale: 0.6 + stamp.get() * 0.4 }],
  }));

  return (
    <View className="items-center justify-center" style={{ width: size * 2, height: size * 1.6 }}>
      <Ring v={r1} size={size} />
      <Ring v={r2} size={size} />
      <Ring v={r3} size={size} />
      <Animated.View style={[{ width: size * 0.7, height: size * 0.7 }, stampStyle]} className="rounded-full bg-lagoon items-center justify-center">
        <Icon sf="checkmark" ion="checkmark" size={size * 0.34} color="white" />
      </Animated.View>
    </View>
  );
}
