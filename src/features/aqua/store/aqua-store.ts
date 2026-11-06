import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AquaData, ContainerType, Line, ParsedOrder, Product, Role, RunSlot, Settings, StandingOrder, StopRecord } from '@/features/aqua/types/aqua';
import { addDays, dateKey, fmtLongDay } from '@/features/aqua/utils/dates';
import { advanceClock, applyResult, clone, ingest, markStop, sendOwnerReply } from '@/features/aqua/utils/engine';
import { deliveryFor, linesText, runKey, runStops } from '@/features/aqua/utils/schedule';
import { seedData } from '@/features/aqua/utils/seed';
import { zustandStorage } from '@/lib/storage';

interface AquaState {
  data: AquaData;
  role: Role | null;
  householdId: string;
  lastConfirmedID: string | null;
  setRole: (role: Role | null, householdId?: string) => void;
  sendMessage: (text: string, channel?: 'text' | 'voice', householdId?: string | null) => string;
  shopAdd: (product: Product, qty: number, every: boolean) => string;
  approveReview: (id: string) => void;
  editApprove: (id: string, edit: { lines: Line[]; date: string; run: RunSlot }) => void;
  rejectReview: (id: string, reply: string) => void;
  completeStop: (input: { date: string; run: RunSlot; householdId: string; status: StopRecord['status']; delivered: Line[]; collected: Partial<Record<ContainerType, number>>; damaged: number }) => void;
  setReady: (householdId: string, type: ContainerType, n: number) => void;
  setClock: (ms: number) => void;
  reset: () => void;
  updateStanding: (householdId: string, patch: Partial<StandingOrder>, by: 'owner' | 'customer') => void;
  toggleSkip: (householdId: string, date: string) => void;
  setReminders: (householdId: string, on: boolean) => void;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  restock: (id: string, qty: number) => void;
  setRunLocked: (date: string, run: RunSlot, locked: boolean) => void;
  moveStop: (date: string, run: RunSlot, householdId: string, dir: -1 | 1) => void;
}

const MINUTE = 60_000;

