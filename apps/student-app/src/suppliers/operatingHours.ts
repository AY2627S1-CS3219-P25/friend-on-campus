/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Opus 5.5), date: 2026-11-04
 * Scope: Pure helpers for a supplier's operating hours (author's request of 2026-11-04): parse the free-text
 * startingTime / closingTime strings ("0900hrs", "09:00"), format them for display, and tell whether the spot is
 * open at a given instant in Singapore time, including hours that run past midnight ("1100hrs" to "0200hrs").
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import type { SupplierDTO } from '@campus-errand/common-dtos';

type Hours = Pick<SupplierDTO, 'startingTime' | 'closingTime'>;

const CAMPUS_TIME_ZONE = 'Asia/Singapore';

/** Minutes after midnight for "0900hrs", "0900", "09:00" or "9:00"; null for a blank or unreadable value. */
export function parseClockTime(value: string | null | undefined): number | null {
  const match = value?.trim().match(/^(\d{1,2}):?(\d{2})\s*(?:hrs?)?$/i);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** Both ends readable, or null when the spot has no usable hours on record. */
function readHours(supplier: Hours): { start: number; close: number } | null {
  const start = parseClockTime(supplier.startingTime);
  const close = parseClockTime(supplier.closingTime);
  return start === null || close === null ? null : { start, close };
}

/** "0000hrs" to "2359hrs" is how the seed data writes a spot that never closes. */
const isAllDay = ({ start, close }: { start: number; close: number }) => start === 0 && close === 23 * 60 + 59;

/** What a known store with missing or unreadable hours shows in place of them. */
export const HOURS_NOT_LISTED = 'Not listed';

/** "09:00 – 18:00", "Open 24 hours", or null when the hours are missing or unreadable. */
export function formatOperatingHours(supplier: Hours): string | null {
  const hours = readHours(supplier);
  if (!hours) return null;
  if (isAllDay(hours)) return 'Open 24 hours';
  return `${clock(hours.start)} – ${clock(hours.close)}`;
}

/** Minutes after midnight on the campus clock, whatever time zone the browser is set to. */
export function campusMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CAMPUS_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return part('hour') * 60 + part('minute');
}

/**
 * true / false for open or closed at `at`, or null when the hours are unknown (the caller then says nothing rather
 * than guessing). The closing minute counts as open; a closing time earlier than the opening time runs past midnight.
 */
export function isOpenAt(supplier: Hours, at: Date): boolean | null {
  const hours = readHours(supplier);
  if (!hours) return null;
  if (isAllDay(hours)) return true;
  const now = campusMinutes(at);
  const { start, close } = hours;
  return start <= close ? now >= start && now <= close : now >= start || now <= close;
}
