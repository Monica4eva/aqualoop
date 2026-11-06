import type {
  AquaData,
  ChatMessage,
  ContainerType,
  Line,
  MessageResult,
  ParsedItem,
  ParsedOrder,
  Resolution,
  Returns,
  RuleID,
  RunSlot,
  StopRecord,
} from '@/features/aqua/types/aqua';
import {
  addDays,
  cutoffFor,
  dateKey,
  fmtLongDay,
  nextWeekday,
  weekday,
  weekdayName,
} from '@/features/aqua/utils/dates';
import { PARSER_NAME, parseMessage } from '@/features/aqua/utils/parse-message';
import {
  availableOf,
  CONTAINER_TYPES,
  deliveryFor,
  linesText,
  nextDelivery,
  nextUsualDate,
  productById,
  returnsText,
  runKey,
  runLoad,
  sameLines,
} from '@/features/aqua/utils/schedule';

export const HOLDING_REPLY = "Thanks, we've got your message. We'll confirm shortly.";
export const OPT_OUT_REPLY = 'Done, reminders are off. Your deliveries carry on as normal.';

export interface Inbound {
  householdId: string | null;
  text: string;
  at: number;
  channel: 'text' | 'voice';
  phone?: string;
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function nextId(d: AquaData, prefix: string): string {
  d.seq += 1;
  return `${prefix}${d.seq}`;
}

export function productIdFor(item: ParsedItem): string | null {
  switch (item.product) {
    case 'still_water':
      return item.size === '5L' ? 'water_5l' : 'water_20l';
    case 'soda_water':
      return item.pack === '6-pack' ? 'soda_6' : 'soda_1l';
    case 'tonic_water':
      return item.pack === '6-pack' ? 'tonic_6' : 'tonic_1l';
    case 'flavoured_water':
      if (item.variant === 'lemon') return 'flav_lemon';
      if (item.variant === 'berry') return 'flav_berry';
      if (item.variant === 'cucumber_mint') return 'flav_cucumber';
      return null;
    case 'fresh_milk':
      return item.size === '2L' ? 'milk_2l' : 'milk_1l';
    default:
      return null;
  }
}

function resolveDate(data: AquaData, p: ParsedOrder, householdId: string | null, at: number): string | null {
  const today = dateKey(at);
  const phrase = p.date_phrase?.toLowerCase() ?? null;
  const usual = householdId ? nextUsualDate(data, householdId, at) : null;
  if (!phrase) return usual;
  if (phrase === 'today' || phrase === 'tonight') return today;
  if (phrase === 'tomorrow') return addDays(today, 1);
  if (phrase === 'this week') return usual;
  if (phrase === 'next week') {
    if (!usual) return null;
    const mondayNext = nextWeekday(today, 1);
    return usual < mondayNext ? addDays(usual, 7) : usual;
  }
  const idx = DAYS.indexOf(phrase);
  if (idx >= 0) return nextWeekday(today, idx);
  return usual;
}

function mergeLines(base: Line[], incoming: Line[], mode: 'add' | 'set'): Line[] {
  const out = base.map((l) => ({ ...l }));
  incoming.forEach((n) => {
    const hit = out.find((l) => l.productId === n.productId);
    if (!hit) {
      out.push({ ...n });
      return;
    }
    hit.qty = mode === 'add' ? hit.qty + n.qty : n.qty;
  });
  return out.filter((l) => l.qty > 0);
}

function returnsFrom(p: ParsedOrder): Returns {
  const out: Returns = {};
  p.returns.forEach((r) => {
    out[r.container_type] = (out[r.container_type] ?? 0) + r.count;
  });
  return out;
}

export function isDuplicate(data: AquaData, input: Inbound): boolean {
  const norm = input.text.trim().toLowerCase().replace(/\s+/g, ' ');
  return data.messages.some(
    (m) =>
      m.from === 'customer' &&
      m.householdId === input.householdId &&
      m.result?.route !== 'duplicate' &&
      m.text.trim().toLowerCase().replace(/\s+/g, ' ') === norm &&
      input.at - m.at >= 0 &&
      input.at - m.at <= 10 * 60_000,
  );
}

/** Plain logic + review rules R1–R13 + route. Pure: never changes `data`. */
export function processMessage(data: AquaData, input: Inbound, given?: { parsed: ParsedOrder; parser: string }): MessageResult {
  const parsed = given?.parsed ?? parseMessage(input.text);
  const parser = given?.parser ?? PARSER_NAME;
  const rules = new Set<RuleID>();
  const hid = input.householdId;
  const household = hid ? data.households.find((h) => h.id === hid) : undefined;
  const standing = hid ? data.standing[hid] : undefined;
  const askedForHuman = input.text.trim().toUpperCase() === 'HUMAN';
  const mode: 'add' | 'set' = /\b(add|extra|also|plus|more|another)\b/i.test(input.text) ? 'add' : 'set';
  const run: RunSlot = parsed.run ?? standing?.run ?? household?.usualRun ?? 'morning';
  const empty: Resolution = { date: null, run, mode, lines: [], returns: {}, alreadyBooked: false };
  const result = (route: MessageResult['route'], resolution: Resolution): MessageResult => ({
    parsed,
    parser,
    rules: [...rules].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))),
    route,
    resolution,
    askedForHuman,
  });

  if (!given && isDuplicate(data, input)) return result('duplicate', empty);
  if (!household) rules.add('R4');
  if (askedForHuman) return result('owner', empty);
  if (parsed.language !== 'en') {
    rules.add('R7');
    return result('owner', empty);
  }
  if (parsed.confidence < data.settings.threshold) rules.add('R1');
  if (parsed.intent === 'unclear') rules.add('R2');
  if (parsed.intent === 'cancel') rules.add('R3');
  if (parsed.intent === 'complaint') rules.add('R9');
  if (data.settings.nvidiaCheck && parsed.confidence < 0.6) rules.add('R11');

  if (parsed.intent === 'opt_out') return result(rules.size > 0 ? 'owner' : 'opted_out', empty);
  if (parsed.intent === 'query') return result(rules.size > 0 ? 'owner' : 'answered', empty);
  if (['unclear', 'cancel', 'complaint'].includes(parsed.intent)) return result('owner', empty);

  const date = resolveDate(data, parsed, hid, input.at);
  const resolution: Resolution = { ...empty, date };
  if (!date || weekday(date) === 0) {
    if (household) rules.add('R10');
  }

  const isStanding = parsed.intent === 'change' && parsed.scope === 'standing';
  if (date && !isStanding && input.at > cutoffFor(date, data.settings.cutoffHour)) rules.add('R6');

  if (parsed.intent === 'skip') return result(rules.size > 0 ? 'owner' : 'confirmed', resolution);

  const current = hid && date ? deliveryFor(data, hid, date) : null;
  if (parsed.intent === 'return_only') {
    resolution.lines = current?.lines ?? [];
    resolution.returns = returnsFrom(parsed);
    if (current) resolution.run = current.run;
    return result(rules.size > 0 ? 'owner' : 'confirmed', resolution);
  }

  const incoming: Line[] = [];
  parsed.items.forEach((item) => {
    if (item.product === 'flavoured_water' && !item.variant) {
      rules.add('R12');
      return;
    }
    let pid = productIdFor(item);
    if (!pid && !item.product && standing && standing.lines.length === 1) pid = standing.lines[0].productId;
    if (!pid || item.quantity === null) {
      rules.add('R8');
      return;
    }
    incoming.push({ productId: pid, qty: item.quantity });
  });
  if (parsed.items.length === 0) rules.add('R8');

  const base = isStanding ? (standing?.lines ?? []) : (current?.lines ?? []);
  const lines = mergeLines(base, incoming, mode);
  resolution.lines = lines;
  resolution.returns = { ...(current?.returns ?? {}), ...returnsFrom(parsed) };
  if (current && !parsed.run) resolution.run = current.run;

  incoming.forEach((n) => {
    const p = productById(data, n.productId);
    if (!p) return;
    const finalQty = lines.find((l) => l.productId === n.productId)?.qty ?? n.qty;
    const usual = standing?.lines.find((l) => l.productId === n.productId)?.qty ?? 0;
    if (finalQty > p.maxPerOrder || (usual > 0 && finalQty > usual * 2)) rules.add('R5');
    if (hid && date && finalQty > availableOf(data, n.productId, { householdId: hid, date })) rules.add('R13');
  });
  if (date && hid) {
    const load = runLoad(data, date, resolution.run, { householdId: hid, lines });
    if (load.normal > data.settings.normalLimit || load.chilled > data.settings.chilledLimit) rules.add('R13');
  }

  if (current && !isStanding && sameLines(current.lines, lines) && Object.keys(returnsFrom(parsed)).length === 0) {
    resolution.alreadyBooked = true;
  }
  if (isStanding && standing && sameLines(standing.lines, lines)) resolution.alreadyBooked = true;
  return result(rules.size > 0 ? 'owner' : 'confirmed', resolution);
}

