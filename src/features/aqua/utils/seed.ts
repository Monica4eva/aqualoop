import type { AquaData, Household, Ledger, Line, Product, RunSlot, StandingOrder } from '@/features/aqua/types/aqua';
import { at, DEMO_START } from '@/features/aqua/utils/dates';
import { ingest } from '@/features/aqua/utils/engine';
import { runKey } from '@/features/aqua/utils/schedule';

const PRODUCTS: Product[] = [
  { id: 'water_20l', name: 'Still water 20L refill', short: '20L water', category: 'water', variant: null, size: '20L', pack: 'single', unitsPerPack: 1, price: 6.5, returnable: true, container: '20L_container', chilled: false, maxPerOrder: 6, onHand: 80, reorderLevel: 20, active: true, load: 1, image: 'water20' },
  { id: 'water_5l', name: 'Still water 5L', short: '5L water', category: 'water', variant: null, size: '5L', pack: 'single', unitsPerPack: 1, price: 2.5, returnable: false, container: null, chilled: false, maxPerOrder: 6, onHand: 40, reorderLevel: 10, active: true, load: 0.25, image: 'water5' },
  { id: 'soda_1l', name: 'Soda water 1L', short: '1L soda', category: 'sparkling', variant: null, size: '1L', pack: 'single', unitsPerPack: 1, price: 1.2, returnable: false, container: null, chilled: false, maxPerOrder: 12, onHand: 48, reorderLevel: 12, active: true, load: 0.1, image: 'soda' },
  { id: 'soda_6', name: 'Soda water 6-pack', short: 'soda 6-pack', category: 'sparkling', variant: null, size: '1L', pack: '6-pack', unitsPerPack: 6, price: 6.5, returnable: true, container: 'crate', chilled: false, maxPerOrder: 4, onHand: 20, reorderLevel: 8, active: true, load: 0.5, image: 'soda' },
  { id: 'tonic_1l', name: 'Tonic water 1L', short: '1L tonic', category: 'sparkling', variant: null, size: '1L', pack: 'single', unitsPerPack: 1, price: 1.5, returnable: false, container: null, chilled: false, maxPerOrder: 12, onHand: 30, reorderLevel: 10, active: true, load: 0.1, image: 'tonic' },
  { id: 'tonic_6', name: 'Tonic water 6-pack', short: 'tonic 6-pack', category: 'sparkling', variant: null, size: '1L', pack: '6-pack', unitsPerPack: 6, price: 8, returnable: true, container: 'crate', chilled: false, maxPerOrder: 4, onHand: 6, reorderLevel: 10, active: true, load: 0.5, image: 'tonic' },
  { id: 'flav_lemon', name: 'Lemon water 12-pack', short: 'lemon 12-pack', category: 'flavoured', variant: 'lemon', size: '500ml', pack: '12-pack', unitsPerPack: 12, price: 9, returnable: false, container: null, chilled: false, maxPerOrder: 4, onHand: 14, reorderLevel: 6, active: true, load: 0.5, image: 'lemon' },
  { id: 'flav_berry', name: 'Berry water 12-pack', short: 'berry 12-pack', category: 'flavoured', variant: 'berry', size: '500ml', pack: '12-pack', unitsPerPack: 12, price: 9, returnable: false, container: null, chilled: false, maxPerOrder: 4, onHand: 12, reorderLevel: 6, active: true, load: 0.5, image: 'berry' },
  { id: 'flav_cucumber', name: 'Cucumber mint water 12-pack', short: 'cucumber mint 12-pack', category: 'flavoured', variant: 'cucumber_mint', size: '500ml', pack: '12-pack', unitsPerPack: 12, price: 9.5, returnable: false, container: null, chilled: false, maxPerOrder: 4, onHand: 10, reorderLevel: 6, active: true, load: 0.5, image: 'cucumber' },
  { id: 'milk_1l', name: 'Fresh milk 1L glass', short: '1L milk', category: 'dairy', variant: null, size: '1L', pack: 'single', unitsPerPack: 1, price: 1.9, returnable: true, container: 'milk_bottle', chilled: true, maxPerOrder: 6, onHand: 24, reorderLevel: 10, active: true, load: 0.25, image: 'milk1' },
  { id: 'milk_2l', name: 'Fresh milk 2L glass', short: '2L milk', category: 'dairy', variant: null, size: '2L', pack: 'single', unitsPerPack: 1, price: 3.4, returnable: true, container: 'milk_bottle', chilled: true, maxPerOrder: 6, onHand: 4, reorderLevel: 3, active: true, load: 0.25, image: 'milk2' },
];

