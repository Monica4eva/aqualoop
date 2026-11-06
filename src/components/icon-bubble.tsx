import type { ReactNode } from 'react';
import { View } from 'react-native';

type IconBubbleProps = {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'sky' | 'lagoon' | 'amber' | 'ai' | 'danger' | 'accent' | 'muted';
};

const SIZE = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' } as const;
const TONE = {
  sky: 'bg-sky',
  lagoon: 'bg-lagoon',
  amber: 'bg-amber-soft',
  ai: 'bg-ai-soft',
  danger: 'bg-danger/10',
  accent: 'bg-accent',
  muted: 'bg-border',
} as const;

/** The round tinted disc that holds an icon, as in every row of the design. */
export function IconBubble({ children, size = 'md', tone = 'sky' }: IconBubbleProps) {
  return <View className={`${SIZE[size]} ${TONE[tone]} rounded-full items-center justify-center`}>{children}</View>;
}
