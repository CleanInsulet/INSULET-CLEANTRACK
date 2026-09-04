import { CleaningTask } from '../types';
import { timeToShiftRelativeMinutes, getShiftTypeFromTime } from './shiftUtils';

export interface PositionedTimelineTask {
  task: CleaningTask;
  level: number;
  totalLevels: number;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  leftPercent: number;
  widthPercent: number;
  topPx: number;
  heightPx: number;
}

export interface CleanerRowLayout {
  cleanerId: string;
  maxLevels: number;
  rowHeightPx: number;
  positionedTasks: PositionedTimelineTask[];
}

/**
 * Converts a "HH:mm" time string into total minutes from midnight.
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  const h = isNaN(parts[0]) ? 0 : parts[0];
  const m = isNaN(parts[1]) ? 0 : parts[1];
  return h * 60 + m;
}

/**
 * Core Overlap Detection & Level Allocation Algorithm.
 * Assigns each task in a cleaner's shift list to a non-overlapping vertical track (level / subRowIndex).
 */
export function assignTaskLevels(
  tasks: CleaningTask[],
  shiftMode: 'all' | 'day' | 'night' = 'all'
): { task: CleaningTask; level: number }[] {
  if (!tasks || tasks.length === 0) return [];

  // Sort tasks by delivery time ascending.
  const sorted = [...tasks].sort((a, b) => {
    const timeA = a.submittedAt || a.endTime || a.startTime;
    const timeB = b.submittedAt || b.endTime || b.startTime;
    const startA = timeToShiftRelativeMinutes(timeA, shiftMode === 'night' ? 'night' : shiftMode === 'day' ? 'day' : '24h');
    const startB = timeToShiftRelativeMinutes(timeB, shiftMode === 'night' ? 'night' : shiftMode === 'day' ? 'day' : '24h');
    return startA - startB;
  });

  // tracks[level] tracks the minute when that level track becomes free for the next task
  const tracks: number[] = [];
  const assignments: { task: CleaningTask; level: number }[] = [];

  for (const task of sorted) {
    const deliveryTime = task.submittedAt || task.endTime || task.startTime;
    const taskStart = timeToShiftRelativeMinutes(deliveryTime, shiftMode === 'night' ? 'night' : shiftMode === 'day' ? 'day' : '24h');
    const taskEnd = taskStart + 35; // Standard concise 35-min delivery slot

    let targetLevel = -1;

    // Look for the first existing track that is free
    for (let i = 0; i < tracks.length; i++) {
      if (tracks[i] <= taskStart) {
        targetLevel = i;
        tracks[i] = taskEnd;
        break;
      }
    }

    // If all existing tracks are busy at this interval, allocate a new track level
    if (targetLevel === -1) {
      tracks.push(taskEnd);
      targetLevel = tracks.length - 1;
    }

    assignments.push({ task, level: targetLevel });
  }

  return assignments;
}

/**
 * Calculates complete layout positions (left %, width %, top px, height px, row min-height)
 * for a cleaner's tasks within Day Shift (06:00-18:00), Night Shift (18:00-06:00), or 24h timeline.
 */
export function computeCleanerTimelineLayout(
  cleanerId: string,
  tasks: CleaningTask[],
  options?: {
    shiftMode?: 'all' | 'day' | 'night'; // default 'all'
    cardHeight?: number;    // default 60px
    cardGap?: number;       // default 6px
    paddingTop?: number;    // default 8px
    minRowHeight?: number;  // default 92px
  }
): CleanerRowLayout {
  const shiftMode = options?.shiftMode ?? 'all';
  const cardHeight = options?.cardHeight ?? 60;
  const cardGap = options?.cardGap ?? 6;
  const paddingTop = options?.paddingTop ?? 8;
  const minRowHeight = options?.minRowHeight ?? 92;

  // Filter tasks if in day or night specific mode
  const filteredTasks = tasks.filter((t) => {
    if (shiftMode === 'all') return true;
    const taskShift = t.shift || getShiftTypeFromTime(t.startTime);
    return taskShift === shiftMode;
  });

  // Total grid minutes: 720 for 12h Day/Night, 1440 for 24h
  const totalGridM = shiftMode === 'all' ? 1440 : 720;

  const levelAssignments = assignTaskLevels(filteredTasks, shiftMode);
  const maxLevels = levelAssignments.reduce((max, item) => Math.max(max, item.level + 1), 1);

  // Dynamic row height calculated from the number of concurrent levels
  const calculatedRowHeight =
    maxLevels === 1
      ? minRowHeight
      : paddingTop * 2 + maxLevels * cardHeight + (maxLevels - 1) * cardGap;

  const rowHeightPx = Math.max(minRowHeight, calculatedRowHeight);

  const positionedTasks: PositionedTimelineTask[] = levelAssignments.map(({ task, level }) => {
    const relMode = shiftMode === 'night' ? 'night' : shiftMode === 'day' ? 'day' : '24h';
    const deliveryTime = task.submittedAt || task.endTime || task.startTime;
    const startM = timeToShiftRelativeMinutes(deliveryTime, relMode);
    const duration = 35; // Clean 35-min standard delivery slot block
    const endM = startM + duration;

    // Calculate horizontal left & width percentages
    let leftPercent = (startM / totalGridM) * 100;
    let widthPercent = (duration / totalGridM) * 100;

    // Boundaries clamping
    leftPercent = Math.max(0, Math.min(96, leftPercent));
    widthPercent = Math.max(4, Math.min(100 - leftPercent, widthPercent));

    // Vertical top position based on level
    let topPx: number;
    let actualCardHeight: number;

    if (maxLevels === 1) {
      actualCardHeight = Math.min(cardHeight + 6, rowHeightPx - 16);
      topPx = Math.max(6, Math.floor((rowHeightPx - actualCardHeight) / 2));
    } else {
      actualCardHeight = cardHeight;
      topPx = paddingTop + level * (cardHeight + cardGap);
    }

    return {
      task,
      level,
      totalLevels: maxLevels,
      startMinutes: startM,
      endMinutes: endM,
      durationMinutes: duration,
      leftPercent,
      widthPercent,
      topPx,
      heightPx: actualCardHeight,
    };
  });

  return {
    cleanerId,
    maxLevels,
    rowHeightPx,
    positionedTasks,
  };
}
