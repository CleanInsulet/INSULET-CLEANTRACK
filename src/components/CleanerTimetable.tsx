import React, { useState, useEffect } from 'react';
import { CleaningTask, UserProfile, Zone, ToolItem } from '../types';
import { formatTime } from '../utils/storage';
import { assignTaskLevels } from '../utils/timetableLayout';
import { DatePickerPopover } from './DatePickerPopover';
import {
  DAY_SHIFT_HOURS,
  NIGHT_SHIFT_HOURS,
  FULL_24H_HOURS,
  getShiftTypeFromTime,
  timeToShiftRelativeMinutes,
  ShiftFilter,
} from '../utils/shiftUtils';
import {
  getTodayDateString,
} from '../utils/dateUtils';
import {
  Clock,
  CheckSquare,
  Camera,
  CheckCircle2,
  Sun,
  Moon,
  RotateCcw,
  Building,
  Wrench,
  LayoutGrid,
  Send,
  ShieldCheck,
  History,
} from 'lucide-react';

interface CleanerTimetableProps {
  tasks: CleaningTask[];
  currentUser: UserProfile;
  cleaners: UserProfile[];
  zones?: Zone[];
  tools?: ToolItem[];
  onSelectCleaner: (cleanerId: string) => void;
  onOpenTaskModal: (task: CleaningTask) => void;
  onReorderTasks?: (reorderedTasks: CleaningTask[]) => void;
  onUpdateTask?: (taskId: string, updates: Partial<CleaningTask>) => void;
}

