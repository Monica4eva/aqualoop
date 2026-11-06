import { Text, View } from 'react-native';

export type ChipTone = 'accent' | 'success' | 'warning' | 'danger' | 'ai' | 'muted';

type ChipProps = {
  label: string;
  tone?: ChipTone;
  /** Uppercase eyebrow look ("DRINK BETTER"). */
  caps?: boolean;
};

const BG = {
  accent: 'bg-sky',
  success: 'bg-lagoon-soft',
  warning: 'bg-amber-soft',
  danger: 'bg-danger/10',
  ai: 'bg-ai-soft',
  muted: 'bg-border',
} as const;
const FG = {
  accent: 'text-accent',
  success: 'text-lagoon',
  warning: 'text-amber',
  danger: 'text-danger',
  ai: 'text-ai',
  muted: 'text-muted',
} as const;

export function Chip({ label, tone = 'accent', caps }: ChipProps) {
  return (
    <View className={`self-start rounded-full px-2 py-0.5 ${BG[tone]}`}>
      <Text className={`text-[11px] font-semibold ${caps ? 'uppercase tracking-wide' : ''} ${FG[tone]}`} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
