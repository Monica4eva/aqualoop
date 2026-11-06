import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { IconBubble } from '@/components/icon-bubble';
import { Image } from '@/components/image';
import { Panel } from '@/components/panel';
import { PillButton } from '@/components/pill-button';
import { ART } from '@/components/product-image';
import { Pressable } from '@/components/pressable';
import { useAquaStore } from '@/features/aqua/store/aqua-store';
import type { Role } from '@/features/aqua/types/aqua';

const ROLES = [
  { role: 'customer', title: 'Customer', body: 'Order by chat, manage your repeat order and empties.', sf: 'person.fill', ion: 'person' },
  { role: 'owner', title: 'Owner', body: 'Check messages, households, stock and runs.', sf: 'briefcase.fill', ion: 'briefcase' },
  { role: 'driver', title: 'Driver', body: "Today's stops, drops and empties. No messages.", sf: 'box.truck.fill', ion: 'car' },
] as const;

export default function WelcomeScreen() {
  const setRole = useAquaStore((s) => s.setRole);
  const households = useAquaStore((s) => s.data.households);
  const current = useAquaStore((s) => s.householdId);
  const [role, setPick] = useState<Role>('customer');
  const [hid, setHid] = useState(current || 'H07');

  const go = () => {
    setRole(role, role === 'customer' ? hid : undefined);
    router.replace('/');
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-6 pb-safe-offset-6 gap-5">
      <View className="items-center gap-2">
        <Image source={ART.home} className="w-40 h-32" contentFit="contain" />
        <Text className="text-[26px] font-bold text-foreground">AquaLoop</Text>
        <Text className="text-[13px] text-muted text-center">Order. Deliver. Return. Repeat.</Text>
      </View>

      <View className="gap-2">
        <Text className="text-[12px] font-semibold text-muted uppercase tracking-wide">Who's using the app?</Text>
        {ROLES.map((r) => (
          <Pressable key={r.role} onPress={() => setPick(r.role)} accessibilityLabel={r.title}>
            <Panel tone={role === r.role ? 'sky' : 'white'}>
              <View className="flex-row items-center gap-3">
                <IconBubble size="md"><Icon sf={r.sf} ion={r.ion} size={18} /></IconBubble>
                <View className="flex-1 gap-0.5">
                  <Text className="text-[14px] font-semibold text-foreground">{r.title}</Text>
                  <Text className="text-[12px] text-muted">{r.body}</Text>
                </View>
                {role === r.role ? <Icon sf="checkmark.circle.fill" ion="checkmark-circle" size={20} /> : null}
              </View>
            </Panel>
          </Pressable>
        ))}
      </View>

      {role === 'customer' ? (
        <View className="gap-2">
          <Text className="text-[12px] font-semibold text-muted uppercase tracking-wide">Your household</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
            {households.map((h) => (
              <Pressable key={h.id} onPress={() => setHid(h.id)} accessibilityLabel={h.label}>
                <View className={`rounded-full px-3.5 py-2 ${hid === h.id ? 'bg-accent' : 'bg-surface'}`}>
                  <Text className={`text-[12px] font-semibold ${hid === h.id ? 'text-white' : 'text-foreground'}`}>{h.label}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <PillButton label="Continue" next onPress={go} />
      <Text className="text-[11px] text-faint text-center">All households and orders are fictional demo data. No passwords in this demo.</Text>
    </ScrollView>
  );
}
