import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { getTodayDateString, getTomorrowDateString, addDaysToDateString, formatDateLabel } from '../utils/dateUtils';

interface DatePickerPopoverProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (date: string) => void;
  className?: string;
}

export const DatePickerPopover: React.FC<DatePickerPopoverProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial view month/year from current value or today
  const parseDate = (dStr: string) => {
    if (!dStr || !dStr.includes('-')) return new Date();
    const [y, m, d] = dStr.split('-').map(Number);
    return new Date(y, m - 1, d || 1, 12, 0, 0);
  };

  const currentDateObj = parseDate(value);
  const [viewYear, setViewYear] = useState(currentDateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState(currentDateObj.getMonth()); // 0-11

  // Update view when value changes
  useEffect(() => {
    const d = parseDate(value);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (dayNum: number, monthOffset: number = 0) => {
    let targetYear = viewYear;
    let targetMonth = viewMonth + monthOffset;
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    } else if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }

    const mStr = String(targetMonth + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    const formatted = `${targetYear}-${mStr}-${dStr}`;
    onChange(formatted);
    setIsOpen(false);
  };

  // Generate calendar grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const prevMonthDays: number[] = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    prevMonthDays.push(daysInPrevMonth - i);
  }

  const currentMonthDays: number[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    currentMonthDays.push(i);
  }

  const remainingSlots = 42 - (prevMonthDays.length + currentMonthDays.length); // 6 rows * 7 days
  const nextMonthDays: number[] = [];
  for (let i = 1; i <= remainingSlots; i++) {
    nextMonthDays.push(i);
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const todayStr = getTodayDateString();

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Integrated Bar: [ ◀ ] [ 📅 Date Label ] [ ▶ ] */}
      <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
        <button
          type="button"
          onClick={() => onChange(addDaysToDateString(value, -1))}
          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
          title="Previous Day"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-all cursor-pointer select-none ${
            isOpen ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-50 text-slate-800 font-bold'
          }`}
          title="Click to open calendar"
        >
          <CalendarIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="text-xs tracking-tight">{formatDateLabel(value)}</span>
        </button>

        <button
          type="button"
          onClick={() => onChange(addDaysToDateString(value, 1))}
          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
          title="Next Day"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Popover Calendar Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 w-72 animate-in fade-in zoom-in-95 duration-150">
          {/* Header with Month/Year & Navigation */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 font-bold text-sm text-slate-800">
              <CalendarIcon className="w-4 h-4 text-indigo-600" />
              <span>{monthNames[viewMonth]} {viewYear}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <span key={d} className="text-[11px] font-semibold text-slate-400">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Prev month days */}
            {prevMonthDays.map((d, i) => (
              <button
                key={`prev-${i}`}
                type="button"
                onClick={() => handleSelectDay(d, -1)}
                className="h-8 w-8 mx-auto flex items-center justify-center text-xs text-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                {d}
              </button>
            ))}

            {/* Current month days */}
            {currentMonthDays.map((d) => {
              const mStr = String(viewMonth + 1).padStart(2, '0');
              const dStr = String(d).padStart(2, '0');
              const itemDateStr = `${viewYear}-${mStr}-${dStr}`;
              const isSelected = itemDateStr === value;
              const isToday = itemDateStr === todayStr;

              return (
                <button
                  key={`curr-${d}`}
                  type="button"
                  onClick={() => handleSelectDay(d, 0)}
                  className={`h-8 w-8 mx-auto flex items-center justify-center text-xs font-semibold rounded-lg transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : isToday
                      ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {d}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 bg-indigo-600 rounded-full" />
                  )}
                </button>
              );
            })}

            {/* Next month days */}
            {nextMonthDays.map((d, i) => (
              <button
                key={`next-${i}`}
                type="button"
                onClick={() => handleSelectDay(d, 1)}
                className="h-8 w-8 mx-auto flex items-center justify-center text-xs text-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                {d}
              </button>
            ))}
          </div>

          {/* Footer Shortcuts */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-xs">
            <button
              type="button"
              onClick={() => {
                onChange(getTodayDateString());
                setIsOpen(false);
              }}
              className="px-2.5 py-1 font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(getTomorrowDateString());
                setIsOpen(false);
              }}
              className="px-2.5 py-1 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