type Seed = [id: string, label: string, contact: string, area: Household['area'], address: string, day: number, run: RunSlot, lines: [string, number][]];

const HOUSEHOLDS: Seed[] = [
  ['H01', 'Linden Court 2A', 'Amara Okafor', 'North', '2A Linden Court', 1, 'morning', [['water_20l', 2]]],
  ['H02', 'Birch House', 'Tomás Reyes', 'South', '14 Birch Road', 1, 'morning', [['water_20l', 1], ['milk_1l', 2]]],
  ['H03', 'Harbour View 5', 'Yuki Tanaka', 'East', '5 Harbour View', 2, 'afternoon', [['water_20l', 1], ['milk_2l', 1]]],
  ['H04', 'Old Mill Cottage', 'Priya Raman', 'West', 'Old Mill Lane', 2, 'afternoon', [['water_20l', 2]]],
  ['H05', 'The Orchard Flat', 'Lukas Weber', 'East', '3 Orchard Street', 5, 'afternoon', [['soda_6', 2], ['tonic_6', 1]]],
  ['H06', 'Cedar Row 11', 'Fatima Haddad', 'North', '11 Cedar Row', 2, 'afternoon', [['milk_1l', 2]]],
  ['H07', 'Willow Lane 7', 'Mei Chen', 'South', '7 Willow Lane', 4, 'morning', [['water_20l', 2]]],
  ['H08', 'Kestrel Point 3B', 'Kwame Mensah', 'West', '3B Kestrel Point', 2, 'afternoon', [['water_20l', 1], ['soda_6', 1]]],
  ['H09', 'Sunny Terrace 9', 'Sofia Rossi', 'East', '9 Sunny Terrace', 3, 'afternoon', [['flav_lemon', 1], ['flav_berry', 1]]],
  ['H10', 'Maple Street House', 'Arjun Mehta', 'North', '22 Maple Street', 2, 'afternoon', [['water_20l', 3]]],
  ['H11', 'Riverside Apartments', 'Olga Novak', 'South', '40 Riverside Walk', 4, 'afternoon', [['water_20l', 3]]],
  ['H12', 'Pine Gardens 4', 'Diego Alvarez', 'West', '4 Pine Gardens', 3, 'morning', [['water_20l', 2], ['milk_1l', 2]]],
  ['H13', 'Lantern Yard 1', 'Hana Kim', 'East', '1 Lantern Yard', 2, 'afternoon', [['water_5l', 1], ['milk_1l', 2]]],
  ['H14', 'Hilltop Barn', 'Samuel Adeyemi', 'North', 'Hilltop Farm Road', 6, 'morning', [['milk_2l', 1]]],
  ['H15', 'Quayside 12', 'Ingrid Larsen', 'South', '12 Quayside', 2, 'afternoon', [['water_20l', 2]]],
  ['H16', 'Bramble Close 6', 'Nour Saleh', 'West', '6 Bramble Close', 5, 'morning', [['water_20l', 2], ['milk_2l', 1]]],
  ['H17', 'Station Mews 2', 'Mateo Silva', 'East', '2 Station Mews', 2, 'morning', [['water_5l', 1], ['flav_cucumber', 1]]],
  ['H18', 'Elm Court 8', 'Aiko Sato', 'North', '8 Elm Court', 4, 'morning', [['milk_1l', 2], ['water_20l', 1]]],
  ['H19', 'Fern Hollow', 'Chidi Eze', 'South', 'Fern Hollow Farm', 6, 'morning', [['water_20l', 2]]],
  ['H20', 'Copper Lane 15', 'Leila Ahmadi', 'West', '15 Copper Lane', 1, 'afternoon', [['water_20l', 1], ['tonic_6', 1]]],
];