export const CleanerTimetable: React.FC<CleanerTimetableProps> = ({
  tasks = [],
  currentUser,
  cleaners = [],
  zones = [],
  tools = [],
  onSelectCleaner,
  onOpenTaskModal,
}) => {
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [selectedCleanerId, setSelectedCleanerId] = useState(
    currentUser.role === 'cleaner' ? currentUser.id : cleaners[0]?.id || ''
  );
  const [viewMode, setViewMode] = useState<'delivery' | 'timetable'>('delivery');
  const [activeShiftFilter, setActiveShiftFilter] = useState<ShiftFilter>('all');
  const shiftFilter = activeShiftFilter;

  useEffect(() => {
    if (currentUser.role === 'cleaner') {
      setSelectedCleanerId(currentUser.id);
    }
  }, [currentUser]);

  const selectedCleanerProfile = cleaners.find((c) => c.id === selectedCleanerId) || currentUser;

  // Retrieve Cleaner's Assigned Working Areas
  const cleanerAssignedZones: string[] = (() => {
    if (selectedCleanerProfile.assignedZones && selectedCleanerProfile.assignedZones.length > 0) {
      return selectedCleanerProfile.assignedZones;
    }
    if (selectedCleanerProfile.assignedZone && selectedCleanerProfile.assignedZone.trim() !== '') {
      return selectedCleanerProfile.assignedZone.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return zones.length > 0 ? zones.map(z => z.name) : ['LABS'];
  })();

  // Filter tasks for selected cleaner on chosen date
  const allCleanerTasksOnDate = tasks.filter(
    (t) => t.assignedCleanerId === selectedCleanerId && t.date === selectedDate
  );

  // Helper to open task submission modal for any assigned area round
  const handleStartDeliveryForZone = (zoneName: string) => {
    const zoneObj = zones.find(
      (z) => z.name.toLowerCase() === zoneName.toLowerCase() || z.id === zoneName
    );

    const existingDeliveries = allCleanerTasksOnDate.filter(
      (t) =>
        t.zone?.toLowerCase() === zoneName.toLowerCase() ||
        t.location?.toLowerCase().includes(zoneName.toLowerCase()) ||
        t.title?.toLowerCase().includes(zoneName.toLowerCase())
    );

    const roundNumber = existingDeliveries.length + 1;

    const requiredToolItems = (zoneObj?.requiredTools || [])
      .map((tId) => tools.find((t) => t.id === tId || t.name.toLowerCase() === tId.toLowerCase()))
      .filter(Boolean) as ToolItem[];

    const fallbackTools = requiredToolItems.length > 0 ? requiredToolItems : tools.slice(0, 4);

    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const endTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

    let startHour = currentHour;
    let startMin = currentMin - 30;
    if (startMin < 0) {
      startMin += 60;
      startHour = (startHour - 1 + 24) % 24;
    }
    const startTimeStr = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;

    const defaultShift = selectedCleanerProfile.assignedShift || getShiftTypeFromTime(endTimeStr);

    const newRoundTask: CleaningTask = {
      id: `task-${selectedCleanerProfile.id}-${zoneName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${Date.now()}`,
      title: `${zoneName} Cleaning (Round #${roundNumber})`,
      location: zoneName,
      zone: zoneName,
      assignedCleanerId: selectedCleanerProfile.id,
      assignedCleanerName: selectedCleanerProfile.name,
      assignedCleanerAvatar: selectedCleanerProfile.avatar,
      date: getTodayDateString(),
      startTime: startTimeStr,
      endTime: endTimeStr,
      shift: defaultShift,
      status: 'pending',
      priority: 'medium',
      description:
        zoneObj?.defaultTasks ||
        zoneObj?.description ||
        'Floor sweeping, surface disinfection, waste clearance, and sanitation verification SOP.',
      toolsRequired: fallbackTools.map((t) => ({ ...t, isChecked: false })),
      proofsSubmitted: [],
      createdAt: new Date().toISOString(),
    };

    onOpenTaskModal(newRoundTask);
  };

  // Filter tasks for Outcome Timetable based on active shift filter
  const filteredCleanerTasks = allCleanerTasksOnDate.filter((t) => {
    if (activeShiftFilter === 'all') return true;
    const taskShift = t.shift || getShiftTypeFromTime(t.startTime);
    return taskShift === activeShiftFilter;
  });

  // Calculate statistics
  const totalDeliveriesCount = allCleanerTasksOnDate.length;
  const completedCount = allCleanerTasksOnDate.filter((t) => t.status === 'approved').length;
  const submittedCount = allCleanerTasksOnDate.filter((t) => t.status === 'submitted').length;

  // Grid hours based on active shift filter
  const gridHours =
    activeShiftFilter === 'day'
      ? DAY_SHIFT_HOURS
      : activeShiftFilter === 'night'
      ? NIGHT_SHIFT_HOURS
      : FULL_24H_HOURS;

  const getTaskGridStyle = (deliveryTime: string) => {
    const relMode = activeShiftFilter === 'night' ? 'night' : activeShiftFilter === 'day' ? 'day' : '24h';
    const startM = timeToShiftRelativeMinutes(deliveryTime || '08:00', relMode);
    const durationM = 35;

    const hourSlotHeight = 84;
    const topPx = (startM / 60) * hourSlotHeight;
    const heightPx = Math.max((durationM / 60) * hourSlotHeight, 48);

    return {
      top: `${topPx}px`,
      height: `${heightPx}px`,
    };
  };

  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
  const relMode = shiftFilter === 'night' ? 'night' : shiftFilter === 'day' ? 'day' : '24h';
  const currentRelMins = timeToShiftRelativeMinutes(currentTimeStr, relMode);
  const currentTimeTop = (currentRelMins / 60) * 84;
  const showCurrentTimeLine =
    shiftFilter === 'all'
      ? true
      : shiftFilter === 'day'
      ? currentHour >= 6 && currentHour < 18
      : currentHour >= 18 || currentHour < 6;

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-full min-w-0">
      {/* Header Profile & Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        {currentUser.role === 'cleaner' ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-purple-600 ring-4 ring-purple-50 shadow-xs shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                    {currentUser.name}
                  </h1>
                  <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {currentUser.employeeId || 'CLN-101'}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      currentUser.assignedShift === 'night'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {currentUser.assignedShift === 'night' ? 'Night Shift' : 'Day Shift'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  <span className="text-xs font-semibold text-slate-500">Assigned Areas:</span>
                  {cleanerAssignedZones.map((zn, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md"
                    >
                      {zn}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs w-full sm:w-auto justify-around shrink-0">
              <div className="text-center px-2.5">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">Areas</div>
                <div className="text-sm font-bold text-slate-800">{cleanerAssignedZones.length}</div>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="text-center px-2.5">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">Delivered</div>
                <div className="text-sm font-bold text-purple-700">{totalDeliveriesCount}</div>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="text-center px-2.5">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">In Review</div>
                <div className="text-sm font-bold text-amber-700">{submittedCount}</div>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="text-center px-2.5">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">Verified</div>
                <div className="text-sm font-bold text-emerald-700">{completedCount}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base font-bold text-slate-900">PIC Duty Hub</h1>
                <p className="text-xs text-slate-500">Select a cleaner to view duty actions and timetable.</p>
              </div>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                {cleaners.length} Active Cleaners
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {cleaners
                .filter((c) => c.status !== 'departed')
                .map((c) => {
                  const isSelected = c.id === selectedCleanerId;
                  const cAssignedZones = c.assignedZones && c.assignedZones.length > 0
                    ? c.assignedZones
                    : (c.assignedZone ? c.assignedZone.split(',').map(s => s.trim()).filter(Boolean) : []);
                  const isNight = c.assignedShift === 'night';
                  const cDeliveriesCount = tasks.filter(t => t.assignedCleanerId === c.id && t.date === selectedDate).length;

                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => {
                        setSelectedCleanerId(c.id);
                        onSelectCleaner(c.id);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-300/50'
                          : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <img
                        src={c.avatar}
                        alt={c.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{c.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                          <span className={isNight ? 'text-indigo-600 font-semibold' : 'text-amber-700 font-semibold'}>
                            {isNight ? 'Night' : 'Day'}
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-purple-700">{cDeliveriesCount} delivered</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {cAssignedZones.slice(0, 3).map((zn, zIdx) => (
                            <span
                              key={zIdx}
                              className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800"
                            >
                              {zn}
                            </span>
                          ))}
                          {cAssignedZones.length > 3 && (
                            <span className="text-[9px] font-semibold text-slate-500">+{cAssignedZones.length - 3}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* Toolbar: Date, Shift Filter, View Mode */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <DatePickerPopover value={selectedDate} onChange={setSelectedDate} />
            {selectedDate !== getTodayDateString() && (
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayDateString())}
                className="px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 cursor-pointer"
              >
                Today
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Shift Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveShiftFilter('day')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                  activeShiftFilter === 'day'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Day</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveShiftFilter('night')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                  activeShiftFilter === 'night'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Night</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveShiftFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                  activeShiftFilter === 'all'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>All</span>
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('delivery')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                  viewMode === 'delivery'
                    ? 'bg-white text-purple-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Duty Delivery</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timetable')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                  viewMode === 'timetable'
                    ? 'bg-white text-purple-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Outcome Timetable ({totalDeliveriesCount})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs min-w-0">
        {/* VIEW 1: DUTY DELIVERY ACTION CARDS */}
        {viewMode === 'delivery' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Duty Delivery Hub — {selectedCleanerProfile.name}
                </h2>
              </div>
              <span className="text-xs font-semibold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                {cleanerAssignedZones.length} Assigned Areas
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-1">
              {cleanerAssignedZones.map((zoneName, idx) => {
                const zoneObj = zones.find(
                  (z) => z.name.toLowerCase() === zoneName.toLowerCase() || z.id === zoneName
                );

                const zoneDeliveries = allCleanerTasksOnDate.filter(
                  (t) =>
                    t.zone?.toLowerCase() === zoneName.toLowerCase() ||
                    t.location?.toLowerCase().includes(zoneName.toLowerCase()) ||
                    t.title?.toLowerCase().includes(zoneName.toLowerCase())
                );

                const roundNumber = zoneDeliveries.length + 1;
                const latestDelivery = zoneDeliveries[zoneDeliveries.length - 1];

                const requiredToolItems = (zoneObj?.requiredTools || [])
                  .map((tId) => tools.find((t) => t.id === tId || t.name.toLowerCase() === tId.toLowerCase()))
                  .filter(Boolean) as ToolItem[];

                const displayTools = requiredToolItems.length > 0 ? requiredToolItems : tools.slice(0, 4);

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-purple-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    {/* Left details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-slate-900">{zoneName}</span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                            zoneDeliveries.length > 0
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          <History className="w-3 h-3 text-emerald-600" />
                          Delivered: {zoneDeliveries.length} {zoneDeliveries.length === 1 ? 'round' : 'rounds'}
                        </span>
                      </div>

                      {/* SOP Items */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-purple-600" />
                          SOP Checklist:
                        </span>
                        {displayTools.map((tItem) => (
                          <span
                            key={tItem.id}
                            className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200"
                          >
                            {tItem.name}
                          </span>
                        ))}
                      </div>

                      {/* Today's Rounds Pills */}
                      {zoneDeliveries.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-2.5 pt-2 border-t border-slate-100">
                          <span className="text-[11px] font-semibold text-slate-400">Rounds:</span>
                          {zoneDeliveries.map((deliv, dIdx) => (
                            <button
                              key={deliv.id}
                              type="button"
                              onClick={() => onOpenTaskModal(deliv)}
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold border flex items-center gap-1 cursor-pointer transition-colors ${
                                deliv.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                  : deliv.status === 'submitted'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                  : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                              }`}
                            >
                              <span>Round #{dIdx + 1} ({deliv.submittedAt || deliv.endTime || 'Delivered'})</span>
                              {deliv.status === 'approved' ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ) : deliv.status === 'submitted' ? (
                                <Clock className="w-3 h-3 text-amber-600" />
                              ) : (
                                <RotateCcw className="w-3 h-3 text-rose-600" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right action */}
                    <div className="flex flex-col sm:items-end gap-2 shrink-0">
                      {latestDelivery && (
                        <div className="text-right text-[11px]">
                          <span className="text-slate-500 font-mono">Delivered: {latestDelivery.submittedAt || latestDelivery.endTime}</span>
                          <span
                            className={`ml-1.5 font-bold px-1.5 py-0.2 rounded text-[10px] ${
                              latestDelivery.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : latestDelivery.status === 'submitted'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {latestDelivery.status === 'approved'
                              ? 'Verified'
                              : latestDelivery.status === 'submitted'
                              ? 'In Review'
                              : 'Rework'}
                          </span>
                        </div>
                      )}

                      {selectedDate === getTodayDateString() && (
                        <button
                          type="button"
                          onClick={() => handleStartDeliveryForZone(zoneName)}
                          className="px-4 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                          <Camera className="w-4 h-4" />
                          <span>
                            {zoneDeliveries.length === 0
                              ? 'Submit Duty'
                              : `Submit Round #${roundNumber}`}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* VIEW 2: OUTCOME TIMETABLE */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Outcome Timetable — {selectedCleanerProfile.name} ({selectedDate})
                </h2>
                <p className="text-xs text-slate-500">
                  Chronological records and hourly breakdown of delivered duties.
                </p>
              </div>
              <span className="text-xs font-semibold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                {filteredCleanerTasks.length} Deliveries Logged
              </span>
            </div>

            {filteredCleanerTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-slate-100 p-4">
                <Clock className="w-8 h-8 mx-auto mb-1.5 opacity-40" />
                <p className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  No duty deliveries recorded for {selectedDate}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Switch to "Duty Delivery" tab to submit your duty.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* List items */}
                <div className="space-y-2">
                  {filteredCleanerTasks.map((task, idx) => {
                    const checkedToolsCount = (task.toolsRequired || []).filter((t) => t.isChecked).length;
                    const totalToolsCount = (task.toolsRequired || []).length;
                    const isApproved = task.status === 'approved';
                    const isSubmitted = task.status === 'submitted';

                    return (
                      <div
                        key={task.id}
                        onClick={() => onOpenTaskModal(task)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isApproved
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : isSubmitted
                            ? 'bg-amber-50/40 border-amber-200'
                            : 'bg-rose-50/40 border-rose-200'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              #{idx + 1}
                            </span>
                            <span className="text-sm font-bold text-slate-900">{task.title}</span>
                            <span className="text-xs font-mono font-medium text-slate-700 bg-white px-2 py-0.5 rounded border">
                              Delivered: {task.submittedAt || task.endTime}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap mt-1.5 text-xs text-slate-600">
                            <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                              <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
                              SOP: {checkedToolsCount}/{totalToolsCount}
                            </span>
                            {(task.proofsSubmitted || []).length > 0 && (
                              <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                                <Camera className="w-3.5 h-3.5 text-indigo-600" />
                                {task.proofsSubmitted?.length} Photos
                              </span>
                            )}
                          </div>

                          {task.inspectionLog && (
                            <div className="mt-2 p-2 rounded-lg bg-white/80 border text-xs flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="font-semibold text-slate-800">
                                Supervisor ({task.inspectionLog.supervisorName}):
                              </span>
                              {task.inspectionLog.feedback && (
                                <span className="text-slate-600 italic">"{task.inspectionLog.feedback}"</span>
                              )}
                              {task.inspectionLog.rating && (
                                <span className="font-bold text-amber-700">⭐ {task.inspectionLog.rating}.0</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="shrink-0">
                          {isApproved ? (
                            <span className="px-2.5 py-1 bg-emerald-600 text-white font-bold text-xs rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                            </span>
                          ) : isSubmitted ? (
                            <span className="px-2.5 py-1 bg-amber-500 text-white font-bold text-xs rounded-full flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> In Review
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-rose-500 text-white font-bold text-xs rounded-full flex items-center gap-1">
                              <RotateCcw className="w-3.5 h-3.5" /> Rework
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Hourly Timetable Grid */}
                <div className="relative border border-slate-200 rounded-xl bg-white overflow-x-auto p-2 mt-4">
                  <div className="text-xs font-bold text-slate-700 mb-2 px-2 flex items-center justify-between">
                    <span>24H Outcome Timeline</span>
                  </div>
                  <div className="min-w-[600px] relative">
                    <div className="relative">
                      {gridHours.map((hour, idx) => (
                        <div key={`${hour}-${idx}`} className="h-[84px] border-b border-slate-100 flex items-start">
                          <div className="w-16 flex-shrink-0 text-[10px] font-bold text-slate-400 pr-3 text-right pt-1 font-mono select-none">
                            {hour}
                          </div>
                          <div className="flex-1 h-full border-l border-slate-100"></div>
                        </div>
                      ))}

                      {showCurrentTimeLine && (
                        <div
                          className="absolute left-16 right-0 h-px bg-rose-400 z-10 flex items-center pointer-events-none"
                          style={{ top: `${currentTimeTop}px` }}
                        >
                          <div className="w-2 h-2 rounded-full bg-rose-400 -ml-1 shadow-sm"></div>
                          <span className="bg-rose-500 text-white text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ml-1">
                            NOW {formatTime(currentTimeStr)}
                          </span>
                        </div>
                      )}

                      <div className="absolute top-0 left-16 right-0 bottom-0 pointer-events-none">
                        {(() => {
                          const assignments = assignTaskLevels(filteredCleanerTasks, shiftFilter);
                          const maxLevels = assignments.reduce((max, a) => Math.max(max, a.level + 1), 1);

                          return assignments.map((item) => {
                            const { task, level } = item;
                            const deliveryTime = task.submittedAt || task.endTime || task.startTime;
                            const style = getTaskGridStyle(deliveryTime);
                            const checkedToolsCount = (task.toolsRequired || []).filter((t) => t.isChecked).length;
                            const widthPercent = 100 / maxLevels;
                            const leftPercent = level * widthPercent;

                            return (
                              <div
                                key={task.id}
                                onClick={() => onOpenTaskModal(task)}
                                style={{
                                  ...style,
                                  left: `calc(${leftPercent}% + 4px)`,
                                  width: `calc(${widthPercent}% - 8px)`,
                                }}
                                className={`absolute rounded-r-lg p-2.5 shadow-xs border-l-4 transition-all cursor-pointer pointer-events-auto hover:shadow-md z-10 flex flex-col justify-between overflow-hidden ${
                                  task.status === 'approved'
                                    ? 'bg-emerald-50 border-l-emerald-500 text-emerald-900'
                                    : task.status === 'submitted'
                                    ? 'bg-amber-50 border-l-amber-500 text-amber-900'
                                    : 'bg-rose-50 border-l-rose-500 text-rose-900'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-900 truncate">
                                        {task.zone || task.title}
                                      </span>
                                      <span className="text-[9px] font-mono text-slate-600 shrink-0">
                                        Delivered: {deliveryTime}
                                      </span>
                                    </div>
                                  </div>

                                  <span className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-700 text-[9px] font-bold rounded shrink-0">
                                    {task.status === 'approved' ? 'APPROVED' : task.status === 'submitted' ? 'IN REVIEW' : 'REWORK'}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[9px] font-medium pt-1 border-t border-slate-200/60 mt-1">
                                  <span className="flex items-center gap-1 bg-white/80 px-1.5 py-0.2 rounded border border-slate-200">
                                    <CheckSquare className="w-3 h-3 text-purple-600" />
                                    SOP: {checkedToolsCount}/{task.toolsRequired.length}
                                  </span>
                                  {task.inspectionLog?.rating && (
                                    <span className="font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                                      ⭐ {task.inspectionLog.rating}.0
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
