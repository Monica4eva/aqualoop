import { useAquaStore } from '@/features/aqua/store/aqua-store';
import type { RunSlot } from '@/features/aqua/types/aqua';
import { dateKey, hourOf } from '@/features/aqua/utils/dates';
import { etaFor, fmtMinutes, RUN_START, runKey, runLoad, runStops, stopStatus } from '@/features/aqua/utils/schedule';

export function defaultRun(now: number): RunSlot {
  return hourOf(now) >= RUN_START.afternoon ? 'afternoon' : 'morning';
}

/** Everything about one delivery run: stops in order with status and ETA, progress and van load. */
export function useRun(date?: string, run?: RunSlot) {
  const data = useAquaStore((s) => s.data);
  const d = date ?? dateKey(data.clock);
  const r = run ?? defaultRun(data.clock);
  const meta = data.runMeta[runKey(d, r)];
  const stops = runStops(data, d, r).map((delivery, i) => {
    const h = data.households.find((x) => x.id === delivery.householdId);
    const status = stopStatus(data, d, r, delivery.householdId);
    return { delivery, household: h, status, index: i, eta: fmtMinutes(etaFor(i, r)) };
  });
  const done = stops.filter((s) => s.status !== 'pending').length;
  const next = stops.find((s) => s.status === 'pending') ?? null;
  const load = runLoad(data, d, r);
  const nowMins = hourOf(data.clock) * 60 + new Date(data.clock).getUTCMinutes();
  const nextMins = next ? etaFor(next.index, r) : 0;
  const isToday = d === dateKey(data.clock);
  return {
    data,
    date: d,
    run: r,
    locked: meta?.locked ?? false,
    driver: meta?.driver ?? 'Sam',
    stops,
    done,
    left: stops.length - done,
    progress: stops.length === 0 ? 0 : done / stops.length,
    next,
    arrivingIn: next && isToday ? Math.max(5, nextMins - nowMins) : null,
    started: fmtMinutes(RUN_START[r] * 60),
    finish: fmtMinutes(etaFor(stops.length, r)),
    load,
    limits: { normal: data.settings.normalLimit, chilled: data.settings.chilledLimit },
    runNumber: `${d.slice(5).replace('-', '')}-${r === 'morning' ? 'A' : 'B'}`,
  };
}
