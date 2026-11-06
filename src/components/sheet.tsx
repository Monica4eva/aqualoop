import type { ReactNode } from 'react';
import { Modal, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Icon } from '@/components/icon';
import { Pressable } from '@/components/pressable';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/** A native page sheet in the app's own look: sky background, bold title, round close. */
export function Sheet({ visible, onClose, title, subtitle, children }: SheetProps) {
  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAwareScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-6 pb-safe-offset-6 gap-5" bottomOffset={24}>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="text-xl font-bold text-foreground">{title}</Text>
            {subtitle ? <Text className="text-sm text-muted">{subtitle}</Text> : null}
          </View>
          <Pressable onPress={onClose} accessibilityLabel="Close" hitSlop={8}>
            <View className="w-8 h-8 rounded-full bg-sky items-center justify-center">
              <Icon sf="xmark" ion="close" size={14} />
            </View>
          </Pressable>
        </View>
        {children}
      </KeyboardAwareScrollView>
    </Modal>
  );
}
