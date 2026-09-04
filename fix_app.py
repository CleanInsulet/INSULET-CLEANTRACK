import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

old_use_effect = '''  useEffect(() => {
    let unsubTasks: () => void;
    let unsubNotifs: () => void;

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as UserProfile);
      setAllUsers(users.length > 0 ? users : DEFAULT_USERS);
    });

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
          setTasks(snapshot.docs.map(doc => doc.data() as CleaningTask).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        });
        unsubNotifs = onSnapshot(collection(db, 'notifications'), (snapshot) => {
          setNotifications(snapshot.docs.map(doc => doc.data() as NotificationItem).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        });
      } else {
        if (unsubTasks) unsubTasks();
        if (unsubNotifs) unsubNotifs();
        setTasks([]);
        setNotifications([]);
      }
    });

    return () => { 
      unsubUsers(); 
      unsubAuth();
      if (unsubTasks) unsubTasks(); 
      if (unsubNotifs) unsubNotifs(); 
    };
  }, []);'''

new_use_effect = '''  useEffect(() => {
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setTasks(snapshot.docs.map(doc => doc.data() as CleaningTask).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    const unsubNotifs = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      setNotifications(snapshot.docs.map(doc => doc.data() as NotificationItem).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as UserProfile);
      setAllUsers(users.length > 0 ? users : DEFAULT_USERS);
    });
    
    return () => { 
      unsubUsers(); 
      unsubTasks(); 
      unsubNotifs(); 
    };
  }, []);'''

content = content.replace(old_use_effect, new_use_effect)

with open('src/App.tsx', 'w') as f:
    f.write(content)