function ledgerFor(lines: Line[]): Ledger {
  const by = (ids: string[]) => lines.filter((l) => ids.includes(l.productId)).reduce((n, l) => n + l.qty, 0);
  return {
    '20L_container': { held: by(['water_20l']), damaged: 0, ready: 0 },
    milk_bottle: { held: by(['milk_1l', 'milk_2l']), damaged: 0, ready: 0 },
    crate: { held: by(['soda_6', 'tonic_6']), damaged: 0, ready: 0 },
  };
}

function base(): AquaData {
  const households: Household[] = [];
  const standing: Record<string, StandingOrder> = {};
  const ledger: Record<string, Ledger> = {};
  HOUSEHOLDS.forEach(([id, label, contact, area, address, day, run, lines], i) => {
    households.push({
      id,
      label,
      contact,
      phone: `+1 555 01${String(i + 10).padStart(2, '0')}`,
      area,
      address: `${address}, ${area}`,
      usualRun: run,
      reminders: id === 'H07' || i % 3 === 0,
      active: true,
    });
    const ls = lines.map(([productId, qty]) => ({ productId, qty }));
    standing[id] = {
      householdId: id,
      frequency: id === 'H14' ? 'fortnightly' : 'weekly',
      day,
      run,
      startDate: id === 'H14' ? '2026-11-07' : '2026-11-02',
      status: 'active',
      lines: ls,
      pause: null,
    };
    ledger[id] = ledgerFor(ls);
  });
  ledger.H07['20L_container'] = { held: 3, damaged: 0, ready: 2 };
  ledger.H07.milk_bottle = { held: 1, damaged: 0, ready: 1 };
  ledger.H07.crate = { held: 1, damaged: 0, ready: 0 };
  ledger.H11['20L_container'] = { held: 8, damaged: 0, ready: 5 };
  ledger.H02.milk_bottle = { held: 4, damaged: 0, ready: 2 };
  ledger.H17['20L_container'] = { held: 0, damaged: 1, ready: 0 };

  return {
    clock: DEMO_START,
    settings: {
      businessName: 'AquaLoop',
      currency: '$',
      cutoffHour: 18,
      reminderHour: 15,
      threshold: 0.8,
      normalLimit: 30,
      chilledLimit: 12,
      nvidiaCheck: false,
    },
    products: PRODUCTS.map((p) => ({ ...p })),
    households,
    standing,
    overrides: {},
    messages: [],
    reviews: [],
    stops: {
      [runKey('2026-11-17', 'morning')]: {
        H17: { status: 'delivered', delivered: [{ productId: 'water_5l', qty: 1 }, { productId: 'flav_cucumber', qty: 1 }], collected: {}, damaged: 1, at: at(17, 8, 20) },
      },
      [runKey('2026-11-17', 'afternoon')]: {
        H03: { status: 'delivered', delivered: [{ productId: 'water_20l', qty: 1 }, { productId: 'milk_2l', qty: 1 }], collected: { '20L_container': 1, milk_bottle: 1 }, damaged: 0, at: at(17, 13, 20) },
        H04: { status: 'delivered', delivered: [{ productId: 'water_20l', qty: 2 }], collected: { '20L_container': 2 }, damaged: 0, at: at(17, 13, 46) },
      },
    },
    runMeta: {},
    ledger,
    activity: [
      { id: 'v1', kind: 'returned', title: 'Returned', detail: '2 20L containers • Old Mill Cottage', at: at(17, 13, 46), householdId: 'H04' },
      { id: 'v2', kind: 'delivered', title: 'Delivered', detail: '2 x 20L water • Old Mill Cottage', at: at(17, 13, 45), householdId: 'H04' },
      { id: 'v3', kind: 'delivered', title: 'Delivered', detail: '1 x 20L water, 1 x 2L milk • Harbour View 5', at: at(17, 13, 20), householdId: 'H03' },
      { id: 'v4', kind: 'collected', title: 'Damaged container logged', detail: '1 cracked 20L container • Station Mews 2', at: at(17, 8, 21), householdId: 'H17' },
      { id: 'v5', kind: 'returned', title: 'Returned', detail: '3 20L containers, 2 milk bottles • Willow Lane 7', at: at(12, 9, 5), householdId: 'H07' },
      { id: 'v6', kind: 'delivered', title: 'Delivered', detail: '2 x 20L water • Willow Lane 7', at: at(12, 9, 4), householdId: 'H07' },
      { id: 'v7', kind: 'restock', title: 'Milk batch in', detail: '24 x 1L, 4 x 2L glass', at: at(16, 7, 30), householdId: null },
    ],
    audit: [
      { id: 'a1', householdId: 'H07', field: 'Standing order', oldValue: '3 x 20L water', newValue: '2 x 20L water', by: 'customer', message: 'Can we go down to 2 a week please', at: at(5, 10, 12) },
      { id: 'a2', householdId: 'H07', field: 'Reminders', oldValue: 'Off', newValue: 'On', by: 'owner', message: null, at: at(2, 9, 0) },
    ],
    milkBatches: [
      { id: 'B-1114', productId: 'milk_1l', qty: 14, useBy: '2026-11-19' },
      { id: 'B-1116', productId: 'milk_1l', qty: 10, useBy: '2026-11-24' },
      { id: 'B-1116L', productId: 'milk_2l', qty: 4, useBy: '2026-11-21' },
    ],
    remindersSent: [],
    seq: 100,
  };
}

