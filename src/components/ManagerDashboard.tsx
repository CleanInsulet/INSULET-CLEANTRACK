import React, { useState, useEffect, useRef } from 'react';
import { CleaningTask, UserProfile, Zone, ToolItem, TaskPriority, TaskStatus } from '../types';
import { formatTime } from '../utils/storage';
import { computeCleanerTimelineLayout } from '../utils/timetableLayout';
import { SupervisorApproval } from './SupervisorApproval';
import { DatePickerPopover } from './DatePickerPopover';
import {
  DAY_SHIFT_HOURS,
  NIGHT_SHIFT_HOURS,
  FULL_24H_HOURS,
  getShiftTypeFromTime,
  ShiftType,
  ShiftFilter,
  SHIFT_CONFIGS,
} from '../utils/shiftUtils';
import {
  getTodayDateString,
  getTomorrowDateString,
  addDaysToDateString,
  formatDateLabel,
  toMinutes,
  toTimeString,
  isPastDateTime,
  getNextFutureTimeSlot,
} from '../utils/dateUtils';
import {
  Plus,
  Search,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Send,
  Trash2,
  Eye,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Calendar as CalendarIcon,
  Grid,
  List,
  Users,
  MoveVertical,
  PlusCircle,
  Maximize2,
  Lock,
  UploadCloud,
  Check,
  X,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';

interface ManagerDashboardProps {
  tasks: CleaningTask[];
  zones: Zone[];
  tools: ToolItem[];
  cleaners: UserProfile[];
  currentUser: UserProfile;
  onDeleteTask: (taskId: string) => void;
  onClearAllTasks?: () => void;
  onClearOutdatedTasks?: (validZoneNames: string[]) => void;
  onSelectTask: (task: CleaningTask) => void;
  onQuickApprove: (taskId: string) => void;
  onBroadcastAlert: (title: string, message: string) => void;
  onApproveTask?: (taskId: string, rating: number, feedback: string) => void;
  onRequestRework?: (taskId: string, rating: number, feedback: string) => void;
}

const ALL_TIME_SLOTS = (() => {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hStr = String(h).padStart(2, '0');
      const mStr = String(m).padStart(2, '0');
      slots.push(`${hStr}:${mStr}`);
    }
  }
  return slots;
})();

const formatTime12h = (timeStr: string) => {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const mFormatted = String(m).padStart(2, '0');
  return `${h}:${mFormatted} ${ampm}`;
};

const HOURLY_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00'
];

interface EquipmentSummaryCellProps {
  tools: ToolItem[];
  taskTitle?: string;
}

