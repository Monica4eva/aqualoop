import type { AquaData, ContainerType, Delivery, Line, Product, Returns, RunSlot, StandingOrder } from '@/features/aqua/types/aqua';
import { addDays, dateKey, hourOf, weekday, weeksBetween } from '@/features/aqua/utils/dates';

export const RUN_START: Record<RunSlot, number> = { morning: 8, afternoon: 13 };
export const STOP_MINUTES = 25;
export const DEPOSITS: Record<ContainerType, number> = { '20L_container': 8, milk_bottle: 1, crate: 3 };
export const CONTAINER_NAMES: Record<ContainerType, string> = {
  '20L_container': '20L containers',
  milk_bottle: 'Milk bottles',
  crate: 'Crates',
};
export const CONTAINER_SINGULAR: Record<ContainerType, string> = {
  '20L_container': '20L container',
  milk_bottle: 'milk bottle',
  crate: 'crate',
};
export const CONTAINER_TYPES: ContainerType[] = ['20L_container', 'milk_bottle', 'crate'];

export function runKey(date: string, run: RunSlot): string {
  return `${date}|${run}`;
}

export function productById(data: AquaData, id: string): Product | undefined {
  return data.products.find((p) => p.id === id);
}

export function standingOn(data: AquaData, householdId: string, date: string): StandingOrder | null {
  const s = data.standing[householdId];
  if (!s || s.status !== 'active') return null;
  if (date < s.startDate) return null;
  if (weekday(date) !== s.day) return null;
  if (s.frequency === 'fortnightly' && weeksBetween(s.startDate, date) % 2 !== 0) return null;
  if (s.pause && date >= s.pause.from && date <= s.pause.to) return null;
  return s;
}

export function deliveryFor(data: AquaData, householdId: string, date: string): Delivery | null {
  const o = data.overrides[`${householdId}|${date}`];
  if (o) {
    if (o.skipped) return null;
    const hasReturns = Object.values(o.returns).some((n) => (n ?? 0) > 0);
    if (o.lines.length === 0 && !hasReturns) return null;
    return { householdId, date, run: o.run, lines: o.lines, returns: o.returns, source: 'override' };
  }
  const s = standingOn(data, householdId, date);
  if (!s) return null;
  return { householdId, date, run: s.run, lines: s.lines, returns: {}, source: 'standing' };
}

export function isSkipped(data: AquaData, householdId: string, date: string): boolean {
  return data.overrides[`${householdId}|${date}`]?.skipped === true;
}

export function deliveriesOn(data: AquaData, date: string, run?: RunSlot): Delivery[] {
  const out: Delivery[] = [];
  data.households.forEach((h) => {
    if (!h.active) return;
    const d = deliveryFor(data, h.id, date);
    if (!d) return;
    if (run && d.run !== run) return;
    out.push(d);
  });
  return out;
}

export function runStops(data: AquaData, date: string, run: RunSlot): Delivery[] {
  const list = deliveriesOn(data, date, run);
  const order = data.runMeta[runKey(date, run)]?.order;
  const areaRank = { North: 0, East: 1, South: 2, West: 3 };
  const byArea = [...list].sort((a, b) => {
    const ha = data.households.find((h) => h.id === a.householdId);
    const hb = data.households.find((h) => h.id === b.householdId);
    const r = areaRank[ha?.area ?? 'North'] - areaRank[hb?.area ?? 'North'];
    return r !== 0 ? r : a.householdId.localeCompare(b.householdId);
  });
  if (!order) return byArea;
  return [...byArea].sort((a, b) => {
    const ia = order.indexOf(a.householdId);
    const ib = order.indexOf(b.householdId);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });
}

export function stopStatus(data: AquaData, date: string, run: RunSlot, householdId: string) {
  return data.stops[runKey(date, run)]?.[householdId]?.status ?? 'pending';
}

export function runPassed(now: number, date: string, run: RunSlot): boolean {
  const today = dateKey(now);
  if (date < today) return true;
  if (date > today) return false;
  return hourOf(now) >= RUN_START[run];
}

