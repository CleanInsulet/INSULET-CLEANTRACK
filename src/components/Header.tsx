import React from 'react';
import { UserProfile, UserRole } from '../types';
import { Bell, Smartphone, ShieldCheck, Shield, User, Users, RefreshCw, Sparkles, LogOut, Settings, Terminal } from 'lucide-react';

interface HeaderProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onSwitchUser: (user: UserProfile) => void;
  onLogout: () => void;
  unreadCount: number;
  onOpenNotifications: () => void;
  onResetData: () => void;
  onOpenInstallModal: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  allUsers,
  onSwitchUser,
  onLogout,
  unreadCount,
  onOpenNotifications,
  onResetData,
  onOpenInstallModal,
  onOpenSettings,
}) => {
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'it':
        return <span className="bg-purple-50 text-purple-700 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border border-purple-200 flex items-center gap-1"><Terminal className="w-3 h-3 text-purple-600" /> IT Master</span>;
      case 'administrator':
        return <span className="bg-sky-50 text-sky-700 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border border-sky-200 flex items-center gap-1"><Shield className="w-3 h-3 text-sky-600" /> Administrator</span>;
      case 'manager':
        return <span className="bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border border-indigo-100 flex items-center gap-1"><Users className="w-3 h-3 text-indigo-600" /> Manager</span>;
      case 'supervisor':
        return <span className="bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border border-amber-100 flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-amber-600" /> Supervisor</span>;
      case 'cleaner':
      default:
        return <span className="bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider border border-emerald-100 flex items-center gap-1"><User className="w-3 h-3 text-emerald-600" /> PIC (Cleaner)</span>;
    }
  };

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 flex-shrink-0">
      
      {/* Brand & Logo */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-xs ${
          currentUser.role === 'cleaner' ? 'bg-emerald-600' : currentUser.role === 'it' ? 'bg-purple-600' : 'bg-indigo-600'
        }`}>
          <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white rounded-sm flex items-center justify-center">
            <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base sm:text-xl font-black tracking-tight text-slate-900 whitespace-nowrap">
            Insulet <span className="text-indigo-600 font-extrabold">MALAYSIA</span>
          </span>
        </div>
      </div>

      {/* Right Controls: User Profile, Role Badge, Notifications, Standalone Log Out */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

        {/* User / Settings Profile Button */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl p-1 sm:p-1.5 cursor-pointer transition-all shadow-2xs text-left"
          title="Click to view & edit profile settings"
        >
          <div className="relative">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-200 rounded-full border-2 border-white shadow-xs object-cover shrink-0"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-indigo-600 text-white rounded-full flex items-center justify-center border border-white">
              <Settings className="w-2 h-2" />
            </span>
          </div>
          <div className="hidden md:block">
            <div className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[100px]">{currentUser.name}</div>
            <div className="text-[10px] text-slate-400 capitalize">{currentUser.role}</div>
          </div>
          <div className="hidden sm:block">
            {getRoleBadge(currentUser.role)}
          </div>
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 sm:p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Dedicated Standalone Log Out Button (1-Click on Mobile & Desktop) */}
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
          title="Log Out of your account"
        >
          <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 shrink-0" />
          <span className="text-xs font-bold whitespace-nowrap">Log Out</span>
        </button>

      </div>
    </header>
  );
};
