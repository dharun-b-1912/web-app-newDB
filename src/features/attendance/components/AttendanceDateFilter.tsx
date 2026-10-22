// src/features/attendance/components/AttendanceDateFilter.tsx
// ============================================================================
// Joy PeopleHR — Unified Attendance Date-Wise Filter Component
// Provides fast presets (All Dates, Today, Yesterday, Last 7 Days, This Month)
// and precise single-date or range date-pickers for attendance audit queues.
// ============================================================================

import React from 'react';
import { Calendar, X, ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/utils';

export type DatePreset =
  | 'ALL'
  | 'TODAY'
  | 'YESTERDAY'
  | 'LAST_7_DAYS'
  | 'THIS_MONTH'
  | 'CUSTOM_DATE'
  | 'DATE_RANGE';

export interface DateFilterValue {
  preset: DatePreset;
  customDate: string; // YYYY-MM-DD
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
}

export const INITIAL_DATE_FILTER: DateFilterValue = {
  preset: 'ALL',
  customDate: '',
  startDate: '',
  endDate: '',
};

export interface AttendanceDateFilterProps {
  value: DateFilterValue;
  onChange: (next: DateFilterValue) => void;
  className?: string;
  totalCount?: number;
  filteredCount?: number;
}

export function matchDateFilter(recordDate: string | undefined | null, filter: DateFilterValue): boolean {
  if (!filter || filter.preset === 'ALL') return true;
  if (!recordDate) return false;

  const dateStr = recordDate.slice(0, 10);
  const now = new Date();

  const toYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = toYMD(now);

  switch (filter.preset) {
    case 'TODAY':
      return dateStr === todayStr;

    case 'YESTERDAY': {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      return dateStr === toYMD(yest);
    }

    case 'LAST_7_DAYS': {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 6);
      return dateStr >= toYMD(d7) && dateStr <= todayStr;
    }

    case 'THIS_MONTH': {
      const mStart = toYMD(new Date(now.getFullYear(), now.getMonth(), 1));
      const mEnd = toYMD(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      return dateStr >= mStart && dateStr <= mEnd;
    }

    case 'CUSTOM_DATE':
      if (!filter.customDate) return true;
      return dateStr === filter.customDate;

    case 'DATE_RANGE':
      if (filter.startDate && dateStr < filter.startDate) return false;
      if (filter.endDate && dateStr > filter.endDate) return false;
      return true;

    default:
      return true;
  }
}

export const AttendanceDateFilter: React.FC<AttendanceDateFilterProps> = ({
  value,
  onChange,
  className,
}) => {
  const isFiltering =
    value.preset !== 'ALL' ||
    Boolean(value.customDate) ||
    Boolean(value.startDate) ||
    Boolean(value.endDate);

  const handlePresetChange = (preset: DatePreset) => {
    const now = new Date();
    const toYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (preset === 'CUSTOM_DATE' && !value.customDate) {
      onChange({
        ...value,
        preset,
        customDate: toYMD(now),
      });
      return;
    }

    if (preset === 'DATE_RANGE') {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 6);
      onChange({
        ...value,
        preset,
        startDate: value.startDate || toYMD(d7),
        endDate: value.endDate || toYMD(now),
      });
      return;
    }

    onChange({
      ...value,
      preset,
    });
  };

  const handleClear = () => {
    onChange(INITIAL_DATE_FILTER);
  };

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap text-xs', className)}>
      <div className="relative inline-flex items-center">
        <div className="absolute left-2.5 pointer-events-none text-gray-500">
          <Calendar className="w-3.5 h-3.5 text-[#07563D]" />
        </div>
        <select
          value={value.preset}
          onChange={(e) => handlePresetChange(e.target.value as DatePreset)}
          className={cn(
            'pl-8 pr-7 py-1.5 bg-gray-50 border rounded-lg text-xs font-semibold text-gray-700 transition-all appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#07563D]',
            isFiltering
              ? 'border-[#07563D] bg-emerald-50/50 text-[#07563D] font-bold'
              : 'border-gray-200 hover:border-gray-300'
          )}
          title="Filter by date range or preset"
        >
          <option value="ALL">All Dates</option>
          <option value="TODAY">Today</option>
          <option value="YESTERDAY">Yesterday</option>
          <option value="LAST_7_DAYS">Last 7 Days</option>
          <option value="THIS_MONTH">This Month</option>
          <option value="CUSTOM_DATE">Specific Date...</option>
          <option value="DATE_RANGE">Date Range...</option>
        </select>
        <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 pointer-events-none" />
      </div>

      {value.preset === 'CUSTOM_DATE' && (
        <div className="flex items-center gap-1 bg-white border border-emerald-300 rounded-lg px-2 py-1 shadow-2xs">
          <input
            type="date"
            value={value.customDate}
            onChange={(e) =>
              onChange({
                ...value,
                customDate: e.target.value,
              })
            }
            className="text-xs font-semibold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
          />
        </div>
      )}

      {value.preset === 'DATE_RANGE' && (
        <div className="flex items-center gap-1.5 bg-white border border-emerald-300 rounded-lg px-2 py-1 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-gray-400">From</span>
          <input
            type="date"
            value={value.startDate}
            onChange={(e) =>
              onChange({
                ...value,
                startDate: e.target.value,
              })
            }
            className="text-xs font-semibold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
          />
          <span className="text-[10px] uppercase font-bold text-gray-400">To</span>
          <input
            type="date"
            value={value.endDate}
            onChange={(e) =>
              onChange({
                ...value,
                endDate: e.target.value,
              })
            }
            className="text-xs font-semibold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
          />
        </div>
      )}

      {isFiltering && (
        <button
          onClick={handleClear}
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
          title="Reset date filter to All Dates"
        >
          <X className="w-3 h-3" />
          <span>Reset Date</span>
        </button>
      )}
    </div>
  );
};