/** Upcoming deliveries for one household, starting today (today counts until it's delivered). */
export function upcomingFor(data: AquaData, householdId: string, count: number, includeSkipped = false) {
  const today = dateKey(data.clock);
  const out: { date: string; delivery: Delivery | null; skipped: boolean }[] = [];
  for (let i = 0; i < 60 && out.length < count; i += 1) {
    const date = addDays(today, i);
    const d = deliveryFor(data, householdId, date);
    if (d) {
      const status = stopStatus(data, date, d.run, householdId);
      if (status === 'pending') out.push({ date, delivery: d, skipped: false });
      continue;
    }
    if (includeSkipped && isSkipped(data, householdId, date)) out.push({ date, delivery: null, skipped: true });
  }
  return out;
}

export function nextDelivery(data: AquaData, householdId: string): Delivery | null {
  return upcomingFor(data, householdId, 1)[0]?.delivery ?? null;
}

/** Next date the standing order applies, not yet past its run's cutoff-free window. */
export function nextUsualDate(data: AquaData, householdId: string, fromMs: number): string | null {
  const today = dateKey(fromMs);
  for (let i = 0; i < 28; i += 1) {
    const date = addDays(today, i);
    const s = standingOn(data, householdId, date);
    if (!s) continue;
    if (i === 0 && hourOf(fromMs) >= RUN_START[s.run]) continue;
    if (stopStatus(data, date, s.run, householdId) !== 'pending') continue;
    return date;
  }
  return null;
}

export function lineLoad(data: AquaData, lines: Line[]) {
  let normal = 0;
  let chilled = 0;
  lines.forEach((l) => {
    const p = productById(data, l.productId);
    if (!p) return;
    if (p.chilled) chilled += p.load * l.qty;
    else normal += p.load * l.qty;
  });
  return { normal, chilled };
}

export function runLoad(data: AquaData, date: string, run: RunSlot, replace?: { householdId: string; lines: Line[] }) {
  let normal = 0;
  let chilled = 0;
  const list = deliveriesOn(data, date, run).filter((d) => d.householdId !== replace?.householdId);
  const all = replace ? [...list.map((d) => d.lines), replace.lines] : list.map((d) => d.lines);
  all.forEach((lines) => {
    const l = lineLoad(data, lines);
    normal += l.normal;
    chilled += l.chilled;
  });
  return { normal: Math.round(normal * 100) / 100, chilled: Math.round(chilled * 100) / 100 };
}

/** Units booked over the next 7 days and not yet delivered. */
export function reservedOf(data: AquaData, productId: string, exclude?: { householdId: string; date: string }): number {
  const today = dateKey(data.clock);
  let total = 0;
  for (let i = 0; i < 7; i += 1) {
    const date = addDays(today, i);
    deliveriesOn(data, date).forEach((d) => {
      if (exclude && d.householdId === exclude.householdId && d.date === exclude.date) return;
      if (stopStatus(data, date, d.run, d.householdId) !== 'pending') return;
      d.lines.forEach((l) => {
        if (l.productId === productId) total += l.qty;
      });
    });
  }
  return total;
}

export function availableOf(data: AquaData, productId: string, exclude?: { householdId: string; date: string }): number {
  const p = productById(data, productId);
  if (!p) return 0;
  return p.onHand - reservedOf(data, productId, exclude);
}

export function linesText(data: AquaData, lines: Line[]): string {
  if (lines.length === 0) return 'nothing';
  return lines.map((l) => `${l.qty} x ${productById(data, l.productId)?.short ?? l.productId}`).join(', ');
}

export function returnsText(returns: Returns): string {
  return CONTAINER_TYPES.filter((t) => (returns[t] ?? 0) > 0)
    .map((t) => {
      const n = returns[t] ?? 0;
      return `${n} ${n === 1 ? CONTAINER_SINGULAR[t] : `${CONTAINER_SINGULAR[t]}s`}`;
    })
    .join(', ');
}

/** Empties a household is expected to hand back at a stop: what they've marked ready, plus any pickup booked. */
export function expectedReturns(data: AquaData, d: Delivery): Returns {
  const ledger = data.ledger[d.householdId];
  const out: Returns = {};
  CONTAINER_TYPES.forEach((t) => {
    const n = Math.max(d.returns[t] ?? 0, ledger?.[t]?.ready ?? 0);
    if (n > 0) out[t] = n;
  });
  return out;
}

export function containerOf(product: Product): ContainerType | null {
  return product.returnable ? product.container : null;
}

export function sameLines(a: Line[], b: Line[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((l) => b.some((m) => m.productId === l.productId && m.qty === l.qty));
}

export function etaFor(index: number, run: RunSlot): number {
  return RUN_START[run] * 60 + index * STOP_MINUTES;
}

export function fmtMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
