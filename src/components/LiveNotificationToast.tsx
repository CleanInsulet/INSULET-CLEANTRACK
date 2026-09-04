import React, { useEffect, useState } from 'react';
import { NotificationItem, UserProfile, CleaningTask } from '../types';
import { Bell, CheckCircle2, AlertTriangle, X, ShieldAlert, ArrowRight, ClipboardCheck, Sparkles, Clock } from 'lucide-react';

interface LiveNotificationToastProps {
  notification: NotificationItem | null;
  currentUser: UserProfile;
  tasks: CleaningTask[];
  onClose: () => void;
  onActionClick: (task: CleaningTask, notification: NotificationItem) => void;
}

export const LiveNotificationToast: React.FC<LiveNotificationToastProps> = ({
  notification,
  currentUser,
  tasks,
  onClose,
  onActionClick,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!notification) return;

    setProgress(100);
    const duration = 8000;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev - step;
        if (next <= 0) {
          clearInterval(timer);
          return 0;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [notification]);

  useEffect(() => {
    if (progress <= 0 && notification) {
      onClose();
    }
  }, [progress, notification, onClose]);

  if (!notification) return null;

  const associatedTask = notification.taskId ? tasks.find((t) => t.id === notification.taskId) : undefined;

  const getStyleAndIcon = () => {
    switch (notification.type) {
      case 'task_submitted':
        return {
          bg: 'bg-slate-900 text-white border-amber-500/50 shadow-2xl',
          iconBg: 'bg-amber-500 text-slate-950 ring-2 ring-amber-300/40',
          icon: <ClipboardCheck className="w-5 h-5" />,
          badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
          badgeText: 'Action Required',
          btnBg: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold',
          btnText: 'Verify & Approve Now',
        };
      case 'submission_approved':
        return {
          bg: 'bg-emerald-950 text-white border-emerald-500/50 shadow-2xl',
          iconBg: 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300/40',
          icon: <CheckCircle2 className="w-5 h-5" />,
          badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
          badgeText: 'Completed',
          btnBg: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold',
          btnText: 'View Approved Duty',
        };
      case 'rework_needed':
        return {
          bg: 'bg-rose-950 text-white border-rose-500/50 shadow-2xl',
          iconBg: 'bg-rose-500 text-white ring-2 ring-rose-300/40',
          icon: <AlertTriangle className="w-5 h-5" />,
          badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
          badgeText: 'Rework Needed',
          btnBg: 'bg-rose-500 hover:bg-rose-400 text-white font-bold',
          btnText: 'Open & Fix Duty',
        };
      case 'task_assigned':
        return {
          bg: 'bg-indigo-950 text-white border-indigo-500/50 shadow-2xl',
          iconBg: 'bg-indigo-500 text-white ring-2 ring-indigo-300/40',
          icon: <Sparkles className="w-5 h-5" />,
          badge: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40',
          badgeText: 'New Duty',
          btnBg: 'bg-indigo-500 hover:bg-indigo-400 text-white font-bold',
          btnText: 'Open Timetable',
        };
      case 'shift_change':
        return {
          bg: 'bg-sky-950 text-white border-sky-500/50 shadow-2xl',
          iconBg: 'bg-sky-500 text-slate-950 ring-2 ring-sky-300/40',
          icon: <Clock className="w-5 h-5" />,
          badge: 'bg-sky-500/20 text-sky-300 border border-sky-500/40',
          badgeText: 'Schedule Updated',
          btnBg: 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold',
          btnText: 'Check Shift Timing',
        };
      default:
        return {
          bg: 'bg-slate-900 text-white border-slate-700 shadow-2xl',
          iconBg: 'bg-blue-600 text-white',
          icon: <Bell className="w-5 h-5" />,
          badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
          badgeText: 'Notification',
          btnBg: 'bg-blue-600 hover:bg-blue-500 text-white font-bold',
          btnText: 'View Details',
        };
    }
  };

  const style = getStyleAndIcon();

  return (
    <div className="fixed top-4 right-4 sm:right-6 z-50 max-w-md w-[calc(100vw-2rem)] sm:w-96 animate-in slide-in-from-top-4 fade-in duration-300">
      <div className={`rounded-2xl border p-4 backdrop-blur-md relative overflow-hidden ${style.bg}`}>
        
        {/* Top Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
          <div
            className="h-full bg-white/60 transition-all ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-start gap-3 pt-1">
          {/* Status Icon */}
          <div className={`p-2.5 rounded-xl shrink-0 ${style.iconBg}`}>
            {style.icon}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${style.badge}`}>
                {style.badgeText}
              </span>
              <span className="text-[10px] text-white/50">{notification.timestamp}</span>
            </div>
            
            <h4 className="text-sm font-black text-white leading-snug">{notification.title}</h4>
            <p className="text-xs text-white/80 mt-1 leading-relaxed line-clamp-3">
              {notification.message}
            </p>

            {/* Direct Action Button */}
            {associatedTask && (
              <button
                onClick={() => {
                  onActionClick(associatedTask, notification);
                  onClose();
                }}
                className={`mt-3 w-full py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer ${style.btnBg}`}
              >
                <span>{style.btnText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
