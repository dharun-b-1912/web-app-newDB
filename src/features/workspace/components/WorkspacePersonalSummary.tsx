import React from 'react';
import { LeaveEntitlement } from '../../../types/leave';
import { Button } from '../../../components/ui/Button';
import { Calendar, Plus, ChevronRight, CheckCircle2 } from 'lucide-react';

interface Props {
  leaveEntitlements: LeaveEntitlement[];
  onApplyLeave: () => void;
  onViewAllLeaves?: () => void;
}

export const WorkspacePersonalSummary: React.FC<Props> = ({
  leaveEntitlements,
  onApplyLeave,
  onViewAllLeaves,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider">
            Personal Leave Balances (2026)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onApplyLeave}
            leftIcon={<Plus className="w-3 h-3" />}
            className="text-[11px] h-7 px-2.5 font-bold"
          >
            Apply Leave
          </Button>
          {onViewAllLeaves && (
            <button
              onClick={onViewAllLeaves}
              className="text-[11px] font-bold text-[#07563D] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>History</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {leaveEntitlements.map((ent) => {
          const used = ent.used || 0;
          const available = ent.available_balance ?? ((ent as any).available || 8);
          const total = ent.granted ? (ent.granted + (ent.accrued || 0)) : (available + used);
          const percentUsed = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

          return (
            <div
              key={ent.id}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3 hover:border-emerald-200 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#07563D]" />
                  {ent.leave_type_name}
                </span>
                <span className="text-[10px] font-bold text-gray-400">Annual Accrual</span>
              </div>

              {/* Explicit Counters */}
              <div className="grid grid-cols-3 gap-2 py-1 border-y border-gray-100 text-center">
                <div>
                  <div className="text-base font-black text-[#07563D]">{available}</div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase">Available</div>
                </div>
                <div>
                  <div className="text-base font-black text-gray-700">{used}</div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase">Used</div>
                </div>
                <div>
                  <div className="text-base font-black text-gray-900">{total}</div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase">Total Days</div>
                </div>
              </div>

              {/* Progress Meter */}
              <div className="space-y-1">
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#07563D] rounded-full transition-all duration-300"
                    style={{ width: `${percentUsed}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-gray-400 font-semibold">
                  <span>{percentUsed}% consumed</span>
                  <span>{available} days remaining</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