/** The demo's fresh start, Tue 17 Nov 2026 14:00 with five messages waiting for the owner. */
export function seedData(): AquaData {
  let d = base();
  d.messages.push(
    { id: 'm1', householdId: 'H07', from: 'aqualoop', text: 'Reminder: 2 x 20L water tomorrow, morning run. Need a change? Reply before 6 PM.', at: at(11, 15, 0), channel: 'text', result: null },
    { id: 'm2', householdId: 'H07', from: 'customer', text: 'Perfect, thank you!', at: at(11, 15, 9), channel: 'text', result: null },
    { id: 'm3', householdId: 'H07', from: 'aqualoop', text: 'Delivered: 2 x 20L water. We collected 3 empties. Thanks!', at: at(12, 9, 5), channel: 'text', result: null },
  );
  const inbox: { householdId: string | null; text: string; at: number; channel: 'text' | 'voice'; phone?: string }[] = [
    { householdId: 'H19', text: 'Bring 8 containers saturday for the event', at: at(17, 9, 12), channel: 'text' },
    { householdId: 'H12', text: 'Hola, quiero leche el miércoles', at: at(17, 10, 3), channel: 'voice' },
    { householdId: null, text: 'Hi is this the water place? I want 2', at: at(17, 11, 26), channel: 'text', phone: '+1 555 0199' },
    { householdId: 'H09', text: 'The berry ones were warm and one leaked', at: at(17, 12, 40), channel: 'text' },
    { householdId: 'H03', text: 'Can you bring the big one and maybe some milk?', at: at(17, 13, 31), channel: 'voice' },
  ];
  inbox.forEach((m) => {
    d = ingest(d, m).data;
  });
  d.clock = DEMO_START;
  return d;
}
