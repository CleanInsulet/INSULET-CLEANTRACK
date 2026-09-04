import re

with open('src/App.tsx', 'r') as f:
    lines = f.read()

lines = re.sub(
    r'const handleAddTask = .*?pushNotification\(',
    r'''const handleAddTask = (newTaskData: Omit<CleaningTask, 'id' | 'createdAt'>) => {
    const newTask: CleaningTask = {
      ...newTaskData,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    fbAddTask(newTask);
    pushNotification(''',
    lines,
    flags=re.DOTALL
)

lines = re.sub(
    r'const handleDeleteTask = .*?  \};',
    r'''const handleDeleteTask = (taskId: string) => {
    fbDeleteTask(taskId);
  };''',
    lines,
    flags=re.DOTALL
)

lines = re.sub(
    r'const handleUpdateTask = .*?    // Notify assigned worker specifically if schedule/timing changes',
    r'''const handleUpdateTask = (taskId: string, updates: Partial<CleaningTask>) => {
    const existingTask = tasks.find((t) => t.id === taskId);
    fbUpdateTask(taskId, updates);

    // Notify assigned worker specifically if schedule/timing changes''',
    lines,
    flags=re.DOTALL
)

lines = re.sub(
    r'const handleSubmitCleanerWork = .*?    const taskObj = tasks\.find\(\(t\) => t\.id === taskId\);',
    r'''const handleSubmitCleanerWork = (
    taskId: string,
    updatedTools: ToolItem[],
    proofs: MediaProof[],
    cleanerNotes: string
  ) => {
    fbUpdateTask(taskId, {
      status: 'submitted',
      toolsRequired: updatedTools,
      proofsSubmitted: proofs,
      cleanerNotes,
      submittedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    const taskObj = tasks.find((t) => t.id === taskId);''',
    lines,
    flags=re.DOTALL
)

lines = re.sub(
    r'const handleApproveTask = .*?    const taskObj = tasks\.find\(\(t\) => t\.id === taskId\);',
    r'''const handleApproveTask = (taskId: string, rating: number, feedback: string) => {
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

    const taskObj = tasks.find((t) => t.id === taskId);''',
    lines,
    flags=re.DOTALL
)

lines = re.sub(
    r'const handleRequestRework = .*?    const taskObj = tasks\.find\(\(t\) => t\.id === taskId\);',
    r'''const handleRequestRework = (taskId: string, rating: number, feedback: string) => {
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

    const taskObj = tasks.find((t) => t.id === taskId);''',
    lines,
    flags=re.DOTALL
)

lines = re.sub(
    r'onMarkRead=\{\(id\) =>\n.*?\}',
    r'''onMarkRead={(id) => { const n = notifications.find(n => n.id === id); if (n) { fbAddNotification({ ...n, read: true }); } }}''',
    lines,
    flags=re.DOTALL
)

lines = re.sub(
    r'onMarkAllRead=\{\(\) =>\n.*?\}',
    r'''onMarkAllRead={() => notifications.forEach(n => fbAddNotification({ ...n, read: true }))}''',
    lines,
    flags=re.DOTALL
)

lines = re.sub(
    r'onClearAll=\{\(\) => setNotifications\(\[\]\)\}',
    r'''onClearAll={() => {}}''',
    lines,
    flags=re.DOTALL
)

with open('src/App.tsx', 'w') as f:
    f.write(lines)
