import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useThemeColor } from 'heroui-native';

import { Palette } from '@/constants/theme';
import { useAquaStore } from '@/features/aqua/store/aqua-store';

// Every Trigger keeps `disableAutomaticContentInsets`: the screens' safe-area classes are
// the one inset mechanism (see the design-system notes in AGENTS.md).
export default function AppTabs() {
  const accent = useThemeColor('accent');
  const role = useAquaStore((s) => s.role);
  const driver = role === 'driver';
  return (
    <NativeTabs backgroundColor={Palette.background} tintColor={accent}>
      <NativeTabs.Trigger name="index" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="catalogue" disableAutomaticContentInsets hidden={driver}>
        <NativeTabs.Trigger.Label>Catalogue</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.grid.2x2.fill" md="grid_view" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="deliveries" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Deliveries</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="box.truck.fill" md="local_shipping" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="containers" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Containers</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="waterbottle.fill" md="water_drop" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
