import { collection, doc, setDoc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CleaningTask, NotificationItem, UserProfile, Zone, AuditLogItem } from '../types';
import { INITIAL_TASKS, INITIAL_NOTIFICATIONS, DEFAULT_USERS, DEFAULT_ZONES, INITIAL_AUDIT_LOGS, COMMON_TOOLS } from '../data/initialData';
import { compressImage, compressUltraSmallImage, generateVideoThumbnail } from './imageCompressor';

export const sanitizeForFirestore = <T extends Record<string, any>>(obj: T): T => {
  if (!obj || typeof obj !== 'object') return obj;
  const clean: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        clean[key] = sanitizeForFirestore(val);
      } else if (Array.isArray(val)) {
        clean[key] = val.map((item) => (item && typeof item === 'object' && !(item instanceof Date) ? sanitizeForFirestore(item) : item));
      } else {
        clean[key] = val;
      }
    }
  }
  return clean as T;
};

export const sanitizeToolForFirestore = async (tool: any): Promise<any> => {
  const clean = sanitizeForFirestore(tool);
  if (clean && clean.imageUrl && typeof clean.imageUrl === 'string' && clean.imageUrl.startsWith('data:') && clean.imageUrl.length > 50000) {
    try {
      clean.imageUrl = await compressImage(clean.imageUrl, 300, 300, 0.5);
    } catch (e) {
      console.warn('Tool image auto-compress fallback:', e);
    }
  }
  return clean;
};

export const sanitizeUserForFirestore = async (user: any): Promise<any> => {
  const clean = sanitizeForFirestore(user);
  if (clean && clean.avatar && typeof clean.avatar === 'string' && clean.avatar.startsWith('data:') && clean.avatar.length > 50000) {
    try {
      clean.avatar = await compressImage(clean.avatar, 200, 200, 0.5);
    } catch (e) {
      console.warn('User avatar auto-compress fallback:', e);
    }
  }
  return clean;
};

