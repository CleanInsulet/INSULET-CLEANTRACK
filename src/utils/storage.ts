import { CleaningTask, NotificationItem, UserProfile, UserRole, Zone, AuditLogItem, ToolItem } from '../types';
import { INITIAL_TASKS, INITIAL_NOTIFICATIONS, DEFAULT_USERS, DEFAULT_ZONES, INITIAL_AUDIT_LOGS, COMMON_TOOLS } from '../data/initialData';

const TASKS_KEY = 'cleantrack_tasks_v1';
const NOTIFS_KEY = 'cleantrack_notifications_v1';
const USERS_KEY = 'cleantrack_users_v2';
const ZONES_KEY = 'cleantrack_zones_v1';
const AUDIT_LOGS_KEY = 'cleantrack_audit_logs_v1';
const TOOLS_KEY = 'cleantrack_tools_v1';

export const getStoredTools = (): ToolItem[] => {
  try {
    const saved = localStorage.getItem(TOOLS_KEY);
    if (saved) {
      const parsed: ToolItem[] = JSON.parse(saved);
      // Auto-heal any oversized data URLs cached from before
      let hasOverSize = false;
      const sanitized = parsed.map((t) => {
        if (t.imageUrl && t.imageUrl.startsWith('data:') && t.imageUrl.length > 100000) {
          hasOverSize = true;
          const defaultTool = COMMON_TOOLS.find((ct) => ct.id === t.id);
          return { ...t, imageUrl: defaultTool?.imageUrl || '' };
        }
        return t;
      });
      if (hasOverSize) {
        safeSetLocalStorage(TOOLS_KEY, JSON.stringify(sanitized));
      }
      return sanitized;
    }
  } catch (e) {
    console.error('Failed to load tools from localStorage', e);
  }
  return COMMON_TOOLS;
};

/**
 * Strips or downscales large base64 data strings (e.g. data:image / data:video > 25KB)
 * for the localStorage offline cache payload to ensure browser storage quota is never exceeded.
 */
function sanitizeTasksForLocalStorage(tasks: CleaningTask[]): CleaningTask[] {
  return tasks.map((task) => {
    let modified = false;

    const sanitizedProofs = (task.proofsSubmitted || []).map((proof) => {
      if (proof.url && proof.url.startsWith('data:') && proof.url.length > 25000) {
        modified = true;
        return {
          ...proof,
          url: SAMPLE_PROOF_PHOTOS[0].url,
          caption: proof.caption ? `${proof.caption} (Saved in cloud)` : 'Saved in cloud'
        };
      }
      return proof;
    });

    const sanitizedTools = (task.toolsRequired || []).map((tool) => {
      if (tool.proofImage && tool.proofImage.startsWith('data:') && tool.proofImage.length > 25000) {
        modified = true;
        return {
          ...tool,
          proofImage: SAMPLE_PROOF_PHOTOS[1].url
        };
      }
      return tool;
    });

    if (!modified) return task;

    return {
      ...task,
      proofsSubmitted: sanitizedProofs,
      toolsRequired: sanitizedTools,
    };
  });
}

/**
 * Safely saves a key-value pair to localStorage.
 * Automatically handles QuotaExceededError by trimming non-critical historical data
 * or compressing/stripping heavy data URLs from offline cache payloads.
 */
function safeSetLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`localStorage setItem failed for key "${key}" (Quota limit hit). Performing automatic storage cleanup...`);

    // Stage 1: Clear non-critical log caches
    try {
      localStorage.removeItem(AUDIT_LOGS_KEY);
      localStorage.removeItem(NOTIFS_KEY);
      localStorage.setItem(key, value);
      return;
    } catch {
      // Proceed to Stage 2
    }

    // Stage 2: Sanitize heavy data URLs if saving tasks
    if (key === TASKS_KEY) {
      try {
        const tasksObj: CleaningTask[] = JSON.parse(value);
        const sanitizedTasks = sanitizeTasksForLocalStorage(tasksObj);
        localStorage.setItem(key, JSON.stringify(sanitizedTasks));
        return;
      } catch {
        // Proceed to Stage 3
      }

      // Stage 3: Keep only recent 25 tasks for local offline cache
      try {
        const tasksObj: CleaningTask[] = JSON.parse(value);
        const trimmedTasks = tasksObj.slice(0, 25).map((t) => ({
          ...t,
          proofsSubmitted: (t.proofsSubmitted || []).map((p) => ({
            ...p,
            url: p.url.startsWith('data:') ? SAMPLE_PROOF_PHOTOS[0].url : p.url
          }))
        }));
        localStorage.setItem(key, JSON.stringify(trimmedTasks));
        return;
      } catch {
        console.warn('Unable to cache tasks in localStorage. System will operate directly with Cloud/State.');
      }
    }
  }
}

export const saveStoredTools = (tools: ToolItem[]): void => {
  safeSetLocalStorage(TOOLS_KEY, JSON.stringify(tools));
};

export const getStoredUsers = (): UserProfile[] => {
  try {
    const saved = localStorage.getItem(USERS_KEY);
    if (saved) {
      const parsed: UserProfile[] = JSON.parse(saved);
      // Ensure 'insulet' (IT) exists if old cached data didn't have it
      if (!parsed.some(u => u.username === 'insulet' || u.role === 'it')) {
        const itUser = DEFAULT_USERS.find(u => u.username === 'insulet');
        if (itUser) {
          parsed.unshift(itUser);
          saveStoredUsers(parsed);
        }
      }
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load users from localStorage', e);
  }
  return DEFAULT_USERS;
};

export const saveStoredUsers = (users: UserProfile[]): void => {
  safeSetLocalStorage(USERS_KEY, JSON.stringify(users));
};

export const getStoredZones = (): Zone[] => {
  try {
    const saved = localStorage.getItem(ZONES_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load zones from localStorage', e);
  }
  return DEFAULT_ZONES;
};

export const saveStoredZones = (zones: Zone[]): void => {
  safeSetLocalStorage(ZONES_KEY, JSON.stringify(zones));
};

export const getStoredAuditLogs = (): AuditLogItem[] => {
  try {
    const saved = localStorage.getItem(AUDIT_LOGS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load audit logs from localStorage', e);
  }
  return INITIAL_AUDIT_LOGS;
};

export const saveStoredAuditLogs = (logs: AuditLogItem[]): void => {
  safeSetLocalStorage(AUDIT_LOGS_KEY, JSON.stringify(logs));
};

export const getStoredTasks = (): CleaningTask[] => {
  try {
    const saved = localStorage.getItem(TASKS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load tasks from localStorage', e);
  }
  return INITIAL_TASKS;
};

export const saveStoredTasks = (tasks: CleaningTask[]): void => {
  safeSetLocalStorage(TASKS_KEY, JSON.stringify(tasks));
};

export const getStoredNotifications = (): NotificationItem[] => {
  try {
    const saved = localStorage.getItem(NOTIFS_KEY);
    if (saved) {
      const parsed: NotificationItem[] = JSON.parse(saved);
      const seenIds = new Set<string>();
      return parsed.map((item, idx) => {
        let id = item.id;
        if (!id || seenIds.has(id)) {
          id = `notif-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
        }
        seenIds.add(id);
        return { ...item, id };
      });
    }
  } catch (e) {
    console.error('Failed to load notifications', e);
  }
  return INITIAL_NOTIFICATIONS;
};

export const saveStoredNotifications = (notifs: NotificationItem[]): void => {
  safeSetLocalStorage(NOTIFS_KEY, JSON.stringify(notifs));
};

export const formatTime = (time24: string): string => {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12.toString().padStart(2, '0')}:${mStr || '00'} ${ampm}`;
};

export const SAMPLE_PROOF_PHOTOS = [
  {
    name: 'Clean Sparkle Bathroom',
    url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Spotless Granite Floor',
    url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Sanitized Desk & Office',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Polished Glass & Entrance',
    url: 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Deep Cleaned Food Court',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800',
  },
];
