import type { Route, RuleID } from '@/features/aqua/types/aqua';

export const RULE_TEXT: Record<RuleID, { title: string; why: string }> = {
  R1: { title: 'Not sure enough', why: "We weren't confident we read the message right, so a person checks it before anything changes." },
  R2: { title: 'Unclear message', why: "The message didn't say clearly what to change, so the owner replies in person." },
  R3: { title: 'Stops all deliveries', why: 'Ending a standing order is a big change, so the owner always confirms it.' },
  R4: { title: 'Unknown number', why: "This number isn't linked to a household yet. The owner sets them up or replies." },
  R5: { title: 'Unusually large', why: 'The quantity is over the product limit or more than double the usual order.' },
  R6: { title: 'After the cutoff', why: 'Changes for tomorrow close at the cutoff time, so the owner decides if it can still go out.' },
  R7: { title: 'Not in English', why: 'The demo reader only understands English, so a person reads and answers it.' },
  R8: { title: 'Missing amount', why: 'We need to know how many, or of what, before booking anything.' },
  R9: { title: 'Complaint', why: 'Complaints always go to a person, never to an automatic reply.' },
  R10: { title: 'No run that day', why: "There's no delivery run on that day (or we couldn't work out the day)." },
  R11: { title: 'Second check disagreed', why: 'The second check was unsure about this message, so a person looks at it.' },
  R12: { title: 'Flavour missing', why: 'Flavoured water comes in Lemon, Berry or Cucumber Mint. We need to know which.' },
  R13: { title: 'Stock or van full', why: "There isn't enough stock, or the van would be over its limit on that run." },
};

export const ROUTE_LABEL: Record<Route, string> = {
  confirmed: 'Confirmed',
  owner: 'Owner checks',
  answered: 'Answered',
  opted_out: 'Reminders stopped',
  duplicate: 'Ignored as duplicate',
};

export const INTENT_LABEL = {
  new: 'New order',
  change: 'Change',
  skip: 'Skip',
  cancel: 'Stop deliveries',
  return_only: 'Pickup',
  query: 'Question',
  complaint: 'Complaint',
  opt_out: 'Stop reminders',
  unclear: 'Unclear',
} as const;