export const sanitizeTaskForFirestore = async (task: any): Promise<any> => {
  const clean = sanitizeForFirestore(task);

  // 1. Sanitize cleaner avatar
  if (clean.assignedCleanerAvatar && typeof clean.assignedCleanerAvatar === 'string' && clean.assignedCleanerAvatar.startsWith('data:') && clean.assignedCleanerAvatar.length > 30000) {
    try {
      clean.assignedCleanerAvatar = await compressImage(clean.assignedCleanerAvatar, 160, 160, 0.5);
    } catch (e) {
      console.warn('Avatar compression fallback in sanitizeTask:', e);
    }
  }

  // 2. Sanitize tools in toolsRequired
  if (Array.isArray(clean.toolsRequired)) {
    clean.toolsRequired = await Promise.all(
      clean.toolsRequired.map(async (tool: any) => {
        if (!tool || typeof tool !== 'object') return tool;
        const sanitizedTool = { ...tool };

        // Compress tool icon/image if large
        if (sanitizedTool.imageUrl && typeof sanitizedTool.imageUrl === 'string' && sanitizedTool.imageUrl.startsWith('data:') && sanitizedTool.imageUrl.length > 30000) {
          try {
            sanitizedTool.imageUrl = await compressImage(sanitizedTool.imageUrl, 240, 240, 0.45);
          } catch (e) {
            console.warn('Tool imageUrl compression fallback in sanitizeTask:', e);
          }
        }

        // Compress proof image per tool if large
        if (sanitizedTool.proofImage && typeof sanitizedTool.proofImage === 'string' && sanitizedTool.proofImage.startsWith('data:') && sanitizedTool.proofImage.length > 25000) {
          try {
            sanitizedTool.proofImage = await compressUltraSmallImage(sanitizedTool.proofImage);
          } catch (e) {
            console.warn('Tool proofImage compression fallback in sanitizeTask:', e);
          }
        }

        return sanitizedTool;
      })
    );
  }

  // 3. Sanitize proofs in proofsSubmitted
  if (Array.isArray(clean.proofsSubmitted)) {
    clean.proofsSubmitted = await Promise.all(
      clean.proofsSubmitted.map(async (proof: any) => {
        if (!proof || typeof proof !== 'object') return proof;
        const sanitizedProof = { ...proof };

        // Handle video proofs (avoid embedding 2MB-10MB raw video base64 into firestore documents)
        if (sanitizedProof.type === 'video' && sanitizedProof.url && typeof sanitizedProof.url === 'string' && sanitizedProof.url.length > 80000) {
          try {
            const videoThumb = await generateVideoThumbnail(sanitizedProof.url);
            if (videoThumb) {
              sanitizedProof.thumbnailUrl = videoThumb;
              sanitizedProof.url = videoThumb;
              sanitizedProof.caption = sanitizedProof.caption ? `${sanitizedProof.caption} (Video Record)` : 'Video Record';
            }
          } catch (e) {
            console.warn('Video proof thumbnail extraction fallback:', e);
          }
        }

        // Handle photo proofs (ensure strictly < 50KB each)
        if (sanitizedProof.type === 'image' && sanitizedProof.url && typeof sanitizedProof.url === 'string' && sanitizedProof.url.startsWith('data:') && sanitizedProof.url.length > 40000) {
          try {
            sanitizedProof.url = await compressImage(sanitizedProof.url, 600, 600, 0.5);
          } catch (e) {
            console.warn('Proof image compression fallback in sanitizeTask:', e);
          }
        }

        return sanitizedProof;
      })
    );
  }

  // 4. Global size defense limit check (< 500KB)
  try {
    const payloadSize = JSON.stringify(clean).length;
    if (payloadSize > 500000 && Array.isArray(clean.proofsSubmitted)) {
      clean.proofsSubmitted = await Promise.all(
        clean.proofsSubmitted.map(async (p: any) => {
          if (p.url && typeof p.url === 'string' && p.url.startsWith('data:')) {
            try {
              p.url = await compressUltraSmallImage(p.url);
            } catch {}
          }
          return p;
        })
      );
    }
  } catch (err) {
    console.warn('Payload size checking error:', err);
  }

  return clean;
};

export const fbAddTask = async (task: CleaningTask): Promise<boolean> => {
  try {
    const sanitized = await sanitizeTaskForFirestore(task);
    await setDoc(doc(db, 'tasks', task.id), sanitized);
    return true;
  } catch (error) {
    console.error('Firebase Add Task Error:', error);
    return false;
  }
};

export const fbUpdateTask = async (taskId: string, updates: Partial<CleaningTask>): Promise<boolean> => {
  try {
    const sanitized = await sanitizeTaskForFirestore(updates);
    await setDoc(doc(db, 'tasks', taskId), sanitized, { merge: true });
    return true;
  } catch (error) {
    console.error('Firebase Update Task Error:', error);
    return false;
  }
};

export const fbDeleteTask = async (taskId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
    return true;
  } catch (error) {
    console.error('Firebase Delete Task Error:', error);
    return false;
  }
};

export const fbClearTasks = async (taskIds: string[]): Promise<boolean> => {
  try {
    if (!taskIds || taskIds.length === 0) return true;
    const batch = writeBatch(db);
    taskIds.forEach((id) => {
      batch.delete(doc(db, 'tasks', id));
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Firebase Clear Tasks Error:', error);
    return false;
  }
};

export const fbAddNotification = async (notif: NotificationItem): Promise<boolean> => {
  try {
    await setDoc(doc(db, 'notifications', notif.id), sanitizeForFirestore(notif));
    return true;
  } catch (error) {
    console.error('Firebase Add Notification Error:', error);
    return false;
  }
};

export const fbDeleteNotification = async (notifId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'notifications', notifId));
    return true;
  } catch (error) {
    console.error('Firebase Delete Notification Error:', error);
    return false;
  }
};

