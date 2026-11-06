import type { Intent, MessageResult, Route, RuleID } from '@/features/aqua/types/aqua';
import { at } from '@/features/aqua/utils/dates';
import { ingest, processMessage } from '@/features/aqua/utils/engine';
import { seedData } from '@/features/aqua/utils/seed';

export interface LabCase {
  id: number;
  text: string;
  householdId: string | null;
  at: number;
  /** Send this first, two minutes earlier (the duplicate check). */
  setup?: string;
  intent: Intent;
  route: Route;
  rules: RuleID[];
  note: string;
}

const T = at(17, 14, 0);

export const LAB_CASES: LabCase[] = [
  { id: 1, text: 'Make it 3 containers this Thursday', householdId: 'H07', at: T, intent: 'change', route: 'confirmed', rules: [], note: 'One-off change' },
  { id: 2, text: "Skip next week, we're travelling", householdId: 'H07', at: T, intent: 'skip', route: 'confirmed', rules: [], note: 'Skip a week' },
  { id: 3, text: 'Please collect 3 empties tomorrow', householdId: 'H07', at: T, intent: 'return_only', route: 'confirmed', rules: [], note: 'Pickup only' },
  { id: 4, text: 'When is my next delivery?', householdId: 'H07', at: T, intent: 'query', route: 'answered', rules: [], note: 'Question' },
  { id: 5, text: 'Stop sending me reminders', householdId: 'H07', at: T, intent: 'opt_out', route: 'opted_out', rules: [], note: 'Reminders off' },
  { id: 6, text: 'Add 2 milk on Thursday', householdId: 'H07', at: T, intent: 'change', route: 'confirmed', rules: [], note: 'Add to order' },
  { id: 7, text: 'Bring 2 soda crates and a tonic crate on Friday', householdId: 'H07', at: T, intent: 'new', route: 'confirmed', rules: [], note: 'Two items' },
  { id: 8, text: 'Make it 3 containers this Thursday', householdId: 'H07', at: T, setup: 'Make it 3 containers this Thursday', intent: 'change', route: 'duplicate', rules: [], note: 'Same message twice' },
  { id: 9, text: 'Hi, can you deliver 2 containers tomorrow?', householdId: null, at: T, intent: 'new', route: 'owner', rules: ['R4'], note: 'Unknown number' },
  { id: 10, text: 'Make it 3 containers this Thursday', householdId: 'H07', at: at(18, 19, 30), intent: 'change', route: 'owner', rules: ['R6'], note: 'After 6 PM cutoff' },
  { id: 11, text: 'Hola, necesito 2 garrafones el jueves', householdId: 'H07', at: T, intent: 'unclear', route: 'owner', rules: ['R7'], note: 'Not English' },
  { id: 12, text: 'The milk was sour', householdId: 'H07', at: T, intent: 'complaint', route: 'owner', rules: ['R9'], note: 'Complaint' },
  { id: 13, text: "Please stop my deliveries, we're moving", householdId: 'H07', at: T, intent: 'cancel', route: 'owner', rules: ['R3'], note: 'Cancel everything' },
  { id: 14, text: 'Can I get 10 containers on Thursday?', householdId: 'H07', at: T, intent: 'new', route: 'owner', rules: ['R5'], note: 'Too many' },
  { id: 15, text: 'Bring some milk tomorrow', householdId: 'H07', at: T, intent: 'new', route: 'owner', rules: ['R8'], note: 'No quantity' },
  { id: 16, text: 'Can you bring the big one and maybe some milk?', householdId: 'H07', at: T, intent: 'unclear', route: 'owner', rules: ['R1', 'R2'], note: 'Vague' },
  { id: 17, text: 'Can I get 2 containers on Thursday?', householdId: 'H07', at: T, intent: 'new', route: 'confirmed', rules: [], note: 'Already booked' },
  { id: 18, text: 'Send 2 flavoured waters on Thursday', householdId: 'H07', at: T, intent: 'new', route: 'owner', rules: ['R12'], note: 'Flavour missing' },
  { id: 19, text: 'Need 2 lemon packs on Sunday', householdId: 'H07', at: T, intent: 'new', route: 'owner', rules: ['R10'], note: 'No Sunday run' },
  { id: 20, text: 'Need 1 more container', householdId: 'H07', at: T, intent: 'new', route: 'confirmed', rules: [], note: 'No date: next usual' },
  { id: 21, text: 'HUMAN', householdId: 'H07', at: T, intent: 'query', route: 'owner', rules: [], note: 'Asks for a person' },
  { id: 22, text: 'From now on make it 3 containers every Thursday', householdId: 'H07', at: T, intent: 'change', route: 'confirmed', rules: [], note: 'Standing change' },
  { id: 23, text: 'Stop', householdId: 'H07', at: T, intent: 'unclear', route: 'owner', rules: ['R2'], note: 'Bare "stop"' },
  { id: 24, text: 'Bring 5 big milk on Thursday', householdId: 'H07', at: T, intent: 'new', route: 'owner', rules: ['R13'], note: 'Not enough stock' },
  { id: 25, text: 'Please pick up 2 crates and 4 milk bottles on Thursday', householdId: 'H07', at: T, intent: 'return_only', route: 'confirmed', rules: [], note: 'Pickup, two types' },
];

export interface LabOutcome {
  id: number;
  result: MessageResult;
  intentOK: boolean;
  routeOK: boolean;
  rulesOK: boolean;
  pass: boolean;
}

/** Every case runs against its own fresh copy of the demo start, so results never leak between cases. */
export function runCase(c: LabCase): LabOutcome {
  let data = seedData();
  if (c.setup) data = ingest(data, { householdId: c.householdId, text: c.setup, at: c.at - 120_000, channel: 'text' }).data;
  data.clock = c.at;
  const result = processMessage(data, { householdId: c.householdId, text: c.text, at: c.at, channel: 'text' });
  const intentOK = result.parsed.intent === c.intent;
  const routeOK = result.route === c.route;
  const rulesOK = result.rules.length === c.rules.length && c.rules.every((r) => result.rules.includes(r));
  return { id: c.id, result, intentOK, routeOK, rulesOK, pass: intentOK && routeOK && rulesOK };
}