const EquipmentSummaryCell: React.FC<EquipmentSummaryCellProps> = ({ tools = [], taskTitle }) => {
  const [isOpen, setIsOpen] = useState(false);

  const total = tools.length;
  const usedTools = tools.filter((t) => t.isChecked);
  const notUsedTools = tools.filter((t) => !t.isChecked);

  const selectedCount = usedTools.length;
  const missingCount = notUsedTools.length;

  // Status Colors for trigger button:
  // Green: X = Y (all required equipment selected)
  // Yellow: 0 < X < Y (some equipment missing)
  // Red: X = 0 (no equipment selected)
  let badgeStyle = 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200';
  let dotColor = 'bg-emerald-600';

  if (selectedCount === 0 && total > 0) {
    badgeStyle = 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200';
    dotColor = 'bg-rose-600';
  } else if (selectedCount < total) {
    badgeStyle = 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200';
    dotColor = 'bg-amber-600';
  }

  if (total === 0) {
    return <span className="text-slate-400 text-xs italic">No equipment required</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border transition-all ${badgeStyle} shadow-2xs cursor-pointer`}
        title="Click to view equipment audit"
      >
        <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
        <span>Equipment Used: {selectedCount}/{total}</span>
        <span className="text-[10px] ml-0.5">▼</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative z-10 w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] font-sans text-xs">
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <span className="text-indigo-600 text-base font-bold">☑</span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Equipment & Tool Audit</h3>
                  {taskTitle && <p className="text-[11px] text-slate-500 font-medium">{taskTitle}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold border ${badgeStyle}`}>
                  {selectedCount}/{total} Verified
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* Equipment Used Section */}
              {usedTools.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>✓ Equipment Used ({usedTools.length})</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 p-3 bg-emerald-50/40 rounded-xl border border-emerald-100/80">
                    {usedTools.map((tool) => (
                      <span
                        key={tool.id}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-[#e6fcf5] text-[#0ca678] border border-[#96f2d7] shadow-2xs"
                      >
                        <span className="font-bold text-emerald-600">✓</span>
                        <span>{tool.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Equipment Not Used Section */}
              {notUsedTools.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>✗ Equipment Not Used ({notUsedTools.length})</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 p-3 bg-rose-50/40 rounded-xl border border-rose-100/80">
                    {notUsedTools.map((tool) => (
                      <span
                        key={tool.id}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs"
                      >
                        <span className="font-bold text-rose-600">✗</span>
                        <span>{tool.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Summary */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-4">
                <span className="text-emerald-800 flex items-center gap-1">
                  <span>✓ Selected:</span>
                  <span className="font-black">{selectedCount}/{total}</span>
                </span>
                <span className={missingCount > 0 ? 'text-rose-800 flex items-center gap-1' : 'text-slate-500 flex items-center gap-1'}>
                  <span>✗ Not Used:</span>
                  <span className="font-black">{missingCount}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  tasks = [],
  zones = [],
  tools = [],
  cleaners = [],
  currentUser,
  onDeleteTask,
  onClearAllTasks,
  onClearOutdatedTasks,
  onSelectTask,
  onQuickApprove,
  onBroadcastAlert,
  onApproveTask,
  onRequestRework,
}) => {
  // 3 Unified Pages: 'timetable' (Hourly Grid), 'cards' (Duty Area Tables), 'verification' (Approval Queue)
  const [viewMode, setViewMode] = useState<'timetable' | 'cards' | 'verification'>('timetable');
  const [timetableDate, setTimetableDate] = useState(getTodayDateString());
  const [timetableShiftFilter, setTimetableShiftFilter] = useState<ShiftFilter>('day');
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleOpenDatePicker = () => {
    if (dateInputRef.current) {
      if ('showPicker' in HTMLInputElement.prototype) {
        try {
          dateInputRef.current.showPicker();
        } catch {
          dateInputRef.current.click();
        }
      } else {
        dateInputRef.current.click();
      }
    }
  };

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedCleaner, setSelectedCleaner] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal States
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  // Broadcast Form State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) return;
    onBroadcastAlert(broadcastTitle, broadcastMessage);
    setBroadcastTitle('');
    setBroadcastMessage('');
    setIsBroadcastModalOpen(false);
  };

  // Date Navigation Helpers (Safe from timezone drifts)
  const handlePrevDay = () => {
    setTimetableDate((prev) => addDaysToDateString(prev, -1));
  };

  const handleNextDay = () => {
    setTimetableDate((prev) => addDaysToDateString(prev, 1));
  };

  // Stats calculation
  const totalTasks = tasks.length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const submittedCount = tasks.filter((t) => t.status === 'submitted').length;
  const approvedCount = tasks.filter((t) => t.status === 'approved').length;
  const urgentCount = tasks.filter((t) => t.priority === 'urgent' || t.priority === 'high').length;

  // Filtered Tasks for Cards Mode
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assignedCleanerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesZone = selectedZone === 'all' || task.zone === selectedZone;
    const matchesCleaner = selectedCleaner === 'all' || task.assignedCleanerId === selectedCleaner;
    const matchesStatus = selectedStatus === 'all' || task.status === selectedStatus;
    return matchesSearch && matchesZone && matchesCleaner && matchesStatus;
  });

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-slate-200">Scheduled</span>;
      case 'in_progress':
        return <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-200 animate-pulse">In Progress</span>;
      case 'submitted':
        return <span className="bg-amber-100 text-amber-900 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-300">Awaiting Approval</span>;
      case 'approved':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-300">Approved ✓</span>;
      case 'rework_requested':
        return <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-red-300">Rework Needed</span>;
    }
  };



  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Actions */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug">
            Cleaner Work Outcomes & Hourly Inspection Control Room
          </h1>
        </div>

        {/* View Switcher & Action Buttons - Column Layout */}
        <div className="flex flex-col gap-3 shrink-0 w-full sm:w-auto">
          
          {/* 3 Unified Pages View Mode Toggle (Vertical Column) */}
          <div className="bg-slate-100/90 p-1.5 rounded-xl flex flex-col gap-1 border border-slate-200 w-full sm:w-60 shrink-0">
            <button
              onClick={() => setViewMode('timetable')}
              className={`w-full px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition-all ${
                viewMode === 'timetable'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-200/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Grid className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                <span>1. Hourly Timetable</span>
              </span>
              {viewMode === 'timetable' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
            </button>

            <button
              onClick={() => setViewMode('cards')}
              className={`w-full px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-200/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <List className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                <span>2. Area Duty Tables</span>
              </span>
              {viewMode === 'cards' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
            </button>

            <button
              onClick={() => setViewMode('verification')}
              className={`w-full px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition-all ${
                viewMode === 'verification'
                  ? 'bg-white text-amber-800 shadow-xs border border-amber-200/80'
                  : 'text-slate-600 hover:text-amber-700 hover:bg-slate-200/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span>3. Verification Queue</span>
              </span>
              {submittedCount > 0 ? (
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900">
                  {submittedCount}
                </span>
              ) : (
                viewMode === 'verification' && <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
              )}
            </button>
          </div>

          {/* Action Buttons Column */}
          <div className="flex flex-col gap-1.5 w-full sm:w-60">
            <button
              onClick={() => setViewMode('verification')}
              className="w-full px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Inspection Queue ({submittedCount})</span>
            </button>

            <button
              onClick={() => setIsBroadcastModalOpen(true)}
              className="w-full px-2.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 shrink-0 text-indigo-600" /> Broadcast Alert
            </button>
          </div>

        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-indigo-50 p-3 sm:p-4 rounded-xl border border-indigo-100 shadow-xs min-w-0">
          <div className="text-xl sm:text-2xl font-bold text-indigo-700">{totalTasks}</div>
          <div className="text-[10px] sm:text-[11px] text-indigo-600 font-bold uppercase mt-0.5 leading-tight truncate">Total Scheduled</div>
        </div>
        <div className="bg-blue-50 p-3 sm:p-4 rounded-xl border border-blue-100 shadow-xs min-w-0">
          <div className="text-xl sm:text-2xl font-bold text-blue-700">{inProgressCount}</div>
          <div className="text-[10px] sm:text-[11px] text-blue-600 font-bold uppercase mt-0.5 leading-tight truncate">Active In-Progress</div>
        </div>
        <div className="bg-amber-50 p-3 sm:p-4 rounded-xl border border-amber-100 shadow-xs min-w-0">
          <div className="text-xl sm:text-2xl font-bold text-amber-700">{submittedCount}</div>
          <div className="text-[10px] sm:text-[11px] text-amber-600 font-bold uppercase mt-0.5 leading-tight truncate">Pending Verification</div>
        </div>
        <div className="bg-emerald-50 p-3 sm:p-4 rounded-xl border border-emerald-100 shadow-xs min-w-0">
          <div className="text-xl sm:text-2xl font-bold text-emerald-700">{approvedCount}</div>
          <div className="text-[10px] sm:text-[11px] text-emerald-600 font-bold uppercase mt-0.5 leading-tight truncate">Verified Approved</div>
        </div>
      </div>

      {/* VIEW MODE 1: HOURLY CLEANER TIMETABLE MATRIX */}
      {viewMode === 'timetable' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-4">
          
          {/* Timetable Toolbar & Date Navigation */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Unified Date Navigator with interactive calendar dropdown */}
              <DatePickerPopover
                value={timetableDate}
                onChange={setTimetableDate}
              />

              {/* Reset to Today button if looking at another day */}
              {timetableDate !== getTodayDateString() && (
                <button
                  type="button"
                  onClick={() => setTimetableDate(getTodayDateString())}
                  className="px-2.5 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-100 cursor-pointer"
                  title="Return to Today"
                >
                  Today
                </button>
              )}

              {/* Shift Filter Controls (Day / Night Shift / All 24H) */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-xs">
                <button
                  type="button"
                  onClick={() => setTimetableShiftFilter('day')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    timetableShiftFilter === 'day'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-amber-800'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>☀️ Day Shift (6am-6pm)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTimetableShiftFilter('night')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    timetableShiftFilter === 'night'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-indigo-800'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>🌙 Night Shift (6pm-6am)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTimetableShiftFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    timetableShiftFilter === 'all'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>⏱️ All 24H</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 overflow-x-auto pb-1 md:pb-0">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Scheduled
              </span>
              <span className="flex items-center gap-1.5 text-blue-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Active
              </span>
              <span className="flex items-center gap-1.5 text-amber-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Verification
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Approved
              </span>
              <span className="flex items-center gap-1.5 text-rose-600">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Rework
              </span>
            </div>

          </div>

          {/* Timetable Matrix Grid Container */}
          <div className="overflow-x-auto pb-4">
            <div className="min-w-[1150px] px-4">
              
              {(() => {
                const activeHourlySlots =
                  timetableShiftFilter === 'day'
                    ? DAY_SHIFT_HOURS
                    : timetableShiftFilter === 'night'
                    ? NIGHT_SHIFT_HOURS
                    : FULL_24H_HOURS;

                return (
                  <>
                    {/* Header Hours Row */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `180px repeat(${activeHourlySlots.length}, minmax(64px, 1fr))`,
                      }}
                      className="border-b border-slate-200 pb-2 mb-3 bg-slate-50/80 rounded-xl p-2 font-mono text-[11px] font-bold text-slate-500 text-center items-center gap-1.5"
                    >
                      <div className="text-left px-2 flex items-center gap-1.5 font-sans font-extrabold text-slate-800 text-xs h-full">
                        <Users className="w-4 h-4 text-indigo-600" /> Cleaner Staff
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${activeHourlySlots.length}, minmax(64px, 1fr))`,
                          gridColumn: `span ${activeHourlySlots.length}`,
                        }}
                        className="relative h-full"
                      >
                        {activeHourlySlots.map((slot, sIdx) => (
                          <div key={`${slot}-${sIdx}`} className="border-l border-slate-200/80 px-1 truncate flex items-center justify-center">
                            {slot}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cleaners Timetable Rows */}
                    <div className="space-y-3">
                      {(() => {
                        const shiftCleaners = cleaners.filter((cleaner) => {
                          if (cleaner.status === 'departed' && cleaner.departedDate) {
                            if (timetableDate >= cleaner.departedDate) return false;
                          }

                          if (cleaner.accountCreatedDate && timetableDate < cleaner.accountCreatedDate) {
                            return false;
                          }

                          if (cleaner.status === 'departed') return false;

                          if (timetableShiftFilter === 'all') return true;

                          const cleanerShift = cleaner.assignedShift || 'day';
                          if (cleanerShift === timetableShiftFilter || cleanerShift === 'flexible') return true;

                          // Always display cleaner if they have any assigned tasks for this shift on this date
                          const hasTaskInShift = tasks.some(
                            (t) =>
                              t.assignedCleanerId === cleaner.id &&
                              t.date === timetableDate &&
                              (t.shift || getShiftTypeFromTime(t.startTime)) === timetableShiftFilter
                          );
                          return hasTaskInShift;
                        });

                        if (shiftCleaners.length === 0) {
                          return (
                            <div className="p-8 text-center bg-slate-50/80 border border-dashed border-slate-200 rounded-2xl">
                              <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                              <p className="text-sm font-bold text-slate-700">
                                No cleaners assigned to {timetableShiftFilter === 'night' ? 'Night Shift (6pm - 6am)' : 'Day Shift (6am - 6pm)'}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                You can configure staff shift assignments in Settings &gt; Staff Management.
                              </p>
                            </div>
                          );
                        }

                        return shiftCleaners.map((cleaner) => {
                          const cleanerTasks = tasks.filter((t) => {
                            if (t.assignedCleanerId !== cleaner.id || t.date !== timetableDate) return false;
                            if (timetableShiftFilter === 'all') return true;
                            const taskShift = t.shift || getShiftTypeFromTime(t.startTime);
                            return taskShift === timetableShiftFilter;
                          });

                          const rowLayout = computeCleanerTimelineLayout(cleaner.id, cleanerTasks, {
                            shiftMode: timetableShiftFilter,
                            cardHeight: 62,
                            cardGap: 6,
                            paddingTop: 8,
                            minRowHeight: 104,
                          });

                          const isNightStaff = cleaner.assignedShift === 'night';

                          return (
                            <div
                              key={cleaner.id}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: `180px repeat(${activeHourlySlots.length}, minmax(64px, 1fr))`,
                                minHeight: `${rowLayout.rowHeightPx}px`,
                              }}
                              className="border border-slate-200 rounded-2xl p-2 bg-white hover:border-slate-300 transition-all items-stretch gap-1.5 relative shadow-2xs"
                            >
                              {/* Cleaner Info Column */}
                              <div className="p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/70 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={cleaner.avatar}
                                      alt={cleaner.name}
                                      className="w-8 h-8 rounded-full object-cover border border-slate-300 shrink-0"
                                    />
                                    <div className="min-w-0">
                                      <h4 className="font-bold text-slate-900 text-xs truncate">{cleaner.name}</h4>
                                      <p className="text-[10px] text-slate-500 font-medium truncate">{cleaner.assignedZone || 'Cleaner Staff'}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-2 flex items-center gap-1 flex-wrap">
                                    <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${
                                      isNightStaff ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                                    }`}>
                                      {isNightStaff ? '🌙 Night' : '☀️ Day'}
                                    </span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full whitespace-nowrap">
                                      {cleanerTasks.length} Record{cleanerTasks.length !== 1 ? 's' : ''}
                                    </span>
                                    {rowLayout.maxLevels > 1 && (
                                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 rounded-md whitespace-nowrap">
                                        {rowLayout.maxLevels} Tracks
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Hourly Cells with dynamic track height */}
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: `repeat(${activeHourlySlots.length}, minmax(64px, 1fr))`,
                                  gridColumn: `span ${activeHourlySlots.length}`,
                                  minHeight: `${rowLayout.rowHeightPx - 16}px`,
                                }}
                                className="relative"
                              >
                                
                                {/* Background Read-Only Grid Guidelines */}
                                {activeHourlySlots.map((hourSlot, hIdx) => (
                                  <div
                                    key={`${cleaner.id}-${hourSlot}-${hIdx}`}
                                    className="border-l border-dashed border-slate-200/70 relative min-h-[90px] h-full p-1 select-none pointer-events-none"
                                  />
                                ))}

                                {/* Task Record Cards Overlay */}
                                {rowLayout.positionedTasks.map((pt) => {
                                  const { task, level, leftPercent, widthPercent, topPx, heightPx } = pt;
                                  const isCompleted = task.status === 'approved';
                                  const deliveryTime = task.submittedAt || task.endTime;

                                  // Responsive degradation thresholds based on width
                                  const isTiny = widthPercent < 6.0;
                                  const isCompact = widthPercent >= 6.0 && widthPercent < 10.5;

                                  // Card styling based on task status
                                  let cardBg = 'bg-white border-slate-300 text-slate-800 shadow-xs';
                                  if (task.status === 'in_progress') cardBg = 'bg-blue-50 border-blue-300 text-blue-950 shadow-sm';
                                  if (task.status === 'submitted') cardBg = 'bg-amber-50 border-amber-300 text-amber-950 shadow-sm';
                                  if (task.status === 'approved') cardBg = 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xs';
                                  if (task.status === 'rework_requested') cardBg = 'bg-rose-50 border-rose-300 text-rose-950 shadow-md';

                                  const tooltipText = `📋 ${task.title}\n📍 Location: ${task.location} (${task.zone})\n⏰ Delivered: ${deliveryTime}\n👤 Staff: ${cleaner.name}\n📊 Status: ${task.status.toUpperCase()}`;

                                  return (
                                    <div
                                      key={task.id}
                                      title={tooltipText}
                                      style={{
                                        position: 'absolute',
                                        left: `${leftPercent}%`,
                                        width: `${widthPercent}%`,
                                        top: `${topPx}px`,
                                        height: `${heightPx}px`,
                                        zIndex: 10 + level,
                                      }}
                                      className={`p-1.5 rounded-xl border flex flex-col justify-between transition-all hover:shadow-md hover:z-30 overflow-hidden select-none cursor-default ${cardBg}`}
                                    >
                                      {/* Layout Mode 1: Extremely Narrow / Tiny Width (< 60px) */}
                                      {isTiny ? (
                                        <div className="flex flex-col justify-between h-full min-w-0">
                                          <div className="flex items-center justify-between gap-1 min-w-0">
                                            <span className="font-extrabold text-[10px] text-slate-900 truncate leading-tight flex-1">
                                              {task.title}
                                            </span>
                                            {isCompleted ? (
                                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                            ) : (
                                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                                            )}
                                          </div>
                                          <div className="flex items-center justify-between gap-0.5 text-[8px] font-mono text-slate-600 pt-0.5 border-t border-slate-200/60 min-w-0">
                                            <span className="truncate">{deliveryTime}</span>
                                            <button
                                              type="button"
                                              onClick={() => onSelectTask(task)}
                                              className="p-0.5 text-slate-500 hover:text-indigo-600 bg-white/90 rounded border border-slate-200 cursor-pointer shrink-0"
                                              title="View Record"
                                            >
                                              <Eye className="w-2 h-2" />
                                            </button>
                                          </div>
                                        </div>
                                      ) : isCompact ? (
                                        /* Layout Mode 2: Compact Width (60px - 105px) */
                                        <div className="flex flex-col justify-between h-full min-w-0">
                                          <div className="flex items-center justify-between gap-1 min-w-0">
                                            <h5 className="font-bold text-[10.5px] leading-tight truncate text-slate-900 flex-1">
                                              {task.title}
                                            </h5>
                                            {isCompleted && (
                                              <span className="text-[8px] font-bold text-emerald-700 bg-emerald-100/90 px-1 py-0.2 rounded border border-emerald-300 shrink-0">
                                                ✓
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-slate-200/60 min-w-0">
                                            <span className="font-mono text-[8.5px] text-slate-600 bg-white/80 px-1 rounded border border-slate-200 truncate">
                                              {deliveryTime}
                                            </span>
                                            <div className="flex items-center gap-0.5 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => onSelectTask(task)}
                                                className="p-0.5 text-slate-500 hover:text-indigo-600 bg-white rounded border border-slate-200 cursor-pointer"
                                                title="View Details"
                                              >
                                                <Eye className="w-2.5 h-2.5" />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        /* Layout Mode 3: Full Standard Width (> 105px) */
                                        <div className="flex flex-col justify-between h-full min-w-0">
                                          <div>
                                            {/* Header: Title */}
                                            <div className="flex items-start justify-between gap-1 min-w-0">
                                              <h5 className="font-bold text-[11px] leading-tight truncate text-slate-900 flex-1">
                                                {task.title}
                                              </h5>
                                            </div>

                                            {/* Location & Delivery Time */}
                                            <div className="text-[9.5px] text-slate-600 font-semibold mt-0.5 flex items-center justify-between gap-1 min-w-0">
                                              <span className="truncate flex items-center gap-0.5 min-w-0">
                                                <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                                <span className="truncate">{task.location}</span>
                                              </span>
                                              <span className="font-mono text-[8.5px] bg-white/80 px-1 py-0.2 rounded border border-slate-200 shrink-0">
                                                {deliveryTime}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Action Controls */}
                                          <div className="mt-0.5 pt-0.5 border-t border-slate-200/80 flex items-center justify-between gap-1 min-w-0">
                                            
                                            {isCompleted ? (
                                              <div className="flex items-center gap-0.5 text-[8px] font-extrabold text-emerald-800 bg-emerald-100/90 px-1 py-0.2 rounded border border-emerald-300 shrink-0">
                                                <CheckCircle2 className="w-2 h-2 text-emerald-600" />
                                                <span>Completed</span>
                                              </div>
                                            ) : (
                                              <div className="text-[8px] font-bold text-slate-500">
                                                {task.status === 'submitted' ? '⏳ Delivered' : task.status === 'in_progress' ? '⚡ In Progress' : 'Pending'}
                                              </div>
                                            )}

                                            <div className="flex items-center gap-0.5 shrink-0">
                                              {task.status === 'submitted' && (
                                                <button
                                                  type="button"
                                                  onClick={() => onQuickApprove(task.id)}
                                                  className="px-1.5 py-0.5 bg-indigo-600 text-white font-bold rounded text-[8px] hover:bg-indigo-700 cursor-pointer"
                                                  title="Quick Approve"
                                                >
                                                  ✓ Approve
                                                </button>
                                              )}
                                              
                                              <button
                                                type="button"
                                                onClick={() => onSelectTask(task)}
                                                className="p-1 text-slate-500 hover:text-indigo-600 bg-white hover:bg-slate-100 rounded border border-slate-200 cursor-pointer"
                                                title="View Full Details"
                                              >
                                                <Eye className="w-2.5 h-2.5" />
                                              </button>
                                            </div>

                                          </div>
                                        </div>
                                      )}

                                    </div>
                                  );
                                })}

                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: AREA-BY-AREA DUTY REVIEW TABLES */}
      {viewMode === 'cards' && (
        <div className="space-y-6">
          
          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by duty title, area location, cleaner name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-medium"
                />
              </div>

              {/* Filters & Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
                >
                  <option value="all">📍 All IT Areas ({zones.length})</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.name}>
                      {z.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedCleaner}
                  onChange={(e) => setSelectedCleaner(e.target.value)}
                  className="text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
                >
                  <option value="all">🧹 All Staff Cleaners</option>
                  {cleaners.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
                >
                  <option value="all">⚡ All Duty Statuses</option>
                  <option value="pending">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="submitted">Awaiting Review</option>
                  <option value="approved">Approved ✓</option>
                  <option value="rework_requested">Rework Needed</option>
                </select>

                {onClearAllTasks && tasks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllTasks();
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                    title="Delete all records in Area Duty Tables"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All ({tasks.length})</span>
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* AREA-BY-AREA DUTY TABLES LIST */}
          {(() => {
            // Determine unique zones to display
            const allZoneNames = Array.from(
              new Set([
                ...zones.map((z) => z.name),
                ...tasks.map((t) => t.zone),
              ])
            ).filter(Boolean);

            const activeZones = selectedZone === 'all' 
              ? allZoneNames 
              : allZoneNames.filter((z) => z === selectedZone);

            if (filteredTasks.length === 0) {
              return (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-3 stroke-1" />
                  <h3 className="text-slate-700 font-bold text-xs uppercase tracking-wider">No matching duty records found</h3>
                  <p className="text-xs text-slate-400 mt-1">Try resetting your search query or area filters.</p>
                </div>
              );
            }

            return (
              <div className="space-y-6">
                {activeZones.map((zoneName) => {
                  const areaTasks = filteredTasks.filter((t) => t.zone === zoneName);
                  if (areaTasks.length === 0) return null;

                  const zoneMeta = zones.find((z) => z.name === zoneName);
                  const areaApprovedCount = areaTasks.filter((t) => t.status === 'approved').length;
                  const areaSubmittedCount = areaTasks.filter((t) => t.status === 'submitted').length;
                  const areaInProgressCount = areaTasks.filter((t) => t.status === 'in_progress').length;

                  return (
                    <div key={zoneName} className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                      
                      {/* Area Header */}
                      <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: zoneMeta?.color || '#6366f1' }}></span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-black text-slate-900 tracking-tight">📍 Area: {zoneName}</h3>
                            </div>
                          </div>
                        </div>

                        {/* Area Duty Summary Pills */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
                          <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100">
                            {areaTasks.length} Total Duties
                          </span>
                          {areaApprovedCount > 0 && (
                            <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200">
                              ✓ {areaApprovedCount} Completed
                            </span>
                          )}
                          {areaSubmittedCount > 0 && (
                            <span className="bg-amber-50 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-200 animate-pulse">
                              ⏳ {areaSubmittedCount} Awaiting Review
                            </span>
                          )}
                          {areaInProgressCount > 0 && (
                            <span className="bg-blue-50 text-blue-800 px-2.5 py-1 rounded-lg border border-blue-200">
                              ⚡ {areaInProgressCount} In Progress
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Area Duty Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                          <thead>
                            <tr className="bg-slate-100/60 text-slate-500 font-black text-[10px] uppercase tracking-wider border-b border-slate-200">
                              <th className="py-2.5 px-3 w-[180px]">Duty Title & Location</th>
                              <th className="py-2.5 px-2 w-[85px]">Date</th>
                              <th className="py-2.5 px-2 w-[165px]">PIC Delivery Time</th>
                              <th className="py-2.5 px-3 w-[140px]">Who Did (Cleaner)</th>
                              <th className="py-2.5 px-3 w-[180px]">Equipment Use [tick]</th>
                              <th className="py-2.5 px-2 text-center w-[110px]">Completed?</th>
                              <th className="py-2.5 px-3 text-right w-[100px]">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {areaTasks.map((task, idx) => {
                              const checkedTools = task.toolsRequired.filter((t) => t.isChecked);
                              const totalTools = task.toolsRequired.length;
                              const cleanerStaff = cleaners.find((c) => c.id === task.assignedCleanerId);
                              const empId = cleanerStaff ? `CLN-10${cleaners.indexOf(cleanerStaff) + 1}` : 'STAFF';

                              return (
                                <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                                  
                                  {/* Duty Title & Priority */}
                                  <td className="py-2 px-3 align-middle">
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-slate-900 text-xs whitespace-nowrap">{task.title}</span>
                                      </div>
                                      <p className="text-[10px] text-slate-500 flex items-center gap-0.5 font-medium truncate max-w-[170px]">
                                        <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                        <span>{task.location}</span>
                                      </p>
                                    </div>
                                  </td>

                                  {/* Date */}
                                  <td className="py-2 px-2 align-middle font-mono text-[10px] font-bold text-slate-700">
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap">
                                      {task.date}
                                    </span>
                                  </td>

                                   {/* PIC Delivery Time */}
                                  <td className="py-2 px-2 align-middle">
                                    {task.submittedAt || (task.proofsSubmitted && task.proofsSubmitted.length > 0) ? (
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-1">
                                          <span className="font-mono text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 whitespace-nowrap flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                            {task.submittedAt || task.proofsSubmitted[task.proofsSubmitted.length - 1].timestamp}
                                          </span>
                                        </div>
                                        <div className="text-[9px] font-mono text-slate-400 font-medium">
                                          Sched: {formatTime(task.startTime)}-{formatTime(task.endTime)}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-1">
                                          <span className="font-mono text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                            {formatTime(task.startTime)}-{formatTime(task.endTime)}
                                          </span>
                                        </div>
                                        <div className="text-[9px] text-amber-600 font-semibold">
                                          ⏳ Pending Delivery
                                        </div>
                                      </div>
                                    )}
                                  </td>

                                  {/* Who Did (Cleaner) */}
                                  <td className="py-2 px-3 align-middle">
                                    <div className="flex items-center gap-1.5">
                                      <img
                                        src={task.assignedCleanerAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250'}
                                        alt={task.assignedCleanerName}
                                        className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
                                      />
                                      <div className="min-w-0">
                                        <div className="font-bold text-slate-900 truncate text-[11px] leading-tight">{task.assignedCleanerName}</div>
                                        <span className="text-[9px] font-mono font-semibold text-slate-400 block leading-tight">{empId}</span>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Equipment Use [tick] */}
                                  <td className="py-2 px-3 align-middle">
                                    <EquipmentSummaryCell tools={task.toolsRequired} taskTitle={task.title} />
                                  </td>

                                  {/* Completed? */}
                                  <td className="py-2 px-2 align-middle text-center">
                                    {task.status === 'approved' && (
                                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> Done
                                      </span>
                                    )}
                                    {task.status === 'submitted' && (
                                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse whitespace-nowrap">
                                        ⏳ Review
                                      </span>
                                    )}
                                    {task.status === 'in_progress' && (
                                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 whitespace-nowrap">
                                        ⚡ Active
                                      </span>
                                    )}
                                    {task.status === 'rework_requested' && (
                                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 whitespace-nowrap">
                                        ⚠️ Rework
                                      </span>
                                    )}
                                    {task.status === 'pending' && (
                                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                                        📅 Queued
                                      </span>
                                    )}
                                  </td>

                                  {/* Actions / Review */}
                                  <td className="py-3.5 px-4 align-middle text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {task.status === 'submitted' && (
                                        <button
                                          type="button"
                                          onClick={() => onQuickApprove(task.id)}
                                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-xs transition-colors flex items-center gap-1"
                                          title="Verify and Approve Duty"
                                        >
                                          <Check className="w-3 h-3" /> Approve
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => onSelectTask(task)}
                                        className="p-1.5 text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200"
                                        title="View Duty Details & Photo Proofs"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>

                                      {task.status !== 'approved' ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onDeleteTask(task.id);
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                                          title="Delete duty record (idea changed)"
                                        >
                                          <Trash2 className="w-4 h-4 text-rose-500" />
                                        </button>
                                      ) : (
                                        <span
                                          className="p-1.5 text-slate-300 bg-slate-50 rounded-lg border border-slate-200 cursor-not-allowed inline-block"
                                          title="Completed work verified and cannot be deleted"
                                        >
                                          <Lock className="w-4 h-4 text-slate-400 opacity-60" />
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                    </div>
                  );
                })}
              </div>
            );
          })()}

        </div>
      )}

      {/* VIEW MODE 3: SUPERVISOR & QUALITY VERIFICATION QUEUE */}
      {viewMode === 'verification' && (
        <SupervisorApproval
          tasks={tasks}
          currentUser={currentUser}
          onApproveTask={onApproveTask || ((id) => onQuickApprove(id))}
          onRequestRework={onRequestRework || (() => {})}
        />
      )}

      {/* Broadcast Alert Modal */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-900 text-base mb-1">Broadcast Urgent Shift Alert</h3>
            <p className="text-xs text-slate-500 mb-4">
              Sends an immediate push notification to all cleaner mobile devices.
            </p>
            <form onSubmit={handleBroadcastSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alert Headline</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Immediate Spill Clean Requested - Lobby"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Message Content</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Liquid spill reported on Level 1 entrance granite. Please respond immediately with caution sign."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Dispatch Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};
