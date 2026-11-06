import { View } from 'react-native';

/** Hairline between rows inside a Panel; `inset` lines it up after a thumbnail. */
export function Divider({ inset }: { inset?: 'thumb' | 'icon' }) {
  const pad = inset === 'thumb' ? 'pl-16' : inset === 'icon' ? 'pl-12' : '';
  return (
    <View className={pad}>
      <View className="h-px bg-border" />
    </View>
  );
}
