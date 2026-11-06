import { View } from 'react-native';

type NextMarkProps = {
  /** 'accent' on blue links, 'muted' in rows, 'white' on filled buttons. */
  tone?: 'accent' | 'muted' | 'white';
};

const TONE = {
  accent: 'border-accent',
  muted: 'border-muted/50',
  white: 'border-white',
} as const;

/** The small "go" caret used inside links and pill buttons (never on its own). */
export function NextMark({ tone = 'accent' }: NextMarkProps) {
  return (
    <View className="w-3 h-3 items-center justify-center">
      <View className={`w-1.5 h-1.5 border-t-2 border-r-2 rotate-45 ${TONE[tone]}`} />
    </View>
  );
}
