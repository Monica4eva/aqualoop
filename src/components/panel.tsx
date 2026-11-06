import { Palette } from '@/constants/theme';
import type { ReactNode } from 'react';
import { View } from 'react-native';

type PanelProps = {
  children: ReactNode;
  /** tight: thumbnails/tiles (p-3). normal: content (p-4). list: rows supply their own padding. */
  pad?: 'tight' | 'normal' | 'list';
  tone?: 'white' | 'sky' | 'ai' | 'amber' | 'danger' | 'lagoon';
  grow?: boolean;
  className?: string;
};

const TONE = {
  white: 'bg-surface',
  sky: 'bg-sky',
  ai: 'bg-ai-soft',
  amber: 'bg-amber-soft',
  danger: 'bg-danger/10',
  lagoon: 'bg-lagoon-soft',
} as const;
const PAD = { tight: 'p-3 gap-2', normal: 'p-4 gap-3', list: 'px-4' } as const;

/** The design's white rounded card with a soft blue shadow. */
export function Panel({ children, pad = 'normal', tone = 'white', grow, className = '' }: PanelProps) {
  return (
    <View
      className={`rounded-2xl ${TONE[tone]} ${PAD[pad]} ${grow ? 'flex-1' : ''} ${className}`}
      style={tone === 'white' ? { shadowColor: Palette.accent, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 } : undefined}
    >
      {children}
    </View>
  );
}
