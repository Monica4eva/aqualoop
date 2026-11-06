import { router } from 'expo-router';
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
import { Stepper } from '@/components/stepper';
import { ActivityRow } from '@/features/aqua/components/activity-row';
import { OrderRow } from '@/features/aqua/components/order-row';
import { StatTile } from '@/features/aqua/components/stat-tile';
import { emptiesText, useHomeScreen } from '@/features/aqua/hooks/use-home-screen';
import { useRun } from '@/features/aqua/hooks/use-run';
import { useAquaStore } from '@/features/aqua/store/aqua-store';
import type { ContainerType } from '@/features/aqua/types/aqua';
import { CONTAINER_NAMES, CONTAINER_TYPES, DEPOSITS, expectedReturns, returnsText } from '@/features/aqua/utils/schedule';

const ART_OF: Record<ContainerType, number> = { '20L_container': ART.jug, milk_bottle: ART.milkJug, crate: ART.crate };

export default function ContainersScreen() {
  const home = useHomeScreen();
  const data = home.data;
  const role = home.role;
  const hid = useAquaStore((s) => s.householdId);
  const setReady = useAquaStore((s) => s.setReady);
  const run = useRun();
  const cur = data.settings.currency;
  const owner = role === 'owner';
  const driver = role === 'driver';
  const customer = role === 'customer';

  const totals = CONTAINER_TYPES.map((t) => {
    let held = 0;
    let ready = 0;
    let damaged = 0;
    Object.values(data.ledger).forEach((l) => {
      held += l[t].held;
      ready += l[t].ready;
      damaged += l[t].damaged;
    });
    return { t, held, ready, damaged };
  });
  const mine = data.ledger[hid];
  const sum = (f: (x: (typeof totals)[number]) => number) => totals.reduce((n, x) => n + f(x), 0);
  const myHeld = CONTAINER_TYPES.reduce((n, t) => n + (mine?.[t].held ?? 0), 0);
  const myReady = CONTAINER_TYPES.reduce((n, t) => n + (mine?.[t].ready ?? 0), 0);
  const myDeposit = CONTAINER_TYPES.reduce((n, t) => n + (mine?.[t].held ?? 0) * DEPOSITS[t], 0);
  const myReturned = data.activity.filter((a) => a.householdId === hid && a.kind === 'returned').length;
  const containerActivity = data.activity
    .filter((a) => (a.kind === 'returned' || a.kind === 'collected') && (!customer || a.householdId === hid))
    .slice(0, 4);
  const collectList = run.stops
    .filter((s) => s.status === 'pending')
    .map((s) => ({ s, back: returnsText(expectedReturns(data, s.delivery)) }))
    .filter((x) => x.back);

  const stats = customer
    ? [
        { sf: 'house.fill', ion: 'home', value: String(myHeld), label: 'At home', sub: 'Containers you have' },
        { sf: 'arrow.uturn.backward', ion: 'return-up-back', value: String(myReady), label: 'Ready', sub: 'Waiting for pickup' },
        { sf: 'checkmark.circle.fill', ion: 'checkmark-circle', value: String(myReturned), label: 'Returns', sub: 'Pickups so far' },
        { sf: 'banknote', ion: 'cash-outline', value: `${cur}${myDeposit}`, label: 'Deposits', sub: 'Back when returned' },
      ] as const
    : [
        { sf: 'house.fill', ion: 'home', value: String(sum((x) => x.held)), label: 'Out', sub: 'With customers' },
        { sf: 'arrow.uturn.backward', ion: 'return-up-back', value: String(sum((x) => x.ready)), label: 'Ready', sub: 'To collect' },
        { sf: 'exclamationmark.triangle.fill', ion: 'warning', value: String(home.over.length), label: 'Over 3', sub: 'Households holding' },
        { sf: 'xmark.octagon.fill', ion: 'close-circle', value: String(sum((x) => x.damaged)), label: 'Damaged', sub: 'Logged by drivers' },
      ] as const;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-22 gap-5">
      <ScreenHeader title="Containers" subtitle={customer ? "Track what you have and what's returning" : 'Every container, where it is'} />

      <HeroCard
        eyebrow={<Text className="text-[12px] font-semibold text-lagoon">Return • Reuse • Reduce</Text>}
        title="Every container comes back."
        body="Keep track of your bottles and crates so nothing gets lost."
        art={ART.containers}
        artWidth={140}
        artRatio={1}
      >
        <PillButton label="Learn how it works" next onPress={() => router.push('/how-it-works')} />
      </HeroCard>

      <View className="flex-row gap-2">
        {stats.map((s) => (
          <StatTile
            key={s.label}
            icon={<IconBubble size="sm"><Icon sf={s.sf} ion={s.ion} size={14} /></IconBubble>}
            value={s.value}
            label={s.label}
            sub={s.sub}
          />
        ))}
      </View>

      {customer && myHeld > 3 ? (
        <Panel tone="amber">
          <View className="flex-row items-center gap-3">
            <Icon sf="exclamationmark.triangle.fill" ion="warning" size={18} color="amber" />
            <Text className="flex-1 text-[12px] text-foreground">You have {myHeld} empties at home. Mark them ready and we'll take them on the next run.</Text>
          </View>
        </Panel>
      ) : null}

      <View className="gap-3">
        <SectionHeader title={customer ? 'Your Containers' : 'All Containers'} />
        <Panel pad="list">
          {CONTAINER_TYPES.map((t, i) => {
            const held = customer ? (mine?.[t].held ?? 0) : (totals[i]?.held ?? 0);
            const ready = customer ? (mine?.[t].ready ?? 0) : (totals[i]?.ready ?? 0);
            return (
              <View key={t}>
                {i > 0 ? <Divider inset="thumb" /> : null}
                <OrderRow
                  image={ART_OF[t]}
                  title={CONTAINER_NAMES[t]}
                  detail={`Returnable • ${cur}${DEPOSITS[t]} deposit`}
                  sub={customer ? `${ready} ready to return` : `${ready} ready to collect`}
                  right={
                    <View className="items-end gap-1.5">
                      <Chip label={customer ? `${held} in your possession` : `${held} out`} tone={held > 3 ? 'warning' : 'accent'} />
                      {customer ? <Stepper size="sm" value={ready} min={0} max={held} onChange={(n) => setReady(hid, t, n)} /> : null}
                    </View>
                  }
                />
              </View>
            );
          })}
        </Panel>
        {customer ? (
          <View className="flex-row items-center justify-between gap-3">
            <Text className="flex-1 text-[11px] text-muted">{emptiesText(home.myReady)} marked ready</Text>
            <PillButton size="sm" label="Book a pickup" next onPress={home.bookPickup} />
          </View>
        ) : null}
      </View>

      {owner ? (
        <View className="gap-3">
          <SectionHeader title="Holding more than 3" />
          <Panel pad="list">
            {home.over.length === 0 ? <View className="py-4"><Text className="text-[13px] text-muted">Nobody is holding more than 3 empties.</Text></View> : null}
            {home.over.map((o, i) => (
              <View key={o.id}>
                {i > 0 ? <Divider inset="thumb" /> : null}
                <OrderRow
                  image={ART.jug}
                  title={o.label}
                  detail={`${o.held} empties at home`}
                  sub={emptiesText(Object.fromEntries(CONTAINER_TYPES.map((t) => [t, data.ledger[o.id]?.[t].ready ?? 0])))}
                  badge={<Chip label="Alert" tone="warning" />}
                  onPress={() => router.push({ pathname: '/household/[id]', params: { id: o.id } })}
                />
              </View>
            ))}
          </Panel>
        </View>
      ) : null}

      {driver ? (
        <View className="gap-3">
          <SectionHeader title="To collect today" />
          <Panel pad="list">
            {collectList.length === 0 ? <View className="py-4"><Text className="text-[13px] text-muted">No empties left to collect on this run.</Text></View> : null}
            {collectList.map(({ s, back }, i) => (
              <View key={s.delivery.householdId}>
                {i > 0 ? <Divider inset="thumb" /> : null}
                <OrderRow
                  image={ART.jug}
                  title={`${s.index + 1}. ${s.household?.label ?? ''}`}
                  detail={back}
                  sub={`ETA ${s.eta}`}
                  onPress={() => router.push({ pathname: '/stop/[hid]', params: { hid: s.delivery.householdId, date: run.date, run: run.run } })}
                />
              </View>
            ))}
          </Panel>
        </View>
      ) : null}

      <View className="gap-3">
        <SectionHeader title="Container Activity" />
        <Panel pad="list">
          {containerActivity.length === 0 ? <View className="py-4"><Text className="text-[13px] text-muted">No returns yet.</Text></View> : null}
          {containerActivity.map((a, i) => (
            <View key={a.id}>
              {i > 0 ? <Divider inset="icon" /> : null}
              <ActivityRow item={a} now={data.clock} />
            </View>
          ))}
        </Panel>
      </View>
    </ScrollView>
  );
}
