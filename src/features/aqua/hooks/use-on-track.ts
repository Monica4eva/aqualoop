import { useAquaStore } from '@/features/aqua/store/aqua-store';

/** Share of finished stops that were fully delivered (Delivered vs Partly / Not home). */
export function useOnTrack(): number {
  const stops = useAquaStore((s) => s.data.stops);
  let done = 0;
  let good = 0;
  Object.values(stops).forEach((run) =>
    Object.values(run).forEach((r) => {
      if (r.status === 'pending') return;
      done += 1;
      if (r.status === 'delivered') good += 1;
    }),
  );
  if (done === 0) return 100;
  return Math.round((good / done) * 100);
}
