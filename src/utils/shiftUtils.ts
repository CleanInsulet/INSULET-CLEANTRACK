export type ShiftType = 'day' | 'night';
export type ShiftFilter = 'all' | 'day' | 'night';

export interface ShiftInfo {
  type: ShiftType;
  name: string;
  shortName: string;
  timeRange: string;
  hoursDisplay: string;
  icon: string;
  startHour: number; // 6 for Day, 18 for Night
  endHour: number;   // 18 for Day, 6 (or 30) for Night
  color: string;
  bgBadge: string;
  borderBadge: string;
  textBadge: string;
}

export const SHIFT_CONFIGS: Record<ShiftType, ShiftInfo> = {
  day: {
    type: 'day',
    name: 'Day Shift',
    shortName: 'Day Shift',
    timeRange: '06:00 - 18:00',
    hoursDisplay: '6:00 AM – 6:00 PM',
    icon: '☀️',
    startHour: 6,
    endHour: 18,
    color: '#0284c7', // Sky Blue
    bgBadge: 'bg-amber-50 text-amber-900 border-amber-200',
    borderBadge: 'border-amber-300',
    textBadge: 'text-amber-800',
  },
  night: {
    type: 'night',
    name: 'Night Shift',
    shortName: 'Night Shift',
    timeRange: '18:00 - 06:00',
    hoursDisplay: '6:00 PM – 6:00 AM',
    icon: '🌙',
    startHour: 18,
    endHour: 6,
    color: '#6366f1', // Indigo / Purple
    bgBadge: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    borderBadge: 'border-indigo-300',
    textBadge: 'text-indigo-800',
  },
};

export const DAY_SHIFT_HOURS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];

export const NIGHT_SHIFT_HOURS = [
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00'
];

export const FULL_24H_HOURS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00'
];

export const DAY_SHIFT_PRESETS = [
  { label: '06:00 - 08:30 (Opening & Lobby Sanitization)', start: '06:00', end: '08:30' },
  { label: '08:30 - 11:00 (Morning Office & Workstation Clean)', start: '08:30', end: '11:00' },
  { label: '11:30 - 14:00 (Cafeteria Lunch Sanitation)', start: '11:30', end: '14:00' },
  { label: '14:00 - 16:00 (Restrooms & Surau Deep Clean)', start: '14:00', end: '16:00' },
  { label: '16:00 - 18:00 (Closing & Waste Mop)', start: '16:00', end: '18:00' },
];

export const NIGHT_SHIFT_PRESETS = [
  { label: '18:00 - 20:30 (Night Shift Handover & Labs)', start: '18:00', end: '20:30' },
  { label: '20:30 - 23:00 (VES 1 & VES 2 Production Lines)', start: '20:30', end: '23:00' },
  { label: '23:00 - 01:30 (Guardhouses & Perimeter Walkway)', start: '23:00', end: '01:30' },
  { label: '01:30 - 04:00 (Deep Degrease & Buffer Airlocks)', start: '01:30', end: '04:00' },
  { label: '04:00 - 06:00 (Final Waste & Morning Prep)', start: '04:00', end: '06:00' },
];

export function parseTimeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  
  // Clean up time string (e.g. "2:30 PM", "14:30", "02:30 am")
  const match = timeStr.trim().match(/^(\d+):(\d+)\s*(AM|PM|am|pm)?/i);
  if (!match) return 0;

  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();

  if (ampm === 'PM' && h < 12) {
    h += 12;
  } else if (ampm === 'AM' && h === 12) {
    h = 0;
  }

  return h * 60 + m;
}

/**
 * Determines whether a time falls into Day Shift (06:00 - 18:00) or Night Shift (18:00 - 06:00)
 */
export function getShiftTypeFromTime(timeStr: string): ShiftType {
  const totalMinutes = parseTimeStringToMinutes(timeStr);

  // Day shift is from 06:00 (360 mins) to 18:00 (1080 mins)
  if (totalMinutes >= 360 && totalMinutes < 1080) {
    return 'day';
  }
  return 'night';
}

/**
 * Converts a time string "HH:mm" into normalized minutes relative to a shift timeline.
 * For Day Shift (06:00 to 18:00): base is 06:00 (0 mins) to 18:00 (720 mins).
 * For Night Shift (18:00 to 06:00): base is 18:00 (0 mins) to 06:00 (720 mins).
 * For 24h timeline (06:00 to 06:00 next day): base is 06:00 (0 mins) to 1440 mins.
 */
export function timeToShiftRelativeMinutes(timeStr: string, mode: 'day' | 'night' | '24h' = '24h'): number {
  const rawMinutes = parseTimeStringToMinutes(timeStr);

  if (mode === 'day') {
    // 06:00 is 360 mins
    return rawMinutes - 360;
  }

  if (mode === 'night') {
    // 18:00 (1080 mins) to 23:59 (1439 mins) -> 0 to 359 mins
    // 00:00 (0 mins) to 06:00 (360 mins) -> 360 to 720 mins
    if (rawMinutes >= 1080) {
      return rawMinutes - 1080;
    } else {
      return rawMinutes + 360;
    }
  }

  // 24h mode starting at 06:00
  if (rawMinutes >= 360) {
    return rawMinutes - 360;
  } else {
    return rawMinutes + 1080; // 00:00 to 05:59 is next calendar segment in shift rotation
  }
}

/**
 * Formats 24h time string into clean 12-hour AM/PM format
 */
export function formatShiftTime(timeStr: string): string {
  if (!timeStr) return '';
  const match = timeStr.trim().match(/^(\d+):(\d+)\s*(AM|PM|am|pm)?/i);
  if (!match) return timeStr;

  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampmInStr = match[3]?.toUpperCase();

  if (ampmInStr) {
     return `${h}:${m} ${ampmInStr}`;
  }

  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  
  return `${h}:${m} ${ampm}`;
}
