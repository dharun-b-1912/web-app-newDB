import React from 'react';
import { PendingTaskItem } from '../../../services/workspaceService';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import {
  CheckSquare,
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

interface Props {
  pendingTasks: PendingTaskItem[];
  upcomingHoliday: { name: string; date: string; description?: string } | null;
  activeShift: { name: string; timings: string; location: string };
  onOpenTask?: (task: PendingTaskItem) => void;
  onViewCalendar?: () => void;
}

export const WorkspaceUpcomingAndActivity: React.FC<Props> = ({
  pendingTasks,
  upcomingHoliday,
  activeShift,
  onOpenTask,
  onViewCalendar,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: My Action Center / Pending Tasks (7 Cols) */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold">
                <CheckSquare className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                My Action Center ({pendingTasks.length})
              </h3>
            </div>
            <span className="text-[10px] font-bold text-gray-400">Action Required</span>
          </div>

          <div className="space-y-2.5">
            {pendingTasks.map((task) => {
              const isUrgent = task.priority === 'Urgent';
              const isHigh = task.priority === 'High';

              return (
                <div
                  key={task.id}
                  className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-emerald-200 hover:shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-900 leading-tight truncate">
                        {task.title}
                      </span>
                      <span
                        className={`text-[9px] font-black px-2 py-0.2 rounded-full uppercase ${
                          isUrgent
                            ? 'bg-rose-100 text-rose-800'
                            : isHigh
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 line-clamp-1">{task.description}</p>
                    <div className="text-[10px] text-gray-400 flex items-center gap-2">
                      <span>Due: <strong className="text-gray-700">{task.dueDate}</strong></span>
                      <span>•</span>
                      <span>Category: {task.category}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenTask?.(task)}
                    className="text-[11px] h-7 px-3 font-bold shrink-0 self-start sm:self-center"
                    rightIcon={<ArrowRight className="w-3 h-3" />}
                  >
                    {task.actionLabel}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500 flex items-center justify-between">
          <span>All tasks are synchronized with your HR role workflows.</span>
        </div>
      </div>

      {/* Right: Today / Upcoming Events & Shifts (5 Cols) */}
      <div className="lg:col-span-5 space-y-4">
        {/* Upcoming Holiday Card */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                Upcoming Holiday
              </h3>
            </div>
            {onViewCalendar && (
              <button
                onClick={onViewCalendar}
                className="text-[10px] font-bold text-[#07563D] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Calendar</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {upcomingHoliday ? (
            <div className="p-3.5 rounded-xl bg-indigo-50/40 border border-indigo-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-black text-gray-900">{upcomingHoliday.name}</div>
                <div className="text-[11px] font-bold text-indigo-800">{upcomingHoliday.date}</div>
                <div className="text-[10px] text-gray-500">{upcomingHoliday.description}</div>
              </div>
              <Badge variant="purple" className="text-[10px] font-bold">Official Off</Badge>
            </div>
          ) : (
            <p className="text-xs text-gray-400">No upcoming holidays this month.</p>
          )}
        </div>

        {/* Active Shift Schedule */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
              Today's Shift & Schedule
            </h3>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50/70 border border-gray-100 space-y-1.5 text-xs">
            <div className="flex items-center justify-between font-bold text-gray-900">
              <span>{activeShift.name}</span>
              <Badge variant="emerald" className="text-[10px] font-bold">On Schedule</Badge>
            </div>
            <div className="text-[11px] text-gray-600 flex items-center gap-2">
              <Clock className="w-3 h-3 text-gray-400" />
              <span>{activeShift.timings}</span>
            </div>
            <div className="text-[11px] text-gray-500 flex items-center gap-2">
              <MapPin className="w-3 h-3 text-gray-400" />
              <span>{activeShift.location}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