export function replyFor(data: AquaData, hid: string | null, r: MessageResult): string | null {
  const { parsed, resolution: res } = r;
  if (r.route === 'duplicate') return null;
  if (r.route === 'owner') return HOLDING_REPLY;
  if (r.route === 'opted_out') return OPT_OUT_REPLY;
  if (r.route === 'answered') {
    const next = hid ? nextDelivery(data, hid) : null;
    if (!next) return 'You have no deliveries booked at the moment. Message us to set one up.';
    return `Your next delivery: ${linesText(data, next.lines)} on ${fmtLongDay(next.date)}, ${next.run} run.`;
  }
  const day = res.date ? fmtLongDay(res.date) : '';
  if (parsed.intent === 'skip') return `Skipped: no delivery on ${day}. Your usual order carries on after that.`;
  if (parsed.intent === 'return_only') return `Pickup booked: we'll collect ${returnsText(res.returns)} on ${day}, ${res.run} run.`;
  if (res.alreadyBooked) return `That's already booked: ${linesText(data, res.lines)} on ${day}, ${res.run} run.`;
  if (parsed.intent === 'change' && parsed.scope === 'standing' && res.date) {
    return `Updated: from ${day}, every ${weekdayName(weekday(res.date))}: ${linesText(data, res.lines)}, ${res.run} run.`;
  }
  const back = returnsText(res.returns);
  return `Confirmed: ${linesText(data, res.lines)} on ${day}, ${res.run} run.${back ? ` We'll collect ${back}.` : ''}`;
}