export const useAquaStore = create<AquaState>()(
  persist(
    (set, get) => ({
      data: seedData(),
      role: null,
      householdId: 'H07',
      lastConfirmedID: null,

      setRole: (role, householdId) => set((s) => ({ role, householdId: householdId ?? s.householdId })),

      sendMessage: (text, channel = 'text', householdId) => {
        const s = get();
        const hid = householdId === undefined ? s.householdId : householdId;
        const at = s.data.clock + MINUTE;
        const base = { ...s.data, clock: at };
        const { data, message } = ingest(base, { householdId: hid, text, at, channel });
        set({ data, lastConfirmedID: message.result?.route === 'confirmed' ? message.id : s.lastConfirmedID });
        return message.id;
      },

      shopAdd: (product, qty, every) => {
        const s = get();
        const hid = s.householdId;
        const at = s.data.clock + MINUTE;
        const standing = s.data.standing[hid];
        const text = every
          ? `Add ${qty} x ${product.short} to every delivery`
          : `Add ${qty} x ${product.short} to my next delivery`;
        const kind = {
          water: 'still_water',
          sparkling: product.id.startsWith('tonic') ? 'tonic_water' : 'soda_water',
          flavoured: 'flavoured_water',
          dairy: 'fresh_milk',
        } as const;
        const parsed: ParsedOrder = {
          transcript: text,
          language: 'en',
          intent: 'change',
          items: [{ product: kind[product.category], variant: product.variant, size: product.size, pack: product.pack, quantity: qty }],
          returns: [],
          date_phrase: null,
          run: standing?.run ?? null,
          scope: every ? 'standing' : 'one_off',
          confidence: 1,
          summary: every ? `Add ${qty} x ${product.short} to the standing order.` : `Add ${qty} x ${product.short} to the next delivery.`,
        };
        const { data, message } = ingest({ ...s.data, clock: at }, { householdId: hid, text, at, channel: 'text' }, { parsed, parser: 'Shop' });
        set({ data, lastConfirmedID: message.result?.route === 'confirmed' ? message.id : s.lastConfirmedID });
        return message.result?.route ?? 'owner';
      },

      approveReview: (id) => {
        const d = clone(get().data);
        const r = d.reviews.find((x) => x.id === id);
        if (!r || r.status !== 'waiting') return;
        r.status = 'approved';
        r.resolvedAt = d.clock;
        if (r.householdId) {
          applyResult(d, r.householdId, r.result, 'owner', r.text, d.clock);
          const res = r.result.resolution;
          const when = res.date ? ` on ${fmtLongDay(res.date)}, ${res.run} run` : '';
          const what = res.lines.length > 0 ? `: ${linesText(d, res.lines)}${when}.` : '.';
          const replies: Record<string, string> = {
            cancel: 'Your deliveries are stopped. Thanks for being with us, message any time to start again.',
            complaint: "Sorry about that. We'll make it right on your next delivery.",
            opt_out: 'Done, reminders are off. Your deliveries carry on as normal.',
          };
          sendOwnerReply(d, r.householdId, replies[r.result.parsed.intent] ?? `Confirmed${what}`, d.clock);
        }
        set({ data: d });
      },

      editApprove: (id, edit) => {
        const d = clone(get().data);
        const r = d.reviews.find((x) => x.id === id);
        if (!r || !r.householdId) return;
        const result = {
          ...r.result,
          parsed: { ...r.result.parsed, intent: 'new' as const, scope: 'one_off' as const },
          resolution: { ...r.result.resolution, date: edit.date, run: edit.run, lines: edit.lines, alreadyBooked: false, mode: 'set' as const },
        };
        r.status = 'edited';
        r.resolvedAt = d.clock;
        r.note = `${linesText(d, edit.lines)} on ${fmtLongDay(edit.date)}`;
        applyResult(d, r.householdId, result, 'owner', r.text, d.clock);
        sendOwnerReply(d, r.householdId, `Confirmed: ${linesText(d, edit.lines)} on ${fmtLongDay(edit.date)}, ${edit.run} run.`, d.clock);
        set({ data: d });
      },

      rejectReview: (id, reply) => {
        const d = clone(get().data);
        const r = d.reviews.find((x) => x.id === id);
        if (!r) return;
        r.status = 'rejected';
        r.resolvedAt = d.clock;
        r.note = reply;
        if (reply.trim()) sendOwnerReply(d, r.householdId, reply.trim(), d.clock);
        set({ data: d });
      },

      completeStop: (input) => set((s) => ({ data: markStop(s.data, input) })),

      setReady: (householdId, type, n) => {
        const d = clone(get().data);
        const entry = d.ledger[householdId]?.[type];
        if (!entry) return;
        entry.ready = Math.max(0, Math.min(entry.held, n));
        set({ data: d });
      },

      setClock: (ms) => set((s) => ({ data: advanceClock(s.data, ms) })),

      reset: () => set({ data: seedData(), lastConfirmedID: null }),

      updateStanding: (householdId, patch, by) => {
        const d = clone(get().data);
        const s = d.standing[householdId];
        if (!s) return;
        const old = `${linesText(d, s.lines)} • ${s.frequency} • day ${s.day} • ${s.run}`;
        Object.assign(s, patch);
        const next = `${linesText(d, s.lines)} • ${s.frequency} • day ${s.day} • ${s.run}`;
        if (old !== next) {
          d.seq += 1;
          d.audit.unshift({ id: `a${d.seq}`, householdId, field: 'Standing order', oldValue: old, newValue: next, by, message: null, at: d.clock });
        }
        set({ data: d });
      },

      toggleSkip: (householdId, date) => {
        const d = clone(get().data);
        const key = `${householdId}|${date}`;
        const current = d.overrides[key];
        d.seq += 1;
        if (current?.skipped) {
          delete d.overrides[key];
          d.audit.unshift({ id: `a${d.seq}`, householdId, field: `Delivery ${fmtLongDay(date)}`, oldValue: 'Skipped', newValue: 'Back on', by: 'customer', message: null, at: d.clock });
          set({ data: d });
          return;
        }
        const del = deliveryFor(d, householdId, date);
        d.overrides[key] = { householdId, date, run: del?.run ?? 'morning', lines: [], returns: {}, skipped: true };
        d.audit.unshift({ id: `a${d.seq}`, householdId, field: `Delivery ${fmtLongDay(date)}`, oldValue: del ? linesText(d, del.lines) : 'None', newValue: 'Skipped', by: 'customer', message: null, at: d.clock });
        set({ data: d });
      },

      setReminders: (householdId, on) => {
        const d = clone(get().data);
        const h = d.households.find((x) => x.id === householdId);
        if (!h) return;
        h.reminders = on;
        d.seq += 1;
        d.audit.unshift({ id: `a${d.seq}`, householdId, field: 'Reminders', oldValue: on ? 'Off' : 'On', newValue: on ? 'On' : 'Off', by: get().role === 'owner' ? 'owner' : 'customer', message: null, at: d.clock });
        set({ data: d });
      },

      setSetting: (key, value) => set((s) => ({ data: { ...s.data, settings: { ...s.data.settings, [key]: value } } })),

      updateProduct: (id, patch) =>
        set((s) => ({ data: { ...s.data, products: s.data.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) } })),

      restock: (id, qty) => {
        const d = clone(get().data);
        const p = d.products.find((x) => x.id === id);
        if (!p) return;
        p.onHand += qty;
        if (p.chilled) {
          d.seq += 1;
          d.milkBatches.push({ id: `B-${d.seq}`, productId: id, qty, useBy: addDays(dateKey(d.clock), 7) });
        }
        d.seq += 1;
        d.activity.unshift({ id: `v${d.seq}`, kind: 'restock', title: 'Restocked', detail: `${qty} x ${p.short}`, at: d.clock, householdId: null });
        set({ data: d });
      },

      setRunLocked: (date, run, locked) => {
        const d = clone(get().data);
        const key = runKey(date, run);
        d.runMeta[key] = { ...(d.runMeta[key] ?? { order: null, driver: 'Sam' }), locked };
        set({ data: d });
      },

      moveStop: (date, run, householdId, dir) => {
        const d = clone(get().data);
        const key = runKey(date, run);
        const order = runStops(d, date, run).map((x) => x.householdId);
        const i = order.indexOf(householdId);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= order.length) return;
        [order[i], order[j]] = [order[j], order[i]];
        d.runMeta[key] = { ...(d.runMeta[key] ?? { locked: false, driver: 'Sam' }), order };
        set({ data: d });
      },
    }),
    {
      name: 'aqualoop-v1',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ data: s.data, role: s.role, householdId: s.householdId }),
    },
  ),
);
