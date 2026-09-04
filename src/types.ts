export type UserRole = 'it' | 'manager' | 'administrator' | 'supervisor' | 'cleaner';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  phone?: string;
  assignedZone?: string;
  assignedZones?: string[];
  username?: string;
  icNumber?: string;
  dob?: string;
  email?: string;
  employeeId?: string;
  department?: string;
  position?: string;
  managerName?: string;
  accessLevel?: string;
  accountCreatedDate?: string;
  lastLoginDate?: string;
  lastProfileUpdateDate?: string;
  password?: string;
  assignedShift?: 'day' | 'night' | 'flexible';
  status?: 'active' | 'departed';
  departedDate?: string;
  orderIndex?: number;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  performedByRole?: UserRole;
  targetUserOrResource?: string;
  details: string;
  category: 'role_change' | 'zone_management' | 'task_lifecycle' | 'security' | 'system';
  ipAddress?: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rework_requested';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ToolItem {
  id: string;
  name: string;
  icon?: string;
  category?: 'chemical' | 'equipment' | 'ppe' | 'disposable' | string;
  isChecked: boolean;
  imageUrl?: string;
  description?: string;
  proofImage?: string;
  proofTimestamp?: string;
  orderIndex?: number;
}

export interface MediaProof {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  timestamp: string;
  caption?: string;
}

export interface InspectionLog {
  timestamp: string;
  supervisorName: string;
  action: 'approved' | 'rework_requested';
  rating?: number; // 1 to 5 stars
  feedback?: string;
}

export interface CleaningTask {
  id: string;
  title: string;
  location: string;
  zone: string;
  assignedCleanerId: string;
  assignedCleanerName: string;
  assignedCleanerAvatar?: string;
  supervisorId?: string;
  supervisorName?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm format e.g. "09:00"
  endTime: string; // HH:mm format e.g. "10:30"
  shift?: 'day' | 'night'; // Day Shift (06:00-18:00) or Night Shift (18:00-06:00)
  status: TaskStatus;
  priority: TaskPriority;
  description: string;
  toolsRequired: ToolItem[];
  proofsSubmitted: MediaProof[];
  cleanerNotes?: string;
  orderIndex?: number;
  submittedAt?: string;
  inspectionLog?: InspectionLog;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'task_assigned' | 'shift_change' | 'submission_approved' | 'rework_needed' | 'urgent_alert' | 'task_submitted';
  taskId?: string;
  recipientRole?: UserRole | 'management' | 'all';
  targetUserId?: string | 'all';
}

export interface Zone {
  id: string;
  name: string;
  color?: string;
  description?: string;
  requiredTools?: string[]; // array of ToolItem IDs
  defaultTasks?: string;
  orderIndex?: number;
}
