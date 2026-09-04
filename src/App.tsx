import React, { useState, useEffect, useRef } from 'react';
import { CleaningTask, NotificationItem, UserProfile, ToolItem, MediaProof, Zone, AuditLogItem } from './types';
import { DEFAULT_USERS, DEFAULT_ZONES, INITIAL_TASKS, INITIAL_NOTIFICATIONS, INITIAL_AUDIT_LOGS, COMMON_TOOLS } from './data/initialData';
import {
  getStoredTasks,
  saveStoredTasks,
  getStoredNotifications,
  saveStoredNotifications,
  getStoredUsers,
  saveStoredUsers,
  getStoredZones,
  saveStoredZones,
  getStoredAuditLogs,
  saveStoredAuditLogs,
  getStoredTools,
  saveStoredTools,
} from './utils/storage';
import { triggerAppPushNotification } from './utils/soundAndNotifications';

import { fbAddTask, fbUpdateTask, fbDeleteTask, fbClearTasks, fbAddNotification, fbDeleteNotification, fbUpdateUser, fbDeleteUserDoc, fbResetData, fbAddZone, fbUpdateZone, fbDeleteZone, fbAddAuditLog, fbDeleteAuditLog, fbAddTool, fbUpdateTool, fbDeleteTool } from './utils/firebaseStorage';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Header } from './components/Header';
import { NotificationCenter } from './components/NotificationCenter';
import { ManagerDashboard } from './components/ManagerDashboard';
import { CleanerTimetable } from './components/CleanerTimetable';
import { SupervisorApproval } from './components/SupervisorApproval';
import { TaskSubmissionModal } from './components/TaskSubmissionModal';
import { TaskDetailsModal } from './components/TaskDetailsModal';
import { LiveNotificationToast } from './components/LiveNotificationToast';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { LoginPage } from './components/LoginPage';
import { SettingsModal } from './components/SettingsModal';
import { ITDashboard } from './components/ITDashboard';

