// The demo clock runs in "fake UTC": every timestamp is read with getUTC* so the demo
// behaves the same in every timezone.
const DAY = 86_400_000;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const DEMO_START = Date.UTC(2026, 10, 17, 14, 0);

export function at(day: number, hour: number, minute = 0): number {
  return Date.UTC(2026, 10, day, hour, minute);
}

export function dateKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function keyToMs(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  return dateKey(keyToMs(key) + n * DAY);
}

export function weekday(key: string): number {
  return new Date(keyToMs(key)).getUTCDay();
}

export function weekdayName(day: number): string {
  return WEEKDAYS[day];
}

export function shortWeekday(day: number): string {
  return WEEKDAYS[day].slice(0, 3);
}

export function fmtDay(key: string): string {
  const d = new Date(keyToMs(key));
  return `${WEEKDAYS[d.getUTCDay()].slice(0, 3)} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function fmtLongDay(key: string): string {
  const d = new Date(keyToMs(key));
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function fmtTime(ms: number): string {
  const d = new Date(ms);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export function fmtHour(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${hour < 12 ? 'AM' : 'PM'}`;
}

export function fmtStamp(ms: number, now: number): string {
  const key = dateKey(ms);
  const today = dateKey(now);
  if (key === today) return `Today, ${fmtTime(ms)}`;
  if (key === addDays(today, -1)) return `Yesterday, ${fmtTime(ms)}`;
  const d = new Date(ms);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${fmtTime(ms)}`;
}

export function hourOf(ms: number): number {
  return new Date(ms).getUTCHours() + new Date(ms).getUTCMinutes() / 60;
}

/** Next date (strictly after `fromKey`) that falls on weekday `day`. */
export function nextWeekday(fromKey: string, day: number): string {
  for (let i = 1; i <= 7; i += 1) {
    const k = addDays(fromKey, i);
    if (weekday(k) === day) return k;
  }
  return addDays(fromKey, 7);
}

export function weeksBetween(a: string, b: string): number {
  return Math.round((keyToMs(b) - keyToMs(a)) / (7 * DAY));
}

/** The cutoff for a delivery date: the day before at cutoffHour. */
export function cutoffFor(date: string, cutoffHour: number): number {
  return keyToMs(addDays(date, -1)) + cutoffHour * 3_600_000;
}

/** "Today", "Tomorrow", or "Thu 19 Nov". */
export function relDay(key: string, now: number): string {
  const today = dateKey(now);
  if (key === today) return 'Today';
  if (key === addDays(today, 1)) return `Tomorrow, ${fmtDay(key)}`;
  return fmtDay(key);
}
