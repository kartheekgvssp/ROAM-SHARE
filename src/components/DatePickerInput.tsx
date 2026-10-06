import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../lib/dateUtils';

interface DatePickerInputProps {
  value: string; // Stored as YYYY-MM-DD
  onChange: (isoDate: string) => void;
  label?: string;
  minDate?: string;
  maxDate?: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Parse current selected date
  const parsedDate = value ? new Date(value + 'T00:00:00') : new Date();
  const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  const [viewYear, setViewYear] = useState(validDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(validDate.getMonth());
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Close calendar on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsYearPickerOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Navigate months
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Stepper helper: shift day by offset (-1 or +1)
  const handleStepDay = (e: React.MouseEvent, offset: number) => {
    e.stopPropagation();
    const current = value ? new Date(value + 'T00:00:00') : new Date();
    current.setDate(current.getDate() + offset);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    const newIso = `${y}-${m}-${d}`;
    onChange(newIso);
  };

  // Generate calendar days
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const handleSelectDay = (day: number) => {
    const monthStr = String(viewMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const newIso = `${viewYear}-${monthStr}-${dayStr}`;
    onChange(newIso);
    setIsOpen(false);
  };

  const setPresetDate = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const newIso = `${year}-${month}-${day}`;
    onChange(newIso);
    setViewYear(year);
    setViewMonth(d.getMonth());
    setIsOpen(false);
  };

  // Format display as DD-MM-YYYY
  const displayFormatted = formatDateDDMMYYYY(value);

  // Check if a day is currently selected
  const isDaySelected = (day: number) => {
    if (!value) return false;
    const parts = value.split('-');
    if (parts.length === 3) {
      return (
        parseInt(parts[0], 10) === viewYear &&
        parseInt(parts[1], 10) === viewMonth + 1 &&
        parseInt(parts[2], 10) === day
      );
    }
    return false;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day
    );
  };

  // Generate Year options around current viewYear
  const currentYear = new Date().getFullYear();
  const yearsList = Array.from({ length: 15 }, (_, i) => currentYear - 3 + i);

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
            {label}
          </label>
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold border border-emerald-200/60">
            DD-MM-YYYY
          </span>
        </div>
      )}

      {/* Modern Trigger Bar with Quick -1 / +1 Step Buttons */}
      <div className="flex items-center rounded-2xl border border-gray-200/90 bg-white shadow-2xs hover:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition overflow-hidden">
        {/* Decrement Day */}
        <button
          type="button"
          onClick={(e) => handleStepDay(e, -1)}
          className="px-2.5 py-2.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50/50 transition cursor-pointer border-r border-gray-100"
          title="Previous day (-1 day)"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Central Clickable Date Display */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center justify-between px-3 py-2 text-sm text-gray-900 cursor-pointer text-left bg-transparent"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/50">
              <CalendarIcon className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-mono text-xs sm:text-sm font-bold tracking-wider text-gray-900">
                {displayFormatted || 'DD-MM-YYYY'}
              </span>
            </div>
          </div>

          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-emerald-600' : ''
            }`}
          />
        </button>

        {/* Increment Day */}
        <button
          type="button"
          onClick={(e) => handleStepDay(e, 1)}
          className="px-2.5 py-2.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50/50 transition cursor-pointer border-l border-gray-100"
          title="Next day (+1 day)"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* New Sleek Popover Calendar UI */}
      {isOpen && (
        <div className="absolute left-0 max-w-[calc(100vw-2rem)] w-72 sm:w-80 rounded-3xl bg-white p-3.5 sm:p-4 shadow-2xl border border-gray-100 ring-1 ring-black/5 animate-fadeIn z-50">
          {/* Quick Preset Pills */}
          <div className="flex items-center gap-1.5 pb-3 border-b border-gray-100">
            <button
              type="button"
              onClick={() => setPresetDate(0)}
              className="flex-1 py-1 px-2 rounded-xl bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-[11px] font-bold text-gray-700 transition cursor-pointer text-center"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setPresetDate(-1)}
              className="flex-1 py-1 px-2 rounded-xl bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-[11px] font-bold text-gray-700 transition cursor-pointer text-center"
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => setPresetDate(1)}
              className="flex-1 py-1 px-2 rounded-xl bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-[11px] font-bold text-gray-700 transition cursor-pointer text-center"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setPresetDate(7)}
              className="flex-1 py-1 px-2 rounded-xl bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-[11px] font-bold text-gray-700 transition cursor-pointer text-center"
            >
              +7 Days
            </button>
          </div>

          {/* Month & Year Navigation Header */}
          <div className="flex items-center justify-between py-2.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-gray-100 text-gray-600 transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsYearPickerOpen(!isYearPickerOpen)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl hover:bg-gray-100 font-extrabold text-sm text-gray-900 transition cursor-pointer"
            >
              <span>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            <button
              type="button"
              onClick={handleNextMonth}
              className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-gray-100 text-gray-600 transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Year Picker Overlay */}
          {isYearPickerOpen && (
            <div className="grid grid-cols-3 gap-1.5 p-2 bg-gray-50 rounded-2xl mb-2 max-h-36 overflow-y-auto">
              {yearsList.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setViewYear(y);
                    setIsYearPickerOpen(false);
                  }}
                  className={`py-1.5 text-xs rounded-xl font-bold transition cursor-pointer ${
                    y === viewYear
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold text-gray-400 py-1 uppercase tracking-wider">
            {DAYS_SHORT.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-8 w-8" />
            ))}

            {/* Days in month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const selected = isDaySelected(day);
              const today = isToday(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-8 mx-auto flex items-center justify-center rounded-xl font-bold transition cursor-pointer relative ${
                    selected
                      ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 font-black scale-105'
                      : today
                      ? 'border border-emerald-500 text-emerald-800 font-extrabold bg-emerald-50/70 hover:bg-emerald-100'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {day}
                  {today && !selected && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-600" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Bar: Format note and close */}
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-gray-500">
              <span className="text-[10px] text-gray-400 uppercase font-bold">Standard:</span>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                DD-MM-YYYY
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 px-2 py-1 rounded-lg hover:bg-emerald-50 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
