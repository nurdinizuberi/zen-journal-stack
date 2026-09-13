// src/lib/time.ts — date & streak helpers

export function startOfDay(d: Date = new Date()): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(d: Date = new Date()): Date {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function isoDayKey(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function isSameDay(a: string | Date, b: Date = new Date()): boolean {
  return isoDayKey(a) === isoDayKey(b);
}

export function daysBetween(from: string | Date, to: Date = new Date()): number {
  const fromDate = typeof from === 'string' ? new Date(from) : from;
  const ms = startOfDay(to).getTime() - startOfDay(fromDate).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function computeStreak(dates: Array<string | Date>): number {
  const daySet = new Set(dates.map((d) => isoDayKey(d)));
  let streak = 0;
  const cursor = startOfDay();
  while (daySet.has(isoDayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function startOfWeek(d: Date = new Date()): Date {
  const date = startOfDay(d);
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  return date;
}

export function startOfMonth(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function datesForLastDays(count: number, end: Date = new Date()): Date[] {
  const dates: Date[] = [];
  const cursor = startOfDay(end);
  for (let i = 0; i < count; i++) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return dates.reverse();
}

export function monthLabelFromDate(d: Date = new Date()): string {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}