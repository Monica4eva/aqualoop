import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Pressable } from '@/components/pressable';
import { useOnTrack } from '@/features/aqua/hooks/use-on-track';

type ScreenHeaderProps = {
  title: string;
  subtitle: string;
};

/** Tab screen header: big title + subtitle, and the "On track for N%" pill (taps to settings). */
export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  const pct = useOnTrack();
  return (
    <View className="flex-row items-start justify-between gap-3 pt-2">
      <View className="flex-1 gap-1">
        <Text className="text-[26px] font-bold text-foreground" numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </Text>
        <Text className="text-[13px] text-muted" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Pressable onPress={() => router.push('/settings')} accessibilityLabel={`On track for ${pct} percent. Open settings`}>
        <View className="flex-row items-center gap-2 rounded-2xl bg-sky px-3 py-2">
          <Icon sf="drop.fill" ion="water" size={18} />
          <View>
            <Text className="text-[13px] font-semibold text-accent">On track</Text>
            <Text className="text-[11px] text-muted">for {pct}%</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}