function audit(d: AquaData, householdId: string, field: string, oldValue: string, newValue: string, by: 'system' | 'owner' | 'customer', message: string | null, at: number) {
  d.audit.unshift({ id: nextId(d, 'a'), householdId, field, oldValue, newValue, by, message, at });
}

function activity(d: AquaData, kind: AquaData['activity'][number]['kind'], title: string, detail: string, at: number, householdId: string | null) {
  d.activity.unshift({ id: nextId(d, 'v'), kind, title, detail, at, householdId });
  d.activity = d.activity.slice(0, 60);
}

/** Apply a confirmed (or owner-approved) result to the order book. Mutates `d`. */
export function applyResult(d: AquaData, hid: string, r: MessageResult, by: 'system' | 'owner', text: string, at: number) {
  const { parsed, resolution: res } = r;
  const label = d.households.find((h) => h.id === hid)?.label ?? hid;
  if (parsed.intent === 'opt_out') {
    const h = d.households.find((x) => x.id === hid);
    if (h) h.reminders = false;
    audit(d, hid, 'Reminders', 'On', 'Off', by === 'owner' ? 'owner' : 'customer', text, at);
    return;
  }
  if (parsed.intent === 'cancel') {
    const s = d.standing[hid];
    if (s) s.status = 'ended';
    audit(d, hid, 'Standing order', 'Active', 'Ended', 'owner', text, at);
    activity(d, 'review', 'Standing order ended', label, at, hid);
    return;
  }
  if (!res.date || res.alreadyBooked) return;
  const key = `${hid}|${res.date}`;
  const before = deliveryFor(d, hid, res.date);
  if (parsed.intent === 'skip') {
    d.overrides[key] = { householdId: hid, date: res.date, run: before?.run ?? res.run, lines: [], returns: {}, skipped: true };
    audit(d, hid, `Delivery ${fmtLongDay(res.date)}`, before ? linesText(d, before.lines) : 'None', 'Skipped', by === 'owner' ? 'owner' : 'customer', text, at);
    activity(d, 'skipped', 'Delivery skipped', `${label} • ${fmtLongDay(res.date)}`, at, hid);
    return;
  }
  if (parsed.intent === 'change' && parsed.scope === 'standing') {
    const s = d.standing[hid];
    if (!s) return;
    const old = linesText(d, s.lines);
    s.lines = res.lines;
    s.day = weekday(res.date);
    s.run = res.run;
    s.status = 'active';
    audit(d, hid, 'Standing order', old, linesText(d, res.lines), by === 'owner' ? 'owner' : 'customer', text, at);
    activity(d, 'confirmed', 'Standing order updated', `${label} • ${linesText(d, res.lines)}`, at, hid);
    return;
  }
  d.overrides[key] = { householdId: hid, date: res.date, run: res.run, lines: res.lines, returns: res.returns, skipped: false };
  const field = parsed.intent === 'return_only' ? `Pickup ${fmtLongDay(res.date)}` : `Delivery ${fmtLongDay(res.date)}`;
  const newValue = parsed.intent === 'return_only' ? returnsText(res.returns) : linesText(d, res.lines);
  audit(d, hid, field, before ? linesText(d, before.lines) : 'None', newValue, by === 'owner' ? 'owner' : 'customer', text, at);
  activity(
    d,
    parsed.intent === 'return_only' ? 'collected' : 'confirmed',
    parsed.intent === 'return_only' ? 'Pickup booked' : 'Order confirmed',
    `${newValue} • ${label}`,
    at,
    hid,
  );
}

