/** All dates in the app are local-time YYYY-MM-DD strings. No timezone drift, no UTC surprises. */

export function dateKey(d: Date | string = new Date()): string {
  if (typeof d === "string") return d.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): Date {
  const d = parseKey(key);
  d.setDate(d.getDate() + days);
  return d;
}

export function shiftKey(key: string, days: number): string {
  return dateKey(addDays(key, days));
}

export function daysBetween(a: string, b: string): number {
  const ms = parseKey(b).getTime() - parseKey(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function rangeKeys(endKey: string, days: number): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(shiftKey(endKey, -i));
  return out;
}

export function isToday(key: string): boolean {
  return key === dateKey();
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDay(key: string): string {
  if (isToday(key)) return "Today";
  if (key === shiftKey(dateKey(), -1)) return "Yesterday";
  const d = parseKey(key);
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

export function formatShort(key: string): string {
  const d = parseKey(key);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}
