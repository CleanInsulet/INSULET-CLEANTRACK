import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CleaningTask, NotificationItem, UserProfile } from '../types';

export function useFirebaseData() {
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CleaningTask));
      setTasks(data);
    });

    const unsubNotifs = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationItem));
      setNotifications(data);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
      setUsers(data);
    });

    return () => {
      unsubTasks();
      unsubNotifs();
      unsubUsers();
    };
  }, []);

  return { tasks, notifications, users };
}