import { Users, Clock, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

export default function App() {
  const [tasks, setTasks] = useState<CleaningTask[]>(() => getStoredTasks());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => getStoredNotifications());
  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => getStoredUsers());
  const [zones, setZones] = useState<Zone[]>(() => getStoredZones());
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => getStoredAuditLogs());
  const [tools, setTools] = useState<ToolItem[]>(() => getStoredTools());
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginPortal, setLoginPortal] = useState<'management' | 'cleaner'>('management');
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => allUsers[0] || DEFAULT_USERS[0]);
  const [mainSystem, setMainSystem] = useState<'management' | 'cleaner'>('management');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);

  // Modals state
  const [submittingTask, setSubmittingTask] = useState<CleaningTask | null>(null);
  const [inspectingTask, setInspectingTask] = useState<CleaningTask | null>(null);

  const knownNotifIdsRef = useRef<Set<string>>(new Set());
  const isInitialNotifLoadRef = useRef<boolean>(true);
  const isTasksSeededRef = useRef<boolean>(false);
  const isUsersSeededRef = useRef<boolean>(false);
  const isZonesSeededRef = useRef<boolean>(false);
  const isToolsSeededRef = useRef<boolean>(false);
  const isAuditLogsSeededRef = useRef<boolean>(false);
  const currentUserRef = useRef<UserProfile>(currentUser);
  currentUserRef.current = currentUser;

  // Helper to check if a notification belongs to a user
  const isNotificationForUser = (notif: NotificationItem, user: UserProfile) => {
    // 1. Check targetUserId (specific worker or all)
    if (notif.targetUserId && notif.targetUserId !== 'all') {
      if (notif.targetUserId !== user.id) return false;
    }
    // 2. Check recipientRole
    if (notif.recipientRole && notif.recipientRole !== 'all') {
      if (notif.recipientRole === 'cleaner' && user.role !== 'cleaner') return false;
      if (notif.recipientRole === 'manager' && user.role !== 'manager' && user.role !== 'supervisor') return false;
      if (notif.recipientRole === 'supervisor' && user.role !== 'manager' && user.role !== 'supervisor') return false;
      if (notif.recipientRole === 'management' && user.role !== 'manager' && user.role !== 'supervisor') return false;
    }
    return true;
  };

  useEffect(() => {
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      if (!snapshot.empty) {
        isTasksSeededRef.current = true;
        const loadedTasks = snapshot.docs.map(doc => doc.data() as CleaningTask).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTasks(loadedTasks);
        saveStoredTasks(loadedTasks);
      } else if (!isTasksSeededRef.current) {
        isTasksSeededRef.current = true;
        const localTasks = getStoredTasks();
        if (localTasks.length > 0) {
          localTasks.forEach(t => fbAddTask(t));
          setTasks(localTasks);
        } else {
          INITIAL_TASKS.forEach(t => fbAddTask(t));
          setTasks(INITIAL_TASKS);
          saveStoredTasks(INITIAL_TASKS);
        }
      } else {
        setTasks([]);
        saveStoredTasks([]);
      }
    }, (err) => console.warn('Firestore tasks listener error:', err));

    const unsubNotifs = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      if (!snapshot.empty) {
        const loadedNotifs = snapshot.docs.map(doc => doc.data() as NotificationItem).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        // Detect newly arrived notifications for real-time chime & toast popup
        if (!isInitialNotifLoadRef.current && knownNotifIdsRef.current.size > 0) {
          const freshNotifs = loadedNotifs.filter(n => !knownNotifIdsRef.current.has(n.id));
          for (const fresh of freshNotifs) {
            if (isNotificationForUser(fresh, currentUserRef.current)) {
              triggerAppPushNotification(fresh.title, fresh.message);
              setActiveToast(fresh);
              break;
            }
          }
        }
        
        loadedNotifs.forEach(n => knownNotifIdsRef.current.add(n.id));
        isInitialNotifLoadRef.current = false;

        setNotifications(loadedNotifs);
        saveStoredNotifications(loadedNotifs);
      } else {
        INITIAL_NOTIFICATIONS.forEach(n => fbAddNotification(n));
      }
    }, (err) => console.warn('Firestore notifications listener error:', err));

    const unsubUsers = onSnapshot(collection(db, 'users'), async (snapshot) => {
      if (!snapshot.empty) {
        isUsersSeededRef.current = true;
        const loadedUsers = snapshot.docs.map(doc => doc.data() as UserProfile);
        
        // Detect obsolete/old mock users
        const obsoleteUserIds = ['cln-1', 'cln-2', 'cln-3', 'cln-4', 'sup-1'];
        const hasObsoleteUsers = loadedUsers.some(u => 
          obsoleteUserIds.includes(u.id) ||
          ['Ahmad Razak', 'Siti Nurhaliza', 'Carlos Mendez', 'Noraini Kassim', 'Elena Rostova'].includes(u.name)
        );

        if (hasObsoleteUsers) {
          for (const docSnap of snapshot.docs) {
            const data = docSnap.data() as UserProfile;
            if (
              obsoleteUserIds.includes(data.id) ||
              obsoleteUserIds.includes(docSnap.id) ||
              ['Ahmad Razak', 'Siti Nurhaliza', 'Carlos Mendez', 'Noraini Kassim', 'Elena Rostova'].includes(data.name)
            ) {
              try {
                await deleteDoc(doc(db, 'users', docSnap.id));
              } catch (err) {
                console.warn('Error deleting obsolete user doc:', err);
              }
            }
          }
          for (let i = 0; i < DEFAULT_USERS.length; i++) {
            await fbUpdateUser({ ...DEFAULT_USERS[i], orderIndex: i });
          }
          return;
        }

        // Ensure IT user exists in Firebase (in case of legacy data)
        if (!loadedUsers.some(u => u.username === 'insulet' || u.role === 'it')) {
          const itUser = DEFAULT_USERS.find(u => u.username === 'insulet');
          if (itUser) {
            loadedUsers.unshift(itUser);
            fbUpdateUser(itUser);
          }
        }
        
        // Sort users by custom orderIndex if available
        loadedUsers.sort((a, b) => {
          if (a.orderIndex !== undefined && b.orderIndex !== undefined) return a.orderIndex - b.orderIndex;
          if (a.orderIndex !== undefined) return -1;
          if (b.orderIndex !== undefined) return 1;
          return 0;
        });

        setAllUsers(loadedUsers);
        saveStoredUsers(loadedUsers);
      } else if (!isUsersSeededRef.current) {
        isUsersSeededRef.current = true;
        DEFAULT_USERS.forEach((u, idx) => fbUpdateUser({ ...u, orderIndex: idx }));
      } else {
        setAllUsers([]);
        saveStoredUsers([]);
      }
    }, (err) => console.warn('Firestore users listener error:', err));

    const unsubZones = onSnapshot(collection(db, 'zones'), async (snapshot) => {
      if (!snapshot.empty) {
        isZonesSeededRef.current = true;
        const loadedZones = snapshot.docs.map(doc => doc.data() as Zone);

        // Detect if loaded zones contain outdated/obsolete test zones or compound slash-grouped zones
        const obsoleteZoneNames = [
          'Facilities Office', 'Management Office', 'Cleanroom', 'Utility Plant', 'Warehouse',
          'LABS / WAREHOUSE', 'VES 1 / VES 2 / LOCKER AREA / FINAL PACK / TB / SURAU PEREMPUAN',
          'OFFICE / LOBBY / LIFT / LEVEL 1', 'GUARDHOUSE 1, 2, 3 / FM OFFICE',
          'OFFICE WALKWAY / FM TOILET PEREMPUAN / SURAU AREA', 'VES 1 / VES 2 / TB / TOILET & SURAU PEREMPUAN',
          'OFFICE / FEMALE OFFICE TOILET', 'VES 1 / VES 2 / MALE TOILET 1/2 & SMOKING AREA',
          'GUARD HOUSE 2 / LABS', 'OFFICE / MALE TOILET / LOBBY / GUARD HOUSE 1'
        ];
        const hasCompoundOrObsoleteZones = loadedZones.some(z => 
          obsoleteZoneNames.includes(z.name) || 
          z.name.includes(' / ') || 
          z.name.includes('1, 2, 3') ||
          ['z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z-labs-wh', 'z-ves-pack', 'z-off-lobby', 'z-guard-fm', 'z-off-walkway-surau', 'z-ves-toilet-surau', 'z-off-fem-toilet', 'z-ves-male-smoking', 'z-guard2-labs', 'z-off-male-guard1'].includes(z.id)
        );

        if (hasCompoundOrObsoleteZones) {
          // Clean up compound/obsolete zones from Firestore and seed the individual distinct separated zones
          for (const docSnap of snapshot.docs) {
            const data = docSnap.data() as Zone;
            if (
              obsoleteZoneNames.includes(data.name) ||
              data.name.includes(' / ') ||
              data.name.includes('1, 2, 3') ||
              ['z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z-labs-wh', 'z-ves-pack', 'z-off-lobby', 'z-guard-fm', 'z-off-walkway-surau', 'z-ves-toilet-surau', 'z-off-fem-toilet', 'z-ves-male-smoking', 'z-guard2-labs', 'z-off-male-guard1'].includes(data.id) ||
              ['z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z-labs-wh', 'z-ves-pack', 'z-off-lobby', 'z-guard-fm', 'z-off-walkway-surau', 'z-ves-toilet-surau', 'z-off-fem-toilet', 'z-ves-male-smoking', 'z-guard2-labs', 'z-off-male-guard1'].includes(docSnap.id)
            ) {
              try {
                await deleteDoc(doc(db, 'zones', docSnap.id));
              } catch (err) {
                console.warn('Error deleting compound/obsolete zone doc:', err);
              }
            }
          }
          for (let i = 0; i < DEFAULT_ZONES.length; i++) {
            await fbAddZone({ ...DEFAULT_ZONES[i], orderIndex: i });
          }
          return;
        }

        loadedZones.sort((a, b) => {
          if (a.orderIndex !== undefined && b.orderIndex !== undefined) return a.orderIndex - b.orderIndex;
          if (a.orderIndex !== undefined) return -1;
          if (b.orderIndex !== undefined) return 1;
          return 0;
        });
        setZones(loadedZones);
        saveStoredZones(loadedZones);
      } else if (!isZonesSeededRef.current) {
        isZonesSeededRef.current = true;
        DEFAULT_ZONES.forEach((z, idx) => fbAddZone({ ...z, orderIndex: idx }));
      } else {
        setZones([]);
        saveStoredZones([]);
      }
    }, (err) => console.warn('Firestore zones listener error:', err));

    const unsubAuditLogs = onSnapshot(collection(db, 'auditLogs'), (snapshot) => {
      if (!snapshot.empty) {
        isAuditLogsSeededRef.current = true;
        const loadedLogs = snapshot.docs.map(doc => doc.data() as AuditLogItem);
        // Sort newest first
        loadedLogs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAuditLogs(loadedLogs);
        saveStoredAuditLogs(loadedLogs);
      } else if (!isAuditLogsSeededRef.current) {
        isAuditLogsSeededRef.current = true;
        INITIAL_AUDIT_LOGS.forEach(log => fbAddAuditLog(log));
      } else {
        setAuditLogs([]);
        saveStoredAuditLogs([]);
      }
    }, (err) => console.warn('Firestore auditLogs listener error:', err));
    
    const unsubTools = onSnapshot(collection(db, 'tools'), (snapshot) => {
      if (!snapshot.empty) {
        isToolsSeededRef.current = true;
        const loadedTools = snapshot.docs.map(doc => doc.data() as ToolItem);
        loadedTools.sort((a, b) => {
          if (a.orderIndex !== undefined && b.orderIndex !== undefined) return a.orderIndex - b.orderIndex;
          if (a.orderIndex !== undefined) return -1;
          if (b.orderIndex !== undefined) return 1;
          return 0;
        });
        setTools(loadedTools);
        saveStoredTools(loadedTools);
      } else if (!isToolsSeededRef.current) {
        isToolsSeededRef.current = true;
        COMMON_TOOLS.forEach((t, idx) => fbAddTool({ ...t, orderIndex: idx }));
      } else {
        setTools([]);
        saveStoredTools([]);
      }
    }, (err) => console.warn('Firestore tools listener error:', err));
    
    return () => { 
      unsubUsers(); 
      unsubTasks(); 
      unsubNotifs(); 
      unsubZones();
      unsubAuditLogs();
      unsubTools();
    };
  }, []);

  // Profile Update Handler
  const handleUpdateProfile = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
    fbUpdateUser(updatedUser);
    setAllUsers(prev => {
      const updated = prev.map(u => u.id === updatedUser.id ? updatedUser : u);
      saveStoredUsers(updated);
      return updated;
    });
  };

  const handleUpdateOtherUser = (updatedUser: UserProfile) => {
    fbUpdateUser(updatedUser);
    setAllUsers(prev => {
      const exists = prev.some(u => u.id === updatedUser.id);
      const updated = exists ? prev.map(u => u.id === updatedUser.id ? updatedUser : u) : [updatedUser, ...prev];
      saveStoredUsers(updated);
      return updated;
    });
  };

  // User Registration Handler
  const handleRegisterUser = (newUser: UserProfile) => {
    fbUpdateUser(newUser);
    setAllUsers(prev => {
      const updated = [newUser, ...prev.filter(u => u.id !== newUser.id)];
      saveStoredUsers(updated);
      return updated;
    });
  };

  // Reorder Users in IT Administration
  const handleReorderUsers = (reorderedUsers: UserProfile[]) => {
    const idMap = new Map(reorderedUsers.map((u, idx) => [u.id, idx]));
    setAllUsers(prev => {
      const updated = prev.map(u => {
        if (idMap.has(u.id)) {
          return { ...u, orderIndex: idMap.get(u.id) };
        }
        return u;
      });
      updated.sort((a, b) => {
        if (a.orderIndex !== undefined && b.orderIndex !== undefined) return a.orderIndex - b.orderIndex;
        if (a.orderIndex !== undefined) return -1;
        if (b.orderIndex !== undefined) return 1;
        return 0;
      });
      saveStoredUsers(updated);
      return updated;
    });

    for (const [userId, orderIndex] of idMap.entries()) {
      const user = allUsers.find(u => u.id === userId);
      if (user) {
        fbUpdateUser({ ...user, orderIndex });
      }
    }
  };

  // Reorder Zones
  const handleReorderZones = (reorderedZones: Zone[]) => {
    const idMap = new Map(reorderedZones.map((z, idx) => [z.id, idx]));
    setZones(prev => {
      const updated = prev.map(z => {
        if (idMap.has(z.id)) {
          return { ...z, orderIndex: idMap.get(z.id) };
        }
        return z;
      });
      updated.sort((a, b) => {
        if (a.orderIndex !== undefined && b.orderIndex !== undefined) return a.orderIndex - b.orderIndex;
        if (a.orderIndex !== undefined) return -1;
        if (b.orderIndex !== undefined) return 1;
        return 0;
      });
      saveStoredZones(updated);
      return updated;
    });

    for (const [zoneId, orderIndex] of idMap.entries()) {
      fbUpdateZone(zoneId, { orderIndex });
    }
  };

  // Reorder Tools
  const handleReorderTools = (reorderedTools: ToolItem[]) => {
    const idMap = new Map(reorderedTools.map((t, idx) => [t.id, idx]));
    setTools(prev => {
      const updated = prev.map(t => {
        if (idMap.has(t.id)) {
          return { ...t, orderIndex: idMap.get(t.id) };
        }
        return t;
      });
      updated.sort((a, b) => {
        if (a.orderIndex !== undefined && b.orderIndex !== undefined) return a.orderIndex - b.orderIndex;
        if (a.orderIndex !== undefined) return -1;
        if (b.orderIndex !== undefined) return 1;
        return 0;
      });
      saveStoredTools(updated);
      return updated;
    });

    for (const [toolId, orderIndex] of idMap.entries()) {
      fbUpdateTool(toolId, { orderIndex });
    }
  };

  // User Deletion Handler (Deletes user document from Firestore & state)
  const handleDeleteUser = async (userId: string) => {
    await fbDeleteUserDoc(userId);
    setAllUsers(prev => {
      const updated = prev.filter(u => u.id !== userId);
      saveStoredUsers(updated);
      return updated;
    });

    const todayStr = new Date().toISOString().split('T')[0];
    tasks.forEach(t => {
      if (t.assignedCleanerId === userId && t.date >= todayStr && t.status !== 'approved') {
        fbDeleteTask(t.id);
      }
    });
  };

  const handleAddZone = (zone: Zone) => {
    fbAddZone(zone);
    setZones(prev => {
      const updated = [zone, ...prev.filter(z => z.id !== zone.id)];
      saveStoredZones(updated);
      return updated;
    });
  };

  const handleUpdateZone = (zone: Zone) => {
    fbUpdateZone(zone.id, zone);
    setZones(prev => {
      const updated = prev.map(z => z.id === zone.id ? zone : z);
      saveStoredZones(updated);
      return updated;
    });
  };

  const handleDeleteZone = async (zoneId: string) => {
    await fbDeleteZone(zoneId);
    setZones(prev => {
      const updated = prev.filter(z => z.id !== zoneId);
      saveStoredZones(updated);
      return updated;
    });
  };

  const handleAddTool = async (tool: ToolItem) => {
    let finalTool = tool;
    if (finalTool.imageUrl && finalTool.imageUrl.startsWith('data:') && finalTool.imageUrl.length > 80000) {
      try {
        const { compressImage } = await import('./utils/imageCompressor');
        finalTool = { ...finalTool, imageUrl: await compressImage(finalTool.imageUrl, 400, 400, 0.6) };
      } catch (e) {
        console.warn('Compress tool image fallback:', e);
      }
    }
    await fbAddTool(finalTool);
    setTools(prev => {
      const updated = [finalTool, ...prev.filter(t => t.id !== finalTool.id)];
      saveStoredTools(updated);
      return updated;
    });
  };

  const handleUpdateTool = async (tool: ToolItem) => {
    let finalTool = tool;
    if (finalTool.imageUrl && finalTool.imageUrl.startsWith('data:') && finalTool.imageUrl.length > 80000) {
      try {
        const { compressImage } = await import('./utils/imageCompressor');
        finalTool = { ...finalTool, imageUrl: await compressImage(finalTool.imageUrl, 400, 400, 0.6) };
      } catch (e) {
        console.warn('Compress tool image fallback:', e);
      }
    }
    await fbUpdateTool(finalTool.id, finalTool);
    setTools(prev => {
      const updated = prev.map(t => t.id === finalTool.id ? finalTool : t);
      saveStoredTools(updated);
      return updated;
    });
  };

  const handleDeleteTool = async (toolId: string) => {
    await fbDeleteTool(toolId);
    setTools(prev => {
      const updated = prev.filter(t => t.id !== toolId);
      saveStoredTools(updated);
      return updated;
    });
  };

  const handleDeleteAuditLog = (logId: string) => {
    fbDeleteAuditLog(logId);
  };

  // Login & Logout Handlers
  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    if (user.role === 'cleaner') {
      setMainSystem('cleaner');
    } else {
      setMainSystem('management');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setLoginPortal(mainSystem);
    setIsLoggedIn(false);
  };

  // Adjust default view when switching role
  const handleSwitchUser = (user: UserProfile) => {
    setCurrentUser(user);
    if (user.role === 'cleaner') {
      setMainSystem('cleaner');
    } else {
      setMainSystem('management');
    }
  };

  // Notification Push Helper - Synchronizes directly to Firestore for 24/7 cross-device delivery
  const pushNotification = (
    title: string,
    message: string,
    type: NotificationItem['type'],
    taskId?: string,
    recipientRole: NotificationItem['recipientRole'] = 'all',
    targetUserId: string | 'all' = 'all'
  ) => {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
      type,
      taskId,
      recipientRole,
      targetUserId,
    };
    
    knownNotifIdsRef.current.add(newNotif.id);
    setNotifications((prev) => [newNotif, ...prev]);
    fbAddNotification(newNotif);

    // If current logged-in user matches, ring audio chime and show in-app toast
    if (isNotificationForUser(newNotif, currentUser)) {
      triggerAppPushNotification(title, message);
      setActiveToast(newNotif);
    }
  };

  // Manager Actions: Add Task (targeted to assigned cleaner)
  const handleAddTask = async (newTaskData: Omit<CleaningTask, 'id' | 'createdAt'>) => {
    const newTask: CleaningTask = {
      ...newTaskData,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    
    // Immediate Optimistic Update
    setTasks((prev) => {
      const updated = [newTask, ...prev.filter((t) => t.id !== newTask.id)];
      saveStoredTasks(updated);
      return updated;
    });

    await fbAddTask(newTask);
    pushNotification(
      '🔔 New Shift Task Assigned',
      `You were assigned "${newTask.title}" at ${newTask.location} (${newTask.startTime} - ${newTask.endTime}) on ${newTask.date}.`,
      'task_assigned',
      newTask.id,
      'cleaner',
      newTask.assignedCleanerId
    );
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== taskId);
      saveStoredTasks(updated);
      return updated;
    });
    await fbDeleteTask(taskId);
  };

  // Manager Actions: Update Task (targeted notification on time/reassignment)
  const handleUpdateTask = async (taskId: string, updates: Partial<CleaningTask>) => {
    const existingTask = tasks.find((t) => t.id === taskId);
    
    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
      saveStoredTasks(updated);
      return updated;
    });

    await fbUpdateTask(taskId, updates);

    if (existingTask) {
      // 1. Worker reassignment
      if (updates.assignedCleanerId && updates.assignedCleanerId !== existingTask.assignedCleanerId) {
        // Notify newly assigned worker
        pushNotification(
          '🔔 New Shift Task Assigned',
          `You were assigned "${existingTask.title}" at ${existingTask.location} (${updates.startTime || existingTask.startTime} - ${updates.endTime || existingTask.endTime}) on ${updates.date || existingTask.date}.`,
          'task_assigned',
          taskId,
          'cleaner',
          updates.assignedCleanerId
        );
        // Notify previously assigned worker
        pushNotification(
          '📋 Task Reassigned',
          `Your duty "${existingTask.title}" at ${existingTask.location} was reassigned to another cleaner by Manager.`,
          'shift_change',
          taskId,
          'cleaner',
          existingTask.assignedCleanerId
        );
      } 
      // 2. Schedule timing or date changed for the same cleaner
      else if (
        (updates.startTime && updates.startTime !== existingTask.startTime) ||
        (updates.endTime && updates.endTime !== existingTask.endTime) ||
        (updates.date && updates.date !== existingTask.date)
      ) {
        const newStart = updates.startTime || existingTask.startTime;
        const newEnd = updates.endTime || existingTask.endTime;
        const newDate = updates.date || existingTask.date;
        pushNotification(
          '⏰ Shift Schedule Time Updated',
          `Your duty "${existingTask.title}" at ${existingTask.location} has updated shift timing: ${newStart} - ${newEnd} on ${newDate}.`,
          'shift_change',
          taskId,
          'cleaner',
          existingTask.assignedCleanerId
        );
      }
    }
  };

  // Reorder tasks (drag-and-drop or move up/down)
  const handleReorderTasks = (reorderedTasks: CleaningTask[]) => {
    const idMap = new Map(reorderedTasks.map((t, idx) => [t.id, idx]));
    setTasks((prev) =>
      prev.map((t) => {
        if (idMap.has(t.id)) {
          return { ...t, orderIndex: idMap.get(t.id) };
        }
        return t;
      })
    );

    for (const [taskId, orderIndex] of idMap.entries()) {
      fbUpdateTask(taskId, { orderIndex });
    }
  };

  // Cleaner Actions: Submit Duty for Manager Approval
  const handleSubmitCleanerWork = (
    taskId: string,
    updatedTools: ToolItem[],
    proofs: MediaProof[],
    cleanerNotes: string
  ) => {
    const existingTask = tasks.find((t) => t.id === taskId);
    const submittedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (existingTask) {
      fbUpdateTask(taskId, {
        status: 'submitted',
        toolsRequired: updatedTools,
        proofsSubmitted: proofs,
        cleanerNotes,
        submittedAt: submittedTime,
      });
      setTasks((prev) => {
        const updated = prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: 'submitted' as const,
                toolsRequired: updatedTools,
                proofsSubmitted: proofs,
                cleanerNotes,
                submittedAt: submittedTime,
              }
            : t
        );
        saveStoredTasks(updated);
        return updated;
      });
    } else if (submittingTask) {
      // It's a new fixed area task delivered for this date
      const newTask: CleaningTask = {
        ...submittingTask,
        id: taskId,
        status: 'submitted',
        toolsRequired: updatedTools,
        proofsSubmitted: proofs,
        cleanerNotes,
        submittedAt: submittedTime,
      };
      fbAddTask(newTask);
      setTasks((prev) => {
        const updated = [newTask, ...prev.filter((t) => t.id !== taskId)];
        saveStoredTasks(updated);
        return updated;
      });
    }

    // Notify Manager and Supervisor that submission is ready for verification
    pushNotification(
      '📋 Task Submitted - Verification Required',
      `${currentUser.name} completed duty "${submittingTask?.title || existingTask?.title || 'Cleaning Task'}" at ${submittingTask?.location || existingTask?.location || 'Zone'}. Photo proof attached. Waiting for verification.`,
      'task_submitted',
      taskId,
      'management',
      'all'
    );
  };

  // Supervisor / Manager Actions: Approve Task
  const handleApproveTask = (taskId: string, rating: number, feedback: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    fbUpdateTask(taskId, {
      status: 'approved',
      inspectionLog: {
        timestamp,
        supervisorName: currentUser.name,
        action: 'approved',
        rating,
        feedback,
      },
    });

    const taskObj = tasks.find((t) => t.id === taskId);
    // Notify the cleaner specifically that their task is approved & completed
    pushNotification(
      `✅ Task Approved & Completed (⭐${rating}.0)`,
      `Manager ${currentUser.name} verified your work on "${taskObj?.title || 'Duty'}". ${feedback ? `Comment: "${feedback}"` : 'Marked as Completed!'}`,
      'submission_approved',
      taskId,
      'cleaner',
      taskObj?.assignedCleanerId || 'all'
    );
  };

  // Supervisor / Manager Actions: Request Rework / Reject
  const handleRequestRework = (taskId: string, rating: number, feedback: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    fbUpdateTask(taskId, {
      status: 'rework_requested',
      inspectionLog: {
        timestamp,
        supervisorName: currentUser.name,
        action: 'rework_requested',
        rating,
        feedback,
      },
    });

    const taskObj = tasks.find((t) => t.id === taskId);
    // Notify the cleaner specifically that rework is needed
    pushNotification(
      `⚠️ Task Rework Required (⭐${rating}.0)`,
      `Manager ${currentUser.name} reviewed "${taskObj?.title || 'Duty'}" and requested rework. Reason: "${feedback || 'Please clean again according to standard.'}"`,
      'rework_needed',
      taskId,
      'cleaner',
      taskObj?.assignedCleanerId || 'all'
    );
  };

  // Quick Manager Direct Approve
  const handleQuickApprove = (taskId: string) => {
    handleApproveTask(taskId, 5, 'Quick verified and approved by Manager.');
  };

  // Broadcast Alert to all workers
  const handleBroadcastAlert = (title: string, message: string) => {
    pushNotification(title, message, 'urgent_alert', undefined, 'all');
  };

  // Clear All Tasks
  const handleClearAllTasks = async () => {
    if (tasks.length === 0) return;
    const ids = tasks.map((t) => t.id);
    setTasks([]);
    saveStoredTasks([]);
    await fbClearTasks(ids);
    pushNotification(
      '🗑️ Area Duty Records Cleared',
      `All ${ids.length} duty records in Area Duty Tables have been successfully removed.`,
      'shift_change',
      undefined,
      'manager'
    );
  };

  // Clear Outdated Tasks whose zones are not in active IT zones
  const handleClearOutdatedTasks = async (validZoneNames: string[]) => {
    const outdated = tasks.filter((t) => !validZoneNames.includes(t.zone));
    if (outdated.length === 0) return;
    const ids = outdated.map((t) => t.id);
    const remaining = tasks.filter((t) => validZoneNames.includes(t.zone));
    setTasks(remaining);
    saveStoredTasks(remaining);
    await fbClearTasks(ids);
    pushNotification(
      '🧹 Outdated Area Duty Records Cleared',
      `Removed ${ids.length} duty records with outdated area/zone locations.`,
      'shift_change',
      undefined,
      'manager'
    );
  };

  // Reset Demo Data
  const handleResetData = async () => {
    if (confirm('Reset clean track schedule to default demo data?')) {
      setTasks(INITIAL_TASKS);
      setNotifications(INITIAL_NOTIFICATIONS);
      saveStoredTasks(INITIAL_TASKS);
      saveStoredNotifications(INITIAL_NOTIFICATIONS);
      await fbResetData();
    }
  };

  // Calculate unread count strictly for current user
  const unreadNotifCount = notifications.filter(
    (n) => !n.read && isNotificationForUser(n, currentUser)
  ).length;

  // Handle direct action from Toast or Notification center
  const handleOpenTaskFromNotification = (task: CleaningTask) => {
    if (currentUser.role === 'cleaner') {
      setSubmittingTask(task);
    } else {
      setInspectingTask(task);
    }
  };

  if (!isLoggedIn) {
    return <LoginPage users={allUsers} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen w-full bg-[#F1F5F9] text-slate-800 font-sans antialiased flex flex-col">
      
      {/* Live Interactive Floating Notification Toast */}
      <LiveNotificationToast
        notification={activeToast}
        currentUser={currentUser}
        tasks={tasks}
        onClose={() => setActiveToast(null)}
        onActionClick={(task) => handleOpenTaskFromNotification(task)}
      />

      {/* Header Bar */}
      <Header
        currentUser={currentUser}
        allUsers={allUsers}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
        unreadCount={unreadNotifCount}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        onResetData={handleResetData}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* Main Screen Body based on logged-in user role */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-6 lg:px-8 py-2 sm:py-4 flex flex-col min-w-0 overflow-x-hidden">
        {currentUser.role === 'it' ? (
          <ITDashboard 
            allUsers={allUsers}
            zones={zones}
            tools={tools}
            currentUser={currentUser}
            onUpdateUser={handleUpdateOtherUser}
            onDeleteUser={handleDeleteUser}
            onReorderUsers={handleReorderUsers}
            onAddZone={handleAddZone}
            onUpdateZone={handleUpdateZone}
            onDeleteZone={handleDeleteZone}
            onReorderZones={handleReorderZones}
            onAddTool={handleAddTool}
            onUpdateTool={handleUpdateTool}
            onDeleteTool={handleDeleteTool}
            onReorderTools={handleReorderTools}
          />
        ) : currentUser.role !== 'cleaner' ? (
          <ManagerDashboard
            tasks={tasks}
            zones={zones}
            tools={tools}
            cleaners={allUsers.filter((u) => u.role === 'cleaner')}
            currentUser={currentUser}
            onDeleteTask={handleDeleteTask}
            onClearAllTasks={handleClearAllTasks}
            onClearOutdatedTasks={handleClearOutdatedTasks}
            onSelectTask={(task) => setInspectingTask(task)}
            onQuickApprove={handleQuickApprove}
            onBroadcastAlert={handleBroadcastAlert}
            onApproveTask={handleApproveTask}
            onRequestRework={handleRequestRework}
          />
        ) : (
          <CleanerTimetable
            tasks={tasks}
            currentUser={currentUser}
            cleaners={allUsers.filter((u) => u.role === 'cleaner')}
            zones={zones}
            tools={tools}
            onSelectCleaner={(cleanerId) => {
              const selected = allUsers.find((u) => u.id === cleanerId);
              if (selected && selected.role === 'cleaner') setCurrentUser(selected);
            }}
            onOpenTaskModal={(task) => setSubmittingTask(task)}
            onReorderTasks={handleReorderTasks}
            onUpdateTask={handleUpdateTask}
          />
        )}
      </main>

      {/* Drawer: Notifications Center */}
      <NotificationCenter
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        tasks={tasks}
        onMarkRead={(id) => { const n = notifications.find(n => n.id === id); if (n) { fbAddNotification({ ...n, read: true }); } }}
        onMarkAllRead={() => notifications.forEach(n => fbAddNotification({ ...n, read: true }))}
        onClearAll={() => notifications.forEach(n => fbDeleteNotification(n.id))}
        onSendCustomNotification={(title, msg, type) =>
          pushNotification(title, msg, type, undefined, 'all')
        }
        onSelectTask={(task) => handleOpenTaskFromNotification(task)}
        currentRole={currentUser.role}
        currentUserId={currentUser.id}
      />

      {/* Modal: Cleaner Work Submission (Tools Checklist + Video/Photo Proof) */}
      {submittingTask && (
        <TaskSubmissionModal
          task={submittingTask}
          isOpen={!!submittingTask}
          onClose={() => setSubmittingTask(null)}
          onSubmitWork={handleSubmitCleanerWork}
        />
      )}

      {/* Modal: Full Task Details & Quality Verification Viewer */}
      {inspectingTask && (
        <TaskDetailsModal
          task={inspectingTask}
          currentUser={currentUser}
          onClose={() => setInspectingTask(null)}
          onApproveTask={handleApproveTask}
          onRequestRework={handleRequestRework}
        />
      )}

      {/* Modal: PWA Smartphone Installation Guide */}
      <PWAInstallBanner
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* Modal: Account Settings & User Profile */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={currentUser}
        allUsers={allUsers}
        zones={zones}
        auditLogs={auditLogs}
        onUpdateProfile={handleUpdateProfile}
        onUpdateOtherUser={handleUpdateOtherUser}
        onRegisterUser={handleRegisterUser}
        onDeleteUser={handleDeleteUser}
        onResetData={handleResetData}
        onAddZone={handleAddZone}
        onDeleteZone={handleDeleteZone}
        onDeleteAuditLog={handleDeleteAuditLog}
      />

    </div>
  );
}

