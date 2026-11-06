import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { NextMark } from '@/components/next-mark';
import { Pressable } from '@/components/pressable';

type PillButtonProps = {
  label: string;
  onPress: () => void;
  /** Leading icon. */
  icon?: ReactNode;
  /** filled: blue pill with white text (the picture's CTAs). soft: sky pill with blue text. */
  variant?: 'filled' | 'soft' | 'danger' | 'success';
  size?: 'sm' | 'md';
  /** Show the trailing caret. */
  next?: boolean;
  disabled?: boolean;
  grow?: boolean;
};

const BG = { filled: 'bg-accent', soft: 'bg-sky', danger: 'bg-danger/10', success: 'bg-lagoon' } as const;
const FG = { filled: 'text-white', soft: 'text-accent', danger: 'text-danger', success: 'text-white' } as const;

/** The rounded pill button from the design ("Start a chat ›", "Schedule pickup ›"). */
export function PillButton({ label, onPress, icon, variant = 'filled', size = 'md', next, disabled, grow }: PillButtonProps) {
  const pad = size === 'md' ? 'px-5 py-3' : 'px-3.5 py-2';
  const text = size === 'md' ? 'text-sm' : 'text-xs';
  return (
    <Pressable onPress={onPress} isDisabled={disabled} className={grow ? 'flex-1' : 'self-start'}>
      <View className={`flex-row items-center justify-center gap-2 rounded-full ${pad} ${BG[variant]} ${disabled ? 'opacity-40' : ''}`}>
        {icon}
        <Text className={`${text} font-semibold ${FG[variant]}`}>{label}</Text>
        {next ? <NextMark tone={variant === 'filled' || variant === 'success' ? 'white' : 'accent'} /> : null}
      </View>
    </Pressable>
  );
}
