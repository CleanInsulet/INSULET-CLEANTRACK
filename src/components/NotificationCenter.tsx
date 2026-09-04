import React, { useState } from 'react';
import { NotificationItem, UserRole, CleaningTask } from '../types';
import { Bell, CheckCircle2, AlertTriangle, Send, X, ShieldAlert, Sparkles, Volume2, ArrowRight, ClipboardCheck, Clock } from 'lucide-react';
import { playNotificationRingSound, requestAppNotificationPermission } from '../utils/soundAndNotifications';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  tasks?: CleaningTask[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onSendCustomNotification: (title: string, message: string, type: NotificationItem['type']) => void;
  onSelectTask?: (task: CleaningTask) => void;
  currentRole: UserRole;
  currentUserId?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications = [],
  tasks = [],
  onMarkRead,
  onMarkAllRead,
  onClearAll,
  onSendCustomNotification,
  onSelectTask,
  currentRole,
  currentUserId,
}) => {
  const [customTitle, setCustomTitle] = useState('');
  const [customMsg, setCustomMsg] = useState('');
  const [customType, setCustomType] = useState<NotificationItem['type']>('urgent_alert');

  if (!isOpen) return null;

  const isRoleMatching = (recipientRole?: UserRole | 'management' | 'all') => {
    if (!recipientRole || recipientRole === 'all') return true;
    if (recipientRole === 'cleaner') return currentRole === 'cleaner';
    if (recipientRole === 'manager') return currentRole === 'manager' || currentRole === 'supervisor';
    if (recipientRole === 'supervisor') return currentRole === 'supervisor' || currentRole === 'manager';
    if (recipientRole === 'management') return currentRole === 'manager' || currentRole === 'supervisor';
    return true;
  };

  const filteredNotifs = notifications.filter(
    (n) =>
      (!n.targetUserId || n.targetUserId === 'all' || n.targetUserId === currentUserId) &&
      isRoleMatching(n.recipientRole)
  );

  const handleSendTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle || !customMsg) return;
    onSendCustomNotification(customTitle, customMsg, customType);
    setCustomTitle('');
    setCustomMsg('');
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'urgent_alert':
        return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case 'task_submitted':
        return <ClipboardCheck className="w-4 h-4 text-amber-500" />;
      case 'submission_approved':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'rework_needed':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case 'task_assigned':
        return <Sparkles className="w-4 h-4 text-indigo-500" />;
      case 'shift_change':
        return <Clock className="w-4 h-4 text-sky-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-900 text-base">Push Notifications</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full">
              {filteredNotifs.filter((n) => !n.read).length} Unread
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ring & Push Notification Banner */}
        <div className="px-4 py-2.5 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
            <Volume2 className="w-4 h-4 text-indigo-600 animate-bounce shrink-0" />
            <span className="truncate">Worker Ring Sound & Push Alerts</span>
          </div>
          <button
            onClick={async () => {
              playNotificationRingSound();
              const granted = await requestAppNotificationPermission();
              if (granted) {
                alert('🔔 Ring sound chime & Phone App Push Notifications enabled successfully!');
              } else {
                alert('🔔 Ring sound chime tested! Phone push permission can be enabled in browser settings.');
              }
            }}
            className="text-[10px] font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs shrink-0"
          >
            🔊 Test Ring & Enable Push
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-4 py-2 border-b border-slate-100 bg-white flex items-center justify-between text-xs text-slate-500">
          <button
            onClick={onMarkAllRead}
            className="hover:text-blue-600 font-medium transition-colors"
          >
            Mark all read
          </button>
          <button
            onClick={onClearAll}
            className="hover:text-red-600 font-medium transition-colors"
          >
            Clear all
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredNotifs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Bell className="w-10 h-10 mx-auto stroke-1 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet.</p>
            </div>
          ) : (
            filteredNotifs.map((notif, idx) => {
              const matchedTask = notif.taskId ? tasks.find((t) => t.id === notif.taskId) : undefined;
              return (
                <div
                  key={`${notif.id}-${idx}`}
                  onClick={() => onMarkRead(notif.id)}
                  className={`p-3.5 rounded-xl border transition-all relative ${
                    notif.read
                      ? 'bg-slate-50/70 border-slate-200 text-slate-600'
                      : 'bg-white border-blue-200 shadow-xs text-slate-900 ring-1 ring-blue-100'
                  }`}
                >
                  {!notif.read && (
                    <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-blue-600"></span>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 mt-0.5 shrink-0">{getIcon(notif.type)}</div>
                    <div className="flex-1 pr-3">
                      <div className="font-semibold text-xs text-slate-900">{notif.title}</div>
                      <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">{notif.message}</div>
                      <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-2 flex-wrap">
                        <span>{notif.timestamp}</span>
                        <span>•</span>
                        <span className="capitalize">{notif.type.replace('_', ' ')}</span>
                      </div>

                      {/* Direct Action Link if task is available */}
                      {matchedTask && onSelectTask && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkRead(notif.id);
                            onSelectTask(matchedTask);
                            onClose();
                          }}
                          className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          <span>{currentRole === 'cleaner' ? 'View My Duty' : 'Inspect & Verify'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Broadcast / Push Simulator Tool (For Managers & Supervisors) */}
        {(currentRole === 'manager' || currentRole === 'supervisor') && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Send Live Push Notification Alert
            </div>
            <form onSubmit={handleSendTest} className="space-y-2">
              <input
                type="text"
                placeholder="Alert title (e.g., Urgent Spill Level 1)"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Alert message details..."
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <select
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value as NotificationItem['type'])}
                  className="text-xs px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700"
                >
                  <option value="urgent_alert">Urgent Alert</option>
                  <option value="shift_change">Schedule Change</option>
                  <option value="task_assigned">Task Assignment</option>
                </select>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" /> Push Alert
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
