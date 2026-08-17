import React from 'react';
import { ServiceRequestItem, NotificationItem } from '../../../services/workspaceService';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Send, Bell, Plus, ChevronRight, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

interface Props {
  serviceRequests: ServiceRequestItem[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  onNewRequest: () => void;
  onViewAllRequests?: () => void;
  onOpenNotifications?: () => void;
}

export const WorkspaceRequestsAndNotifications: React.FC<Props> = ({
  serviceRequests,
  notifications,
  unreadNotificationCount,
  onNewRequest,
  onViewAllRequests,
  onOpenNotifications,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: My Service Requests (7 Cols) */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <Send className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                My Service Requests ({serviceRequests.length})
              </h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onNewRequest}
              leftIcon={<Plus className="w-3 h-3" />}
              className="text-[11px] h-7 px-2.5 font-bold"
            >
              New Request
            </Button>
          </div>

          <div className="space-y-2.5">
            {serviceRequests.map((req) => {
              const isApproved = req.status === 'Approved';
              const isPending = req.status === 'Pending';

              return (
                <div
                  key={req.id}
                  className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-blue-200 hover:shadow-2xs transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-gray-400">{req.requestCode}</span>
                      <span className="text-xs font-bold text-gray-900">{req.requestType}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-800'
                          : isPending
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-600 leading-relaxed">{req.summary}</p>
                  <div className="text-[10px] text-gray-400 flex items-center gap-1.5 pt-0.5">
                    <Clock className="w-3 h-3" /> Submitted on {req.submittedDate}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {onViewAllRequests && (
          <div className="pt-2 border-t border-gray-100 flex justify-end">
            <button
              onClick={onViewAllRequests}
              className="text-[11px] font-bold text-[#07563D] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>View All Service Requests</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Right: Live Notification Feed (5 Cols) */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                Notifications
              </h3>
            </div>
            {unreadNotificationCount > 0 && (
              <Badge variant="amber" className="text-[10px] font-bold">
                {unreadNotificationCount} Unread
              </Badge>
            )}
          </div>

          <div className="space-y-2.5">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 rounded-xl border transition-all text-xs space-y-1 ${
                  notif.isRead
                    ? 'border-gray-100 bg-gray-50/40 text-gray-600'
                    : 'border-emerald-200 bg-emerald-50/30 text-gray-900 font-medium'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-gray-900 leading-tight">{notif.title}</span>
                  <span className="text-[9px] text-gray-400 shrink-0">{notif.timestamp}</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">{notif.message}</p>
              </div>
            ))}
          </div>
        </div>

        {onOpenNotifications && (
          <div className="pt-2 border-t border-gray-100 flex justify-end">
            <button
              onClick={onOpenNotifications}
              className="text-[11px] font-bold text-[#07563D] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>Notification Center</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
