import React from 'react';
import { CalendarPlus, Receipt, PlusCircle, FileText, Clock, UserCheck } from 'lucide-react';

interface Props {
  onApplyLeave: () => void;
  onViewPayslip: () => void;
  onNewRequest: () => void;
  onViewDocuments: () => void;
  onViewAttendanceHistory?: () => void;
  onViewProfile?: () => void;
}

export const WorkspaceQuickActions: React.FC<Props> = ({
  onApplyLeave,
  onViewPayslip,
  onNewRequest,
  onViewDocuments,
  onViewAttendanceHistory,
  onViewProfile,
}) => {
  const ACTIONS = [
    {
      id: 'leave',
      label: 'Apply Leave',
      sublabel: 'Casual, Sick & Earned',
      icon: CalendarPlus,
      color: 'bg-emerald-50 text-[#07563D] group-hover:bg-emerald-100',
      onClick: onApplyLeave,
    },
    {
      id: 'payslip',
      label: 'View Payslip',
      sublabel: 'July 2026 Breakdown',
      icon: Receipt,
      color: 'bg-teal-50 text-teal-700 group-hover:bg-teal-100',
      onClick: onViewPayslip,
    },
    {
      id: 'documents',
      label: 'My Documents',
      sublabel: 'KYC & Contracts',
      icon: FileText,
      color: 'bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100',
      onClick: onViewDocuments,
    },
    {
      id: 'request',
      label: 'New Request',
      sublabel: 'Regularize & Letters',
      icon: PlusCircle,
      color: 'bg-blue-50 text-blue-700 group-hover:bg-blue-100',
      onClick: onNewRequest,
    },
    {
      id: 'history',
      label: 'Attendance Log',
      sublabel: 'Punches & History',
      icon: Clock,
      color: 'bg-amber-50 text-amber-700 group-hover:bg-amber-100',
      onClick: onViewAttendanceHistory || onNewRequest,
    },
    {
      id: 'profile',
      label: 'My Profile',
      sublabel: 'Bank & Statutory',
      icon: UserCheck,
      color: 'bg-purple-50 text-purple-700 group-hover:bg-purple-100',
      onClick: onViewProfile || onViewDocuments,
    },
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider">
          Quick Employee Actions
        </h3>
        <span className="text-[10px] font-semibold text-gray-400">1-Click Self-Service</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {ACTIONS.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              onClick={act.onClick}
              className="p-3 rounded-2xl bg-white border border-gray-200/80 hover:border-emerald-300 hover:shadow-sm transition-all text-left shadow-2xs flex flex-col gap-2.5 cursor-pointer group"
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${act.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 leading-tight group-hover:text-[#07563D] transition-colors">{act.label}</p>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">{act.sublabel}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
