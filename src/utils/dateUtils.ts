// Safe, timezone-independent Date & Time Utilities for CleanTrack

/**
 * Returns today's date in local 'YYYY-MM-DD' format.
 */
export const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns tomorrow's date in local 'YYYY-MM-DD' format.
 */
export const getTomorrowDateString = (): string => {
  return addDaysToDateString(getTodayDateString(), 1);
};

/**
 * Safely adds or subtracts days from a 'YYYY-MM-DD' string without UTC timezone drift.
 */
export const addDaysToDateString = (dateStr: string, days: number): string => {
  if (!dateStr || !dateStr.includes('-')) {
    dateStr = getTodayDateString();
  }
  const parts = dateStr.split('-').map(Number);
  const year = parts[0];
  const month = parts[1] - 1; // 0-indexed month
  const day = parts[2];

  // Construct local date at noon (12:00) to avoid any DST or midnight boundary shift
  const date = new Date(year, month, day + days, 12, 0, 0);

  const resYear = date.getFullYear();
  const resMonth = String(date.getMonth() + 1).padStart(2, '0');
  const resDay = String(date.getDate()).padStart(2, '0');

  return `${resYear}-${resMonth}-${resDay}`;
};

/**
 * Converts a 'HH:mm' time string to total minutes from 00:00.
 */
export const toMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/**
 * Converts total minutes (0 - 1439) into a 2-digit 'HH:mm' string.
 */
export const toTimeString = (mins: number): string => {
  const normalized = Math.max(0, Math.min(23 * 60 + 59, mins));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Checks if a specific date and time slot has already passed in real-time.
 * Strictly checks: dateStr < today OR (dateStr === today AND timeSlot < current time).
 */
export const isPastDateTime = (dateStr: string, timeStr?: string): boolean => {
  const todayStr = getTodayDateString();
  
  // CleanTrack Business Day: 06:00 to 05:59 the next calendar day.
  // When a user selects a time between 00:00 and 05:59, it means the morning of the day AFTER `dateStr`.
  let effectiveDateStr = dateStr;
  if (timeStr) {
    const hours = parseInt(timeStr.split(':')[0], 10);
    if (!isNaN(hours) && hours >= 0 && hours <= 5) {
      effectiveDateStr = addDaysToDateString(dateStr, 1);
    }
  }

  if (effectiveDateStr < todayStr) return true;
  if (effectiveDateStr > todayStr) return false;

  // On the same exact calendar day, check minutes
  if (!timeStr) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const slotMinutes = toMinutes(timeStr);
  return slotMinutes < currentMinutes;
};

/**
 * Returns the earliest valid upcoming time slot (in 'HH:mm') that is NOT in the past.
 * If date is in the future, returns the requested defaultTime or '08:30'.
 */
export const getNextFutureTimeSlot = (dateStr: string, defaultTime: string = '08:30'): string => {
  const todayStr = getTodayDateString();
  if (dateStr > todayStr) return defaultTime;
  if (dateStr < todayStr) return defaultTime;

  const now = new Date();
  const curMinutes = now.getHours() * 60 + now.getMinutes();
  // Round up to the next 15-minute mark
  const nextRoundedMinutes = Math.ceil((curMinutes + 5) / 15) * 15;
  if (nextRoundedMinutes >= 24 * 60) {
    return '23:45';
  }
  return toTimeString(nextRoundedMinutes);
};

/**
 * Friendly display label for date navigation (e.g. 'Today (2026-08-25)', 'Tomorrow (2026-08-26)', 'Yesterday')
 */
export const formatDateLabel = (dateStr: string): string => {
  const todayStr = getTodayDateString();
  const tomorrowStr = addDaysToDateString(todayStr, 1);
  const yesterdayStr = addDaysToDateString(todayStr, -1);

  if (dateStr === todayStr) {
    return `Today (${dateStr})`;
  }
  if (dateStr === tomorrowStr) {
    return `Tomorrow (${dateStr})`;
  }
  if (dateStr === yesterdayStr) {
    return `Yesterday (${dateStr})`;
  }

  // Format with Day of Week
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    return `${dayName}, ${d} ${monthName} ${y}`;
  } catch {
    return dateStr;
  }
};
