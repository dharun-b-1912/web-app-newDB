import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle2, Clock, Check } from 'lucide-react';
import { api } from '../../services/api';
import { ApprovalItem } from '../../types';

export const NotificationsCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    api.getApprovals().then(setApprovals);
  }, [isOpen]);

  const pendingApprovals = approvals.filter(a => a.status === 'Pending');

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
        title="Notifications & Approval Inbox"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {pendingApprovals.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
            {pendingApprovals.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 pb-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Notifications & Approvals</h3>
              <p className="text-[11px] text-gray-500">{pendingApprovals.length} pending actions require review</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-[#07563D] rounded-md border border-emerald-200/60">
              Unified Inbox
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {pendingApprovals.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                All approvals cleared! No pending requests.
              </div>
            ) : (
              pendingApprovals.map(item => (
                <div key={item.id} className="p-3.5 hover:bg-gray-50/80 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={item.requested_by_avatar}
                        alt={item.requested_by_name}
                        className="w-7 h-7 rounded-full object-cover shrink-0 border border-gray-200"
                      />
                      <div>
                        <div className="text-xs font-bold text-gray-900 leading-tight">
                          {item.requested_by_name}
                        </div>
                        <div className="text-[10px] text-gray-500">{item.department}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {item.type}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-gray-800 mt-2">{item.title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{item.details}</p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100/60">
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {item.amount_or_duration}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={async () => {
                          await api.actOnApproval(item.id, 'Approved');
                          setApprovals(await api.getApprovals());
                        }}
                        className="px-2.5 py-1 bg-[#07563D] hover:bg-[#0B6B4D] text-white text-[11px] font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Approve
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
