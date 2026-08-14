import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const AttendanceCalendarView: React.FC = () => {
  const { showToast } = useToast();
  const [currentMonth, setCurrentMonth] = useState('August 2026');

  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Interactive Attendance Calendar</h2>
          <p className="text-xs text-gray-500 mt-1">
            Month, Week, and Day calendar views with color-coded daily status badges and shift roster overlays
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={<ChevronLeft className="w-4 h-4" />} onClick={() => showToast('Navigated to July 2026')}>
            Prev Month
          </Button>
          <span className="text-sm font-black text-gray-900 px-3">{currentMonth}</span>
          <Button variant="outline" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />} onClick={() => showToast('Navigated to September 2026')}>
            Next Month
          </Button>
        </div>
      </div>

      <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-500 border-b pb-3 mb-3">
          <div>SUN</div>
          <div>MON</div>
          <div>TUE</div>
          <div>WED</div>
          <div>THU</div>
          <div>FRI</div>
          <div>SAT</div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {daysInMonth.map(day => {
            const isWeekend = day % 7 === 1 || day % 7 === 0;
            const isToday = day === 12;
            return (
              <div
                key={day}
                onClick={() => showToast(`Selected August ${day}, 2026 — 412 Employees Present, 18 Absent`)}
                className={`min-h-[90px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isToday
                    ? 'bg-emerald-50/80 border-[#07563D] shadow-xs'
                    : isWeekend
                    ? 'bg-gray-50 border-gray-100 opacity-60'
                    : 'bg-white border-gray-200/80 hover:border-[#07563D]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black ${isToday ? 'text-[#07563D]' : 'text-gray-900'}`}>{day}</span>
                  {isToday && <span className="text-[9px] font-bold uppercase bg-[#07563D] text-white px-1.5 py-0.5 rounded">Today</span>}
                </div>

                {!isWeekend ? (
                  <div className="space-y-1">
                    <Badge variant="emerald" size="xs" className="w-full justify-center text-[9px] py-0">
                      392 Present
                    </Badge>
                    <Badge variant="purple" size="xs" className="w-full justify-center text-[9px] py-0">
                      38 WFH
                    </Badge>
                  </div>
                ) : (
                  <div className="text-[10px] text-gray-400 font-medium text-center">Weekly Off</div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
