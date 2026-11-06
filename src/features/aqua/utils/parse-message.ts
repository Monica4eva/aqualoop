import type { ContainerType, Intent, PackType, ParsedItem, ParsedOrder, RunSlot } from '@/features/aqua/types/aqua';

/**
 * parseMessage — the ONE place a message turns into a structured order. It returns exactly the
 * JSON shape the Gemini intake prompt asks for, so a model can replace this demo parser without
 * touching anything else. This rule-based version never guesses: what it can't read stays null.
 */
export const PARSER_NAME = 'Demo parser';

const NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  the: 1,
  one: 1,
  two: 2,
  couple: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

const FOREIGN = /\b(hola|necesito|quiero|gracias|jueves|garraf\w*|leche|agua|bonjour|merci|demain|bitte|danke|obrigad\w|ciao|grazie|por favor)\b/;
const RETURN_VERB = /\b(collect|take back|pick up|pickup|come get|come for)\b/;
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function toNumber(token: string | undefined): number | null {
  if (!token) return null;
  if (/^\d+$/.test(token)) return Number(token);
  return NUMBERS[token] ?? null;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

const SKIP_BACK = new Set(['of', 'x', 'bottle', 'bottles', 'litre', 'liter', 'more', 'extra', 'big']);
const PACK_WORDS: Record<string, PackType> = {
  crate: '6-pack',
  crates: '6-pack',
  pack: '6-pack',
  packs: '6-pack',
  '6-pack': '6-pack',
  '12-pack': '12-pack',
};

interface Found {
  item: ParsedItem;
  index: number;
}

function quantityBefore(tokens: string[], index: number): { qty: number | null; pack: PackType | null; size: string | null } {
  let pack: PackType | null = null;
  let size: string | null = null;
  for (let i = index - 1; i >= Math.max(0, index - 4); i -= 1) {
    const t = tokens[i];
    if (PACK_WORDS[t]) {
      pack = PACK_WORDS[t];
      continue;
    }
    if (/^\d+l$/.test(t)) {
      size = t.toUpperCase();
      continue;
    }
    if (SKIP_BACK.has(t)) {
      if (t === 'big') size = 'big';
      continue;
    }
    if (t === 'some' || t === 'any') return { qty: null, pack, size };
    return { qty: toNumber(t), pack, size };
  }
  return { qty: null, pack, size };
}

function findItems(tokens: string[]): ParsedItem[] {
  const found: Found[] = [];
  const used = new Set<number>();
  const mark = (i: number, item: ParsedItem) => {
    used.add(i);
    found.push({ item, index: i });
  };

  tokens.forEach((t, i) => {
    if (used.has(i)) return;
    const next = tokens[i + 1];
    if (t === 'lemon' || t === 'berry' || t === 'cucumber') {
      const { qty } = quantityBefore(tokens, i);
      const variant = t === 'cucumber' ? 'cucumber_mint' : t;
      if (next === 'mint') used.add(i + 1);
      for (let j = i + 1; j <= i + 3; j += 1) if (['water', 'ones', 'one', 'mint', 'flavoured', 'flavored'].includes(tokens[j])) used.add(j);
      mark(i, { product: 'flavoured_water', variant, size: '500ml', pack: '12-pack', quantity: qty });
      return;
    }
    if (t === 'flavoured' || t === 'flavored') {
      const { qty } = quantityBefore(tokens, i);
      if (next === 'water' || next === 'waters') used.add(i + 1);
      mark(i, { product: 'flavoured_water', variant: null, size: '500ml', pack: '12-pack', quantity: qty });
      return;
    }
    if (t === 'tonic' || t === 'tonics') {
      const { qty, pack } = quantityBefore(tokens, i);
      mark(i, { product: 'tonic_water', variant: null, size: '1L', pack: pack ?? PACK_WORDS[next] ?? null, quantity: qty });
      return;
    }
    if (['soda', 'sodas', 'fizzy', 'sparkling'].includes(t)) {
      const { qty, pack } = quantityBefore(tokens, i);
      if (next === 'water') used.add(i + 1);
      const after = next === 'water' ? tokens[i + 2] : next;
      mark(i, { product: 'soda_water', variant: null, size: '1L', pack: pack ?? PACK_WORDS[after] ?? null, quantity: qty });
      return;
    }
    if (t === 'milk' || t === 'milks') {
      const { qty, size } = quantityBefore(tokens, i);
      const big = size === '2L' || size === 'big' || tokens[i + 1] === '2l';
      mark(i, { product: 'fresh_milk', variant: null, size: big ? '2L' : '1L', pack: 'single', quantity: qty });
      return;
    }
    if (['container', 'containers', 'refill', 'refills', 'water', '20l'].includes(t) || (t === 'one' && tokens[i - 1] === 'big')) {
      const { qty, size } = quantityBefore(tokens, i);
      const five = size === '5L' || tokens[i + 1] === '5l';
      mark(i, {
        product: 'still_water',
        variant: null,
        size: five ? '5L' : '20L',
        pack: 'single',
        quantity: t === 'one' ? 1 : qty,
      });
    }
  });

  const items = found.sort((a, b) => a.index - b.index).map((f) => f.item);
  const ofThem = tokens.findIndex((t, i) => t === 'of' && tokens[i + 1] === 'them');
  if (ofThem > 0 && items.length > 0 && items[0].quantity === null) items[0].quantity = toNumber(tokens[ofThem - 1]);

  if (items.length > 0) return items;
  const bare = tokens.map(toNumber).find((n, i) => n !== null && /^\d+$|^(two|three|four|five|six|seven|eight|nine|ten)$/.test(tokens[i]));
  if (bare !== undefined && bare !== null) return [{ product: null, variant: null, size: null, pack: null, quantity: bare }];
  return [];
}

function findReturns(tokens: string[]): { container_type: ContainerType; count: number }[] {
  const out: { container_type: ContainerType; count: number }[] = [];
  tokens.forEach((t, i) => {
    let type: ContainerType | null = null;
    if (t === 'crate' || t === 'crates') type = 'crate';
    if ((t === 'bottles' || t === 'bottle') && tokens[i - 1] === 'milk') type = 'milk_bottle';
    if (['empties', 'empty', 'containers', 'container'].includes(t)) type = '20L_container';
    if ((t === 'bottles' || t === 'bottle') && tokens[i - 1] !== 'milk') type = '20L_container';
    if (!type) return;
    let back = i - 1;
    if (type === 'milk_bottle') back = i - 2;
    const n = toNumber(tokens[back]);
    out.push({ container_type: type, count: n ?? 1 });
  });
  return out;
}

function findDate(lower: string): string | null {
  const m = lower.match(/\b(today|tonight|tomorrow|this week|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (!m) return null;
  const word = m[1];
  if (DAYS.includes(word)) return word[0].toUpperCase() + word.slice(1);
  return word;
}

function findRun(lower: string): RunSlot | null {
  if (/\bmorning\b/.test(lower)) return 'morning';
  if (/\b(afternoon|evening)\b/.test(lower)) return 'afternoon';
  return null;
}

function detectIntent(lower: string, tokens: string[], itemsBeforeReturn: number): { intent: Intent; confidence: number; language: string } {
  if (FOREIGN.test(lower)) return { intent: 'unclear', confidence: 0.85, language: lower.match(/\b(bonjour|merci|demain)\b/) ? 'fr' : 'es' };
  if (/\b(stop|no more|unsubscribe|dont send|do not send)\b/.test(lower) && /\b(reminder|reminders|messages|texts|notifications)\b/.test(lower))
    return { intent: 'opt_out', confidence: 0.95, language: 'en' };
  if (/\b(sour|spoil\w*|leak\w*|broken|damaged|cracked|warm|missed|never (came|arrived)|wrong|complain\w*|dirty|tastes?)\b/.test(lower))
    return { intent: 'complaint', confidence: 0.9, language: 'en' };
  if (/\b(stop|cancel|end)\b.*\b(deliver\w*|order\w*|service|subscription)\b|\b(were|we are) moving\b/.test(lower))
    return { intent: 'cancel', confidence: 0.9, language: 'en' };
  if (tokens.length <= 2 && tokens.includes('stop')) return { intent: 'unclear', confidence: 0.8, language: 'en' };
  if (/\b(maybe|ill see|i will see|not sure|perhaps|dunno)\b/.test(lower)) return { intent: 'unclear', confidence: 0.5, language: 'en' };
  if (RETURN_VERB.test(lower) && itemsBeforeReturn === 0) return { intent: 'return_only', confidence: 0.92, language: 'en' };
  if (/\b(skip|no water|dont need|do not need|still have|travelling|traveling|away)\b/.test(lower))
    return { intent: 'skip', confidence: 0.92, language: 'en' };
  if (/^(when|what|how|is|do|does|which|whats|where)\b/.test(lower) && !/\b(bring|order|need|add)\b/.test(lower))
    return { intent: 'query', confidence: 0.92, language: 'en' };
  if (/\b(instead|make it|change|from now on|every|add|extra|also|plus)\b/.test(lower) || /\bto \d+\b/.test(lower))
    return { intent: 'change', confidence: 0.92, language: 'en' };
  if (/\b(bring|need|order|deliver|send|get|want)\b/.test(lower)) return { intent: 'new', confidence: 0.95, language: 'en' };
  return { intent: 'unclear', confidence: 0.5, language: 'en' };
}

const PRODUCT_WORDS: Record<string, string> = {
  still_water: 'water',
  soda_water: 'soda water',
  tonic_water: 'tonic',
  flavoured_water: 'flavoured water',
  fresh_milk: 'milk',
};

function describeItem(i: ParsedItem): string {
  const qty = i.quantity === null ? 'some' : String(i.quantity);
  if (!i.product) return `${qty} of their usual`;
  const name = i.product === 'flavoured_water' && i.variant ? `${i.variant.replace('_', ' ')} water` : PRODUCT_WORDS[i.product];
  return `${qty} ${i.size && i.product !== 'flavoured_water' ? `${i.size} ` : ''}${name}${i.pack && i.pack !== 'single' ? ` ${i.pack}` : ''}`;
}

function summarize(p: Omit<ParsedOrder, 'summary'>): string {
  const when = p.date_phrase ? ` for ${p.date_phrase}` : '';
  const items = p.items.map(describeItem).join(' and ');
  const back = p.returns.map((r) => `${r.count} ${r.container_type.replace('_', ' ')}`).join(', ');
  switch (p.intent) {
    case 'new':
      return `Wants ${items || 'something unclear'}${when}${back ? `, returning ${back}` : ''}.`;
    case 'change':
      return `${p.scope === 'standing' ? 'Permanent change' : 'One-off change'}: ${items || 'quantity unclear'}${when}.`;
    case 'skip':
      return `Skip the delivery${when}.`;
    case 'cancel':
      return 'Wants to stop deliveries altogether.';
    case 'return_only':
      return `Pickup only: ${back || 'empties'}${when}.`;
    case 'query':
      return 'Asking a question, no change.';
    case 'complaint':
      return 'Complaint about a delivery.';
    case 'opt_out':
      return 'Stop reminders, keep deliveries.';
    default:
      return p.language !== 'en' ? `Message not in English (${p.language}).` : 'Not clear what they want.';
  }
}

export function parseMessage(text: string): ParsedOrder {
  if (text.trim().toUpperCase() === 'HUMAN') {
    return {
      transcript: text.trim(),
      language: 'en',
      intent: 'query',
      items: [],
      returns: [],
      date_phrase: null,
      run: null,
      scope: 'one_off',
      confidence: 0.99,
      summary: 'Asked to talk to a person.',
    };
  }
  const lower = text.toLowerCase().replace(/[’']/g, '').trim();
  const tokens = tokenize(text);
  const returnMatch = lower.match(RETURN_VERB);
  const cut = returnMatch?.index ?? -1;
  const before = cut >= 0 ? tokenize(lower.slice(0, cut)) : tokens;
  const after = cut >= 0 ? tokenize(lower.slice(cut)) : [];
  const preItems = findItems(before).filter((i) => i.product !== null);
  const { intent, confidence: base, language } = detectIntent(lower, tokens, preItems.length);

  const itemIntents: Intent[] = ['new', 'change'];
  const items = itemIntents.includes(intent) ? findItems(before) : [];
  const returns = cut >= 0 && language === 'en' && ['new', 'change', 'return_only'].includes(intent) ? findReturns(after) : [];

  let confidence = base;
  if (items.some((i) => i.quantity === null || (i.product === 'flavoured_water' && !i.variant))) confidence = Math.min(confidence, 0.82);

  const draft = {
    transcript: text.trim(),
    language,
    intent,
    items,
    returns,
    date_phrase: findDate(lower),
    run: findRun(lower),
    scope: /\b(from now on|every (week|delivery|time|monday|tuesday|wednesday|thursday|friday|saturday)|going forward|permanently)\b/.test(lower)
      ? ('standing' as const)
      : ('one_off' as const),
    confidence,
  };
  return { ...draft, summary: summarize(draft) };
}