export const fbUpdateUser = async (user: UserProfile): Promise<boolean> => {
  try {
    const cleanUser = await sanitizeUserForFirestore(user);
    await setDoc(doc(db, 'users', user.id), cleanUser);
    return true;
  } catch (error) {
    console.error('Firebase Update User Error:', error);
    return false;
  }
};

export const fbDeleteUserDoc = async (userId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'users', userId));
    return true;
  } catch (error) {
    console.error('Firebase Delete User Error:', error);
    return false;
  }
};

export const fbAddZone = async (zone: Zone): Promise<boolean> => {
  try {
    await setDoc(doc(db, 'zones', zone.id), sanitizeForFirestore(zone));
    return true;
  } catch (error) {
    console.error('Firebase Add Zone Error:', error);
    return false;
  }
};

export const fbUpdateZone = async (zoneId: string, updates: Partial<Zone>): Promise<boolean> => {
  try {
    await setDoc(doc(db, 'zones', zoneId), sanitizeForFirestore(updates), { merge: true });
    return true;
  } catch (error) {
    console.error('Firebase Update Zone Error:', error);
    return false;
  }
};

export const fbDeleteZone = async (zoneId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'zones', zoneId));
    return true;
  } catch (error) {
    console.error('Firebase Delete Zone Error:', error);
    return false;
  }
};

export const fbAddAuditLog = async (log: AuditLogItem): Promise<boolean> => {
  try {
    await setDoc(doc(db, 'auditLogs', log.id), sanitizeForFirestore(log));
    return true;
  } catch (error) {
    console.error('Firebase Add Audit Log Error:', error);
    return false;
  }
};

export const fbUpdateAuditLog = async (logId: string, updates: Partial<AuditLogItem>): Promise<boolean> => {
  try {
    await setDoc(doc(db, 'auditLogs', logId), sanitizeForFirestore(updates), { merge: true });
    return true;
  } catch (error) {
    console.error('Firebase Update Audit Log Error:', error);
    return false;
  }
};

export const fbDeleteAuditLog = async (logId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'auditLogs', logId));
    return true;
  } catch (error) {
    console.error('Firebase Delete Audit Log Error:', error);
    return false;
  }
};

export const fbAddTool = async (tool: any): Promise<boolean> => {
  try {
    const cleanTool = await sanitizeToolForFirestore(tool);
    await setDoc(doc(db, 'tools', tool.id), cleanTool);
    return true;
  } catch (error) {
    console.error('Firebase Add Tool Error:', error);
    return false;
  }
};

export const fbUpdateTool = async (toolId: string, updates: any): Promise<boolean> => {
  try {
    const cleanUpdates = await sanitizeToolForFirestore(updates);
    await setDoc(doc(db, 'tools', toolId), cleanUpdates, { merge: true });
    return true;
  } catch (error) {
    console.error('Firebase Update Tool Error:', error);
    return false;
  }
};

export const fbDeleteTool = async (toolId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'tools', toolId));
    return true;
  } catch (error) {
    console.error('Firebase Delete Tool Error:', error);
    return false;
  }
};

export const fbResetData = async (): Promise<boolean> => {
  try {
    const batch = writeBatch(db);
    INITIAL_TASKS.forEach(t => batch.set(doc(db, 'tasks', t.id), sanitizeForFirestore(t)));
    INITIAL_NOTIFICATIONS.forEach(n => batch.set(doc(db, 'notifications', n.id), sanitizeForFirestore(n)));
    DEFAULT_USERS.forEach(u => batch.set(doc(db, 'users', u.id), sanitizeForFirestore(u)));
    DEFAULT_ZONES.forEach(z => batch.set(doc(db, 'zones', z.id), sanitizeForFirestore(z)));
    INITIAL_AUDIT_LOGS.forEach(l => batch.set(doc(db, 'auditLogs', l.id), sanitizeForFirestore(l)));
    COMMON_TOOLS.forEach(t => batch.set(doc(db, 'tools', t.id), sanitizeForFirestore(t)));
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Firebase Reset Data Error:', error);
    return false;
  }
};


