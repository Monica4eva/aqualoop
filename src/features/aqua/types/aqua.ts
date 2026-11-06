export type Role = 'customer' | 'owner' | 'driver';
export type Category = 'water' | 'sparkling' | 'flavoured' | 'dairy';
export type ContainerType = '20L_container' | 'milk_bottle' | 'crate';
export type RunSlot = 'morning' | 'afternoon';
export type PackType = 'single' | '6-pack' | '12-pack';
export type ImageKey =
  | 'water20'
  | 'water5'
  | 'soda'
  | 'tonic'
  | 'lemon'
  | 'berry'
  | 'cucumber'
  | 'milk1'
  | 'milk2';

export interface Product {
  id: string;
  name: string;
  short: string;
  category: Category;
  variant: string | null;
  size: string;
  pack: PackType;
  unitsPerPack: number;
  price: number;
  returnable: boolean;
  container: ContainerType | null;
  chilled: boolean;
  maxPerOrder: number;
  onHand: number;
  reorderLevel: number;
  active: boolean;
  load: number;
  image: ImageKey;
}

export interface Line {
  productId: string;
  qty: number;
}

export type Returns = Partial<Record<ContainerType, number>>;

export interface Household {
  id: string;
  label: string;
  contact: string;
  phone: string;
  area: 'North' | 'South' | 'East' | 'West';
  address: string;
  usualRun: RunSlot;
  reminders: boolean;
  active: boolean;
}

export interface StandingOrder {
  householdId: string;
  frequency: 'weekly' | 'fortnightly';
  day: number;
  run: RunSlot;
  startDate: string;
  status: 'active' | 'ended';
  lines: Line[];
  pause: { from: string; to: string } | null;
}

export interface Override {
  householdId: string;
  date: string;
  run: RunSlot;
  lines: Line[];
  returns: Returns;
  skipped: boolean;
}

export type Intent =
  | 'new'
  | 'change'
  | 'skip'
  | 'cancel'
  | 'return_only'
  | 'query'
  | 'complaint'
  | 'opt_out'
  | 'unclear';

export interface ParsedItem {
  product: 'still_water' | 'soda_water' | 'tonic_water' | 'flavoured_water' | 'fresh_milk' | null;
  variant: string | null;
  size: string | null;
  pack: PackType | null;
  quantity: number | null;
}

export interface ParsedOrder {
  transcript: string;
  language: string;
  intent: Intent;
  items: ParsedItem[];
  returns: { container_type: ContainerType; count: number }[];
  date_phrase: string | null;
  run: RunSlot | null;
  scope: 'one_off' | 'standing';
  confidence: number;
  summary: string;
}

export type RuleID =
  | 'R1'
  | 'R2'
  | 'R3'
  | 'R4'
  | 'R5'
  | 'R6'
  | 'R7'
  | 'R8'
  | 'R9'
  | 'R10'
  | 'R11'
  | 'R12'
  | 'R13';

export type Route = 'confirmed' | 'owner' | 'answered' | 'opted_out' | 'duplicate';

export interface Resolution {
  date: string | null;
  run: RunSlot;
  mode: 'add' | 'set';
  lines: Line[];
  returns: Returns;
  alreadyBooked: boolean;
}

export interface MessageResult {
  parsed: ParsedOrder;
  parser: string;
  rules: RuleID[];
  route: Route;
  resolution: Resolution;
  askedForHuman: boolean;
}

export interface ChatMessage {
  id: string;
  householdId: string | null;
  from: 'customer' | 'aqualoop';
  text: string;
  at: number;
  channel: 'text' | 'voice';
  result: MessageResult | null;
}

export interface ReviewItem {
  id: string;
  messageId: string;
  householdId: string | null;
  phone: string;
  text: string;
  channel: 'text' | 'voice';
  at: number;
  result: MessageResult;
  status: 'waiting' | 'approved' | 'edited' | 'rejected';
  note: string | null;
  resolvedAt: number | null;
}

export interface StopRecord {
  status: 'pending' | 'delivered' | 'partial' | 'not_home';
  delivered: Line[];
  collected: Returns;
  damaged: number;
  at: number | null;
}

export interface RunMeta {
  locked: boolean;
  order: string[] | null;
  driver: string;
}

export interface LedgerEntry {
  held: number;
  damaged: number;
  ready: number;
}

export type Ledger = Record<ContainerType, LedgerEntry>;

export interface Activity {
  id: string;
  kind: 'returned' | 'delivered' | 'collected' | 'confirmed' | 'review' | 'skipped' | 'reminder' | 'restock';
  title: string;
  detail: string;
  at: number;
  householdId: string | null;
}

export interface AuditEntry {
  id: string;
  householdId: string;
  field: string;
  oldValue: string;
  newValue: string;
  by: 'system' | 'owner' | 'customer';
  message: string | null;
  at: number;
}

export interface MilkBatch {
  id: string;
  productId: string;
  qty: number;
  useBy: string;
}

export interface Settings {
  businessName: string;
  currency: string;
  cutoffHour: number;
  reminderHour: number;
  threshold: number;
  normalLimit: number;
  chilledLimit: number;
  nvidiaCheck: boolean;
}

export interface AquaData {
  clock: number;
  settings: Settings;
  products: Product[];
  households: Household[];
  standing: Record<string, StandingOrder>;
  overrides: Record<string, Override>;
  messages: ChatMessage[];
  reviews: ReviewItem[];
  stops: Record<string, Record<string, StopRecord>>;
  runMeta: Record<string, RunMeta>;
  ledger: Record<string, Ledger>;
  activity: Activity[];
  audit: AuditEntry[];
  milkBatches: MilkBatch[];
  remindersSent: string[];
  seq: number;
}

export interface Delivery {
  householdId: string;
  date: string;
  run: RunSlot;
  lines: Line[];
  returns: Returns;
  source: 'standing' | 'override';
}
