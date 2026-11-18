import type { Thread } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseDay(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatShortDate(iso: string): string {
  const date = parseDay(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function formatWeekday(iso: string): string {
  return WEEKDAYS[parseDay(iso).getDay()];
}

export function formatHarvestWindow(window: { from: string; to: string }): string {
  return `${formatShortDate(window.from)} to ${formatShortDate(window.to)}`;
}

export function formatMm(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function dayGroupLabel(iso: string, now: Date = new Date()): string {
  const days = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 8) return "Last 7 days";
  return "Older";
}

export function groupThreads(threads: Thread[], now: Date = new Date()): { label: string; items: Thread[] }[] {
  const groups: { label: string; items: Thread[] }[] = [];
  for (const thread of threads) {
    const label = dayGroupLabel(thread.created_at, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(thread);
    else groups.push({ label, items: [thread] });
  }
  return groups;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${time}`;
}

export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
