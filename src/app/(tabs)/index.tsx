import { Redirect, router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Divider } from '@/components/divider';
import { HeroCard } from '@/components/hero-card';
import { Icon } from '@/components/icon';
import { IconBubble } from '@/components/icon-bubble';
import { Panel } from '@/components/panel';
import { PillButton } from '@/components/pill-button';
import { ART } from '@/components/product-image';
import { ScreenHeader } from '@/components/screen-header';
import { SectionHeader } from '@/components/section-header';
import { TileLink } from '@/components/tile-link';
import { ActivityRow } from '@/features/aqua/components/activity-row';
import { DriverHome } from '@/features/aqua/components/driver-home';
import { OrderRow } from '@/features/aqua/components/order-row';
import { emptiesText, imageFor, useHomeScreen } from '@/features/aqua/hooks/use-home-screen';

function Eyebrow({ label, sf, ion }: { label: string; sf: 'message.fill' | 'person.fill.checkmark'; ion: 'chatbubble-ellipses' | 'shield-checkmark' }) {
  return (
    <View className="flex-row items-center gap-2">
      <Icon sf={sf} ion={ion} size={18} />
      <Text className="text-[14px] font-semibold text-accent">{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const s = useHomeScreen();
  if (!s.role) return <Redirect href="/welcome" />;
  if (s.role === 'driver') return <DriverHome />;
  const owner = s.role === 'owner';

  const subtitle = owner
    ? `${s.todays.length} deliveries • ${s.waiting.length} to check`
    : `${s.myUpcoming.length} deliveries • ${s.myWaiting} pending`;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-22 gap-5">
      <ScreenHeader title="Today's Orders" subtitle={subtitle} />

      {owner ? (
        <HeroCard
          eyebrow={<Eyebrow label="Owner checks" sf="person.fill.checkmark" ion="shield-checkmark" />}
          title={s.waiting.length > 0 ? `${s.waiting.length} messages need you` : 'All caught up'}
          body={s.waiting.length > 0 ? 'Read each one, then approve, edit or reply.' : 'Every message has been confirmed or answered.'}
          art={ART.home}
          artWidth={150}
          artRatio={422 / 390}
        >
          <PillButton label={s.waiting.length > 0 ? 'Open checks' : 'See history'} next onPress={() => router.push('/review')} icon={<Icon sf="checklist" ion="list" size={16} color="white" />} />
        </HeroCard>
      ) : (
        <HeroCard
          eyebrow={<Eyebrow label="Chat & Order" sf="message.fill" ion="chatbubble-ellipses" />}
          title="Water & Milk delivered to you"
          body="Tap to chat, place a new order or get help."
          art={ART.home}
          artWidth={150}
          artRatio={422 / 390}
        >
          <PillButton label="Start a chat" next onPress={() => router.push('/chat')} icon={<Icon sf="message" ion="chatbubble-outline" size={16} color="white" />} />
        </HeroCard>
      )}

      <View className="flex-row gap-3">
        <TileLink
          icon={<IconBubble size="lg"><Icon sf="arrow.triangle.2.circlepath" ion="repeat" size={20} /></IconBubble>}
          title={owner ? 'Repeat Orders' : 'Repeat Order'}
          subtitle={owner ? `${s.data.households.length} households` : 'Save time, order again'}
          onPress={() => router.push(owner ? '/households' : '/my-order')}
        />
        <TileLink
          icon={<IconBubble size="lg"><Icon sf="waterbottle" ion="water-outline" size={20} /></IconBubble>}
          title="Empty Containers"
          subtitle={`${owner ? s.readyAllTotal : s.myReadyTotal} need to be collected`}
          onPress={() => router.push('/containers')}
        />
      </View>

      <View className="gap-3">
        <SectionHeader title="Repeat Orders" onAction={() => router.push(owner ? '/households' : '/my-order')} />
        <Panel pad="list">
          {owner
            ? s.repeats.map(({ h, next }, i) => (
                <View key={h.id}>
                  {i > 0 ? <Divider inset="thumb" /> : null}
                  <OrderRow
                    image={imageFor(s.data, next)}
                    title={h.label}
                    detail={s.linesText(next)}
                    sub={`Next delivery: ${s.relDay(next.date)}`}
                    badge={<Chip label={next.source === 'standing' ? 'Repeats' : 'Changed'} tone={next.source === 'standing' ? 'accent' : 'warning'} />}
                    onPress={() => router.push({ pathname: '/household/[id]', params: { id: h.id } })}
                  />
                </View>
              ))
            : null}
          {!owner && s.myUpcoming.length === 0 ? (
            <View className="py-4"><Text className="text-[13px] text-muted">No deliveries booked. Start a chat to set one up.</Text></View>
          ) : null}
          {!owner
            ? s.myUpcoming.slice(0, 2).map(({ date, delivery }, i) =>
                delivery ? (
                  <View key={date}>
                    {i > 0 ? <Divider inset="thumb" /> : null}
                    <OrderRow
                      image={imageFor(s.data, delivery)}
                      title={s.household?.label ?? 'Your order'}
                      detail={s.linesText(delivery)}
                      sub={`Next delivery: ${s.relDay(date)}, ${delivery.run}`}
                      badge={<Chip label={delivery.source === 'standing' ? 'Repeats' : 'Changed'} tone={delivery.source === 'standing' ? 'accent' : 'warning'} />}
                      onPress={() => router.push('/my-order')}
                    />
                  </View>
                ) : null,
              )
            : null}
        </Panel>
      </View>

      <View className="gap-3">
        <SectionHeader title="Empty Containers" onAction={() => router.push('/containers')} />
        <Panel>
          <View className="flex-row items-center gap-3">
            <IconBubble size="lg"><Icon sf="waterbottle" ion="water-outline" size={22} /></IconBubble>
            <View className="flex-1 gap-0.5">
              <Text className="text-[14px] font-semibold text-foreground">
                {owner ? s.readyAllTotal : s.myReadyTotal} containers to be collected
              </Text>
              <Text className="text-[11px] text-muted" numberOfLines={2}>{emptiesText(owner ? s.readyAll : s.myReady)}</Text>
            </View>
            <PillButton
              size="sm"
              label={owner ? 'View holders' : 'Schedule pickup'}
              next
              onPress={owner ? () => router.push('/containers') : s.bookPickup}
            />
          </View>
          {owner && s.over.length > 0 ? (
            <View className="gap-2">
              <Divider />
              {s.over.slice(0, 2).map((o) => (
                <View key={o.id} className="flex-row items-center gap-2">
                  <Icon sf="exclamationmark.triangle.fill" ion="warning" size={14} color="amber" />
                  <Text className="text-[12px] text-foreground flex-1">{o.label} is holding {o.held} empties</Text>
                </View>
              ))}
            </View>
          ) : null}
          {!owner && s.myHeld > 3 ? (
            <View className="flex-row items-center gap-2">
              <Icon sf="exclamationmark.triangle.fill" ion="warning" size={14} color="amber" />
              <Text className="text-[12px] text-foreground flex-1">You have {s.myHeld} empties at home. Book a pickup so they can be refilled.</Text>
            </View>
          ) : null}
        </Panel>
      </View>

      <View className="gap-3">
        <SectionHeader title="Recent Activity" onAction={owner ? () => router.push('/households') : undefined} />
        <Panel pad="list">
          {s.activity.length === 0 ? <View className="py-4"><Text className="text-[13px] text-muted">Nothing yet. Your deliveries and pickups show up here.</Text></View> : null}
          {s.activity.map((a, i) => (
            <View key={a.id}>
              {i > 0 ? <Divider inset="icon" /> : null}
              <ActivityRow item={a} now={s.now} />
            </View>
          ))}
        </Panel>
      </View>
    </ScrollView>
  );
}
