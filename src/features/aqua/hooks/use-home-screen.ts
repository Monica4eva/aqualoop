import { router } from 'expo-router';
import { Alert } from 'react-native';

import { PRODUCT_IMAGES } from '@/components/product-image';
import { useAquaStore } from '@/features/aqua/store/aqua-store';
import type { AquaData, ContainerType, Delivery } from '@/features/aqua/types/aqua';
import { dateKey, fmtLongDay, relDay } from '@/features/aqua/utils/dates';
import { CONTAINER_SINGULAR, CONTAINER_TYPES, deliveriesOn, linesText, nextDelivery, productById, stopStatus, upcomingFor } from '@/features/aqua/utils/schedule';

export function imageFor(data: AquaData, d: Pick<Delivery, 'lines'>) {
  const first = d.lines[0] ? productById(data, d.lines[0].productId) : undefined;
  return PRODUCT_IMAGES[first?.image ?? 'water20'];
}

export function emptiesText(counts: Partial<Record<ContainerType, number>>): string {
  const parts = CONTAINER_TYPES.filter((t) => (counts[t] ?? 0) > 0).map((t) => {
    const n = counts[t] ?? 0;
    return `${n} ${CONTAINER_SINGULAR[t]}${n === 1 ? '' : 's'}`;
  });
  return parts.length > 0 ? parts.join(' • ') : 'Nothing waiting';
}

export function useHomeScreen() {
  const data = useAquaStore((s) => s.data);
  const role = useAquaStore((s) => s.role);
  const householdId = useAquaStore((s) => s.householdId);
  const sendMessage = useAquaStore((s) => s.sendMessage);
  const today = dateKey(data.clock);
  const now = data.clock;

  const todays = deliveriesOn(data, today);
  const pendingToday = todays.filter((d) => stopStatus(data, today, d.run, d.householdId) === 'pending').length;
  const waiting = data.reviews.filter((r) => r.status === 'waiting');

  const readyAll: Partial<Record<ContainerType, number>> = {};
  const over: { id: string; label: string; held: number }[] = [];
  Object.entries(data.ledger).forEach(([hid, l]) => {
    let held = 0;
    CONTAINER_TYPES.forEach((t) => {
      readyAll[t] = (readyAll[t] ?? 0) + l[t].ready;
      held += l[t].held;
    });
    if (held > 3) over.push({ id: hid, label: data.households.find((h) => h.id === hid)?.label ?? hid, held });
  });
  over.sort((a, b) => b.held - a.held);

  const household = data.households.find((h) => h.id === householdId);
  const mine = data.ledger[householdId];
  const myReady: Partial<Record<ContainerType, number>> = {};
  CONTAINER_TYPES.forEach((t) => {
    myReady[t] = mine?.[t].ready ?? 0;
  });
  const myReadyTotal = CONTAINER_TYPES.reduce((n, t) => n + (myReady[t] ?? 0), 0);
  const myHeld = CONTAINER_TYPES.reduce((n, t) => n + (mine?.[t].held ?? 0), 0);
  const myUpcoming = upcomingFor(data, householdId, 3);
  const myWaiting = waiting.filter((r) => r.householdId === householdId).length;

  const repeats = data.households
    .filter((h) => h.active && data.standing[h.id]?.status === 'active')
    .map((h) => ({ h, next: nextDelivery(data, h.id) }))
    .filter((x): x is { h: (typeof x)['h']; next: Delivery } => x.next !== null)
    .sort((a, b) => (a.next.date === b.next.date ? a.h.id.localeCompare(b.h.id) : a.next.date.localeCompare(b.next.date)))
    .slice(0, 3);

  const activity = role === 'customer' ? data.activity.filter((a) => a.householdId === householdId) : data.activity;

  const bookPickup = () => {
    if (myReadyTotal === 0) {
      Alert.alert('Nothing to collect yet', 'Mark the empties you have ready on the Containers tab, then book a pickup.');
      return;
    }
    const next = nextDelivery(data, householdId);
    const day = next ? fmtLongDay(next.date).split(' ')[0] : 'tomorrow';
    const words = CONTAINER_TYPES.filter((t) => (myReady[t] ?? 0) > 0)
      .map((t) => {
        const n = myReady[t] ?? 0;
        const name = t === '20L_container' ? 'containers' : t === 'milk_bottle' ? 'milk bottles' : 'crates';
        return `${n} ${n === 1 ? name.replace(/s$/, '') : name}`;
      })
      .join(' and ');
    sendMessage(`Please pick up ${words} on ${day}`);
    router.push('/chat');
  };

  return {
    data,
    role,
    now,
    today,
    todays,
    pendingToday,
    waiting,
    readyAll,
    readyAllTotal: CONTAINER_TYPES.reduce((n, t) => n + (readyAll[t] ?? 0), 0),
    over,
    household,
    myReady,
    myReadyTotal,
    myHeld,
    myUpcoming,
    myWaiting,
    repeats,
    activity: activity.slice(0, 4),
    bookPickup,
    relDay: (key: string) => relDay(key, now),
    linesText: (d: Pick<Delivery, 'lines'>) => linesText(data, d.lines),
  };
}
