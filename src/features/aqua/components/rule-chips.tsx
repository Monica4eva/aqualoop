import { Alert, Text, View } from 'react-native';

import { Pressable } from '@/components/pressable';
import type { RuleID } from '@/features/aqua/types/aqua';
import { RULE_TEXT } from '@/features/aqua/utils/rules';

/** Each rule that sent a message to the owner; tap one to read why. */
export function RuleChips({ rules }: { rules: RuleID[] }) {
  if (rules.length === 0) return null;
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {rules.map((r) => (
        <Pressable key={r} onPress={() => Alert.alert(`${r} · ${RULE_TEXT[r].title}`, RULE_TEXT[r].why)} accessibilityLabel={`${RULE_TEXT[r].title}. Why?`}>
          <View className="flex-row items-center gap-1 rounded-full bg-amber-soft px-2 py-0.5">
            <Text className="text-[11px] font-semibold text-amber">{r}</Text>
            <Text className="text-[11px] text-foreground">{RULE_TEXT[r].title}</Text>
            <Text className="text-[11px] font-semibold text-amber">?</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
