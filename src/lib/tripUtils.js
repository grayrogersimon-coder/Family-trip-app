import { MapPin, Link2, Home, Compass } from 'lucide-react';

export function detectSourceType(url) {
  const u = (url || '').toLowerCase();
  if (u.includes('airbnb')) return { type: 'Airbnb', icon: Home };
  if (u.includes('maps.google') || u.includes('goo.gl/maps') || u.includes('maps.app')) {
    return { type: 'Google Maps', icon: MapPin };
  }
  if (u.includes('booking.com') || u.includes('hotel')) return { type: 'Hotel', icon: Home };
  if (u.startsWith('http')) return { type: 'Website', icon: Link2 };
  return { type: 'Location', icon: Compass };
}

export function extractPlaceName(url) {
  try {
    if (!url || !url.startsWith('http')) return url || '';
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    const guess = parts.find((p) => p.length > 3 && !p.match(/^\d+$/));
    if (guess) return guess.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return u.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Trip dates are plain calendar dates (a `date` column has no timezone of
// its own) — all arithmetic on them here goes through UTC-anchored helpers,
// never `new Date(str)` + `.toISOString()`. That combination parses the
// string as *local* midnight but formats back in UTC, which silently shifts
// the date by a day for anyone not in a UTC-negative timezone (e.g. it
// under-counted a 5-day Australian trip as 4 days). Treating the ISO string
// as pure Y/M/D and doing the math with Date.UTC/getUTC* sidesteps the
// local timezone entirely.
function isoToUTCDate(isoDateStr) {
  const [y, m, d] = isoDateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function utcDateToISO(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

// Trip dates are real `date` columns; the prototype's "Day N" labels are
// derived from trip.start_date rather than stored directly.
export function dayNumberForDate(trip, dateStr) {
  if (!trip?.start_date || !dateStr) return null;
  const start = isoToUTCDate(trip.start_date);
  const d = isoToUTCDate(dateStr);
  return Math.round((d - start) / MS_PER_DAY) + 1;
}

export function dateForDayNumber(trip, dayNumber) {
  if (!trip?.start_date || !dayNumber) return null;
  const start = isoToUTCDate(trip.start_date);
  start.setUTCDate(start.getUTCDate() + (dayNumber - 1));
  return utcDateToISO(start);
}

export function addDaysToISODate(isoDateStr, daysToAdd) {
  const date = isoToUTCDate(isoDateStr);
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return utcDateToISO(date);
}

export function tripDayCount(trip) {
  if (!trip?.start_date || !trip?.end_date) return null;
  const start = isoToUTCDate(trip.start_date);
  const end = isoToUTCDate(trip.end_date);
  return Math.round((end - start) / MS_PER_DAY) + 1;
}

export function dayLabel(trip, dateStr) {
  if (!dateStr) return 'Unscheduled';
  const n = dayNumberForDate(trip, dateStr);
  if (n) return `Day ${n}`;
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

// AM/PM buttons are quick-pick shortcuts onto the real `time without time
// zone` column underneath; people can also enter an exact time directly.
export const AM_TIME = '09:00:00';
export const PM_TIME = '15:00:00';

export function periodFromTime(time) {
  if (!time) return null;
  const hour = Number(time.slice(0, 2));
  return hour < 12 ? 'AM' : 'PM';
}

// Formats a stored "HH:MM(:SS)" time into a friendly "2:30 PM" for display.
export function formatTimeOfDay(time) {
  if (!time) return null;
  const [hourStr, minuteStr] = time.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const period = hour < 12 ? 'AM' : 'PM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

export function sortActivitiesChronologically(list) {
  return [...list].sort((a, b) => {
    if (a.activity_date !== b.activity_date) {
      if (!a.activity_date) return 1;
      if (!b.activity_date) return -1;
      return a.activity_date < b.activity_date ? -1 : 1;
    }
    if (a.activity_time !== b.activity_time) {
      if (!a.activity_time) return 1;
      if (!b.activity_time) return -1;
      return a.activity_time < b.activity_time ? -1 : 1;
    }
    return 0;
  });
}

export function formatMoney(n) {
  return `$${(Number(n) || 0).toFixed(2)}`;
}

export function formatClock(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