/** A message arriving: stored, processed, replied to, applied or queued. Mutates and returns `d`. */
export function ingest(src: AquaData, input: Inbound, given?: { parsed: ParsedOrder; parser: string }): { data: AquaData; message: ChatMessage } {
  const d = clone(src);
  const result = processMessage(d, input, given);
  const message: ChatMessage = {
    id: nextId(d, 'm'),
    householdId: input.householdId,
    from: 'customer',
    text: input.text,
    at: input.at,
    channel: input.channel,
    result,
  };
  d.messages.push(message);
  const reply = replyFor(d, input.householdId, result);
  if (result.route === 'confirmed' || result.route === 'opted_out') {
    if (input.householdId) applyResult(d, input.householdId, result, 'system', input.text, input.at);
  }
  if (result.route === 'owner') {
    const h = d.households.find((x) => x.id === input.householdId);
    d.reviews.unshift({
      id: nextId(d, 'r'),
      messageId: message.id,
      householdId: input.householdId,
      phone: h?.phone ?? input.phone ?? '+1 555 0100',
      text: input.text,
      channel: input.channel,
      at: input.at,
      result,
      status: 'waiting',
      note: null,
      resolvedAt: null,
    });
    activity(d, 'review', 'Sent to owner checks', `${h?.label ?? 'Unknown number'} • "${input.text.slice(0, 40)}"`, input.at, input.householdId);
  }
  if (reply) {
    d.messages.push({ id: nextId(d, 'm'), householdId: input.householdId, from: 'aqualoop', text: reply, at: input.at + 1000, channel: 'text', result: null });
  }
  return { data: d, message };
}

export function sendOwnerReply(d: AquaData, hid: string | null, text: string, at: number) {
  d.messages.push({ id: nextId(d, 'm'), householdId: hid, from: 'aqualoop', text, at, channel: 'text', result: null });
}

