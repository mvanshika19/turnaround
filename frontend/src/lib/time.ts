import type { IsoDate, LocalTime } from '@/api/types';

/*
 * Times and dates arrive from the API already in Vancouver wall-clock terms. Everything here is
 * pure calendar and clock arithmetic on those strings: nothing reads the browser clock or converts
 * between time zones.
 */

const MINUTES_PER_DAY = 24 * 60;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

/** Minutes since midnight for an "HH:MM" time. */
export function toMinutes(time: LocalTime): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** "HH:MM" for a number of minutes since midnight (wraps around the day). */
export function fromMinutes(totalMinutes: number): LocalTime {
  const minutes = ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** The two parts of a 12-hour clock reading: "1:00" and "pm". */
export function clockParts(time: LocalTime): { clock: string; period: 'am' | 'pm' } {
  const minutes = toMinutes(time);
  const hours = Math.floor(minutes / 60);
  return {
    clock: `${(hours % 12 || 12).toString()}:${pad(minutes % 60)}`,
    period: hours < 12 ? 'am' : 'pm',
  };
}

/** "13:00" → "1:00 pm", "11:45" → "11:45 am". */
export function formatClock(time: LocalTime): string {
  const { clock, period } = clockParts(time);
  return `${clock} ${period}`;
}

/** The start in `options` closest to `time` (the earlier one on a tie), or `time` if there are none. */
export function nearestTime(time: LocalTime, options: readonly LocalTime[]): LocalTime {
  const target = toMinutes(time);
  let best: LocalTime | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const option of options) {
    const distance = Math.abs(toMinutes(option) - target);
    if (distance < bestDistance) {
      best = option;
      bestDistance = distance;
    }
  }
  return best ?? time;
}

/** Midnight UTC of an ISO date, used only as a calendar day count. */
function toUtcMs(date: IsoDate): number {
  const [year = 1970, month = 1, day = 1] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/** The ISO date `days` days after `date`. */
export function addDays(date: IsoDate, days: number): IsoDate {
  return new Date(toUtcMs(date) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** "2026-11-22" → "Sunday, November 22". */
export function formatLongDate(date: IsoDate): string {
  const day = new Date(toUtcMs(date));
  const weekday = WEEKDAYS[day.getUTCDay()] ?? '';
  const month = MONTHS[day.getUTCMonth()] ?? '';
  return `${weekday}, ${month} ${day.getUTCDate().toString()}`;
}

/** "2026-11-24" → "Tue, Nov 24". */
export function formatShortDate(date: IsoDate): string {
  const day = new Date(toUtcMs(date));
  const weekday = WEEKDAYS[day.getUTCDay()]?.slice(0, 3) ?? '';
  const month = MONTHS[day.getUTCMonth()]?.slice(0, 3) ?? '';
  return `${weekday}, ${month} ${day.getUTCDate().toString()}`;
}
