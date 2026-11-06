import { Chip, type ChipTone } from '@/components/chip';
import type { Route } from '@/features/aqua/types/aqua';
import { ROUTE_LABEL } from '@/features/aqua/utils/rules';

const TONE: Record<Route, ChipTone> = {
  confirmed: 'success',
  owner: 'warning',
  answered: 'accent',
  opted_out: 'muted',
  duplicate: 'muted',
};

export function RouteChip({ route }: { route: Route }) {
  return <Chip label={ROUTE_LABEL[route]} tone={TONE[route]} />;
}