/** Moving the demo clock forward fires reminders at reminderHour the day before each delivery. */
export function advanceClock(src: AquaData, to: number): AquaData {
  const d = clone(src);
  const from = d.clock;
  d.clock = to;
  if (to <= from) return d;
  const startDay = dateKey(from);
  const endDay = dateKey(to);
  for (let day = startDay; day <= endDay; day = addDays(day, 1)) {
    const fire = Date.parse(`${day}T00:00:00Z`) + d.settings.reminderHour * 3_600_000;
    if (fire <= from || fire > to) continue;
    const tomorrow = addDays(day, 1);
    d.households.forEach((h) => {
      if (!h.active || !h.reminders) return;
      const del = deliveryFor(d, h.id, tomorrow);
      if (!del || del.lines.length === 0) return;
      const key = `${h.id}|${tomorrow}`;
      if (d.remindersSent.includes(key)) return;
      d.remindersSent.push(key);
      const cutoff = d.settings.cutoffHour % 12 === 0 ? 12 : d.settings.cutoffHour % 12;
      sendOwnerReply(
        d,
        h.id,
        `Reminder: ${linesText(d, del.lines)} tomorrow, ${del.run} run. Need a change? Reply before ${cutoff} ${d.settings.cutoffHour < 12 ? 'AM' : 'PM'}.`,
        fire,
      );
      activity(d, 'reminder', 'Reminder sent', `${h.label} • ${linesText(d, del.lines)}`, fire, h.id);
    });
  }
  return d;
}

export function markStop(
  src: AquaData,
  input: { date: string; run: RunSlot; householdId: string; status: StopRecord['status']; delivered: Line[]; collected: Returns; damaged: number },
): AquaData {
  const d = clone(src);
  const key = runKey(input.date, input.run);
  const prev = d.stops[key]?.[input.householdId];
  if (prev && prev.status !== 'pending') return d;
  d.stops[key] = d.stops[key] ?? {};
  d.stops[key][input.householdId] = {
    status: input.status,
    delivered: input.delivered,
    collected: input.collected,
    damaged: input.damaged,
    at: d.clock,
  };
  const label = d.households.find((h) => h.id === input.householdId)?.label ?? input.householdId;
  const ledger = d.ledger[input.householdId];
  input.delivered.forEach((l) => {
    const p = productById(d, l.productId);
    if (!p) return;
    p.onHand = Math.max(0, p.onHand - l.qty);
    if (p.chilled) {
      let left = l.qty;
      d.milkBatches
        .filter((b) => b.productId === p.id)
        .sort((a, b) => a.useBy.localeCompare(b.useBy))
        .forEach((b) => {
          const take = Math.min(b.qty, left);
          b.qty -= take;
          left -= take;
        });
      d.milkBatches = d.milkBatches.filter((b) => b.qty > 0);
    }
    const c: ContainerType | null = p.returnable ? p.container : null;
    if (c && ledger) ledger[c].held += l.qty;
  });
  CONTAINER_TYPES.forEach((t) => {
    if (!ledger) return;
    const n = input.collected[t] ?? 0;
    const dmg = t === '20L_container' ? input.damaged : 0;
    ledger[t].held = Math.max(0, ledger[t].held - n - dmg);
    ledger[t].ready = Math.max(0, ledger[t].ready - n - dmg);
    ledger[t].damaged += dmg;
  });
  const backText = returnsText(input.collected);
  if (input.status === 'not_home') {
    activity(d, 'review', 'Not home', `${label} • nothing dropped`, d.clock, input.householdId);
    return d;
  }
  activity(d, 'delivered', input.status === 'partial' ? 'Partly delivered' : 'Delivered', `${linesText(d, input.delivered)} • ${label}`, d.clock, input.householdId);
  if (backText) activity(d, 'returned', 'Returned', `${backText}${input.damaged > 0 ? `, ${input.damaged} damaged` : ''} • ${label}`, d.clock + 1, input.householdId);
  return d;
}
