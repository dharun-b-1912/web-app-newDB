// src/components/shell/NotificationsCenter.tsx
// ============================================================
// Joy PeopleHR — Unified Realtime Notification & Approval Inbox
// ============================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Check,
  X,
  ShieldAlert,
  AlertTriangle,
  Flame,
  Radio,
  Sliders,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Layers,
  Sparkles,
  Info,
  Calendar,
} from 'lucide-react';
import {
  notificationService,
  approvalService,
  notificationRealtimeEngine,
  HydratedNotificationItem,
  ApprovalRequestItem,
  WorkForceEvent,
} from '../../services/notification';
import { NotificationPreferencesModal } from '../notifications/NotificationPreferencesModal';
import { useToast } from '../ui/Toast';
import { cn } from '../../lib/utils';

type NotificationTab = 'all' | 'approvals' | 'alerts' | 'system';

export const NotificationsCenter: React.FC = () => {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const [notifications, setNotifications] = useState<HydratedNotificationItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequestItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real data on mount and open
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [notifRes, apprRes] = await Promise.all([
        notificationService.getNotifications({ limit: 30 }),
        approvalService.getApprovalRequests({ status: 'Pending' }),
      ]);
      setNotifications(notifRes.items);
      setUnreadCount(notifRes.unreadCount + apprRes.length);
      setApprovals(apprRes);
    } catch (err) {
      console.warn('[NotificationsCenter] Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isOpen]);

  // Subscribe to live Realtime Events
  useEffect(() => {
    const unsubscribe = notificationRealtimeEngine.subscribe((event: WorkForceEvent) => {
      // Prepend live event
      const newItem: HydratedNotificationItem = {
        id: event.eventId,
        deliveryId: crypto.randomUUID(),
        eventType: event.eventType,
        category: event.category,
        severity: event.severity,
        title: event.title,
        body: event.body,
        actorName: event.actorName,
        actorAvatar: event.actorAvatar,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        actionUrl: event.actionUrl,
        isRead: false,
        status: 'DELIVERED',
        createdAt: event.timestamp || new Date().toISOString(),
        metadata: event.metadata || {},
      };

      setNotifications((prev) => [newItem, ...prev]);
      setUnreadCount((prev) => prev + 1);

      if (event.category === 'APPROVAL') {
        approvalService.getApprovalRequests({ status: 'Pending' }).then(setApprovals);
      }

      // Show toast if high severity
      if (event.severity === 'CRITICAL' || event.severity === 'ERROR') {
        showToast(`Security Alert: ${event.title}`, 'error');
      }
    });

    return () => unsubscribe();
  }, [showToast]);

  // Filter items by tab
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'alerts') {
      return notifications.filter(
        (n) => n.category === 'SECURITY' || n.category === 'INTEGRATION' || n.category === 'PLATFORM'
      );
    }
    if (activeTab === 'system') {
      return notifications.filter((n) => n.category === 'SYSTEM' || n.category === 'BILLING');
    }
    return notifications;
  }, [notifications, activeTab]);

  // Handle Mark Single As Read
  const handleMarkAsRead = async (item: HydratedNotificationItem) => {
    if (item.isRead) return;
    try {
      await notificationService.markAsRead(item.deliveryId);
      setNotifications((prev) =>
        prev.map((n) => (n.deliveryId === item.deliveryId ? { ...n, isRead: true, status: 'READ' } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  // Handle Mark All Read
  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, status: 'READ' })));
      setUnreadCount(approvals.length);
      showToast('All notifications marked as read.', 'success');
    } catch {
      showToast('Failed to mark all as read.', 'error');
    }
  };

  // Handle Real Server-Side Approval Decision
  const handleApprovalAction = async (approvalId: string, decision: 'Approved' | 'Rejected') => {
    setActionLoadingId(approvalId);
    try {
      await approvalService.executeApproval({
        approvalId,
        decision,
        decidedByName: 'Current Admin',
      });
      setApprovals((prev) => prev.filter((a) => a.id !== approvalId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      showToast(`Request successfully ${decision.toLowerCase()}!`, 'success');
    } catch (err: any) {
      showToast(err.message || `Failed to ${decision.toLowerCase()} request.`, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 1. Notification Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
        title="Notifications & Unified Approval Inbox"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 bg-[#047857] text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse shadow-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 2. Unified Inbox Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 sm:w-104 bg-white rounded-2xl shadow-2xl border border-gray-200/90 py-3 z-50 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="px-4 pb-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">Notifications & Approvals</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-[#047857] border border-emerald-200">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500">Realtime unified event stream</p>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-semibold text-[#047857] hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsPreferencesOpen(true);
                }}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                title="Notification Channels & Settings"
              >
                <Sliders className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub-Tabs (All, Approvals, Alerts, System) */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 bg-gray-50/50">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                'px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer',
                activeTab === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              )}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className={cn(
                'px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1',
                activeTab === 'approvals'
                  ? 'bg-emerald-50 text-[#047857] shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              )}
            >
              Approvals
              {approvals.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#047857] text-white text-[9px] font-bold flex items-center justify-center">
                  {approvals.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={cn(
                'px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer',
                activeTab === 'alerts' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              )}
            >
              Alerts
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={cn(
                'px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer',
                activeTab === 'system' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              )}
            >
              System
            </button>
          </div>

          {/* Content Scroll Area */}
          <div className="overflow-y-auto divide-y divide-gray-100 flex-1">
            {isLoading ? (
              <div className="py-10 text-center text-xs text-gray-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#047857] mx-auto" />
                <p>Syncing notifications...</p>
              </div>
            ) : null}

            {/* TAB: APPROVALS */}
            {!isLoading && (activeTab === 'approvals' || activeTab === 'all') && approvals.length > 0 && (
              <div className="p-2 space-y-2 bg-emerald-50/20">
                <div className="px-2 py-1 text-[10px] font-bold text-[#047857] uppercase tracking-wider flex items-center justify-between">
                  <span>Pending Actions ({approvals.length})</span>
                  <span className="text-[9px] font-medium text-gray-500">Requires Decision</span>
                </div>
                {approvals.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white rounded-xl border border-emerald-200/80 shadow-xs hover:border-[#047857] transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#047857] to-emerald-500 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                          {item.requested_by_name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900 leading-tight">
                            {item.requested_by_name}
                          </div>
                          <div className="text-[10px] text-gray-500">{item.department || 'Operations'}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {item.type}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-gray-800 mt-2">{item.title}</p>
                    {item.details && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{item.details}</p>}

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                      <span className="text-[10px] text-gray-500 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-gray-400" /> {item.amount_or_duration || 'Pending review'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleApprovalAction(item.id, 'Rejected')}
                          disabled={actionLoadingId === item.id}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 border border-rose-200 disabled:opacity-50"
                        >
                          <X className="w-3 h-3" /> Decline
                        </button>
                        <button
                          onClick={() => handleApprovalAction(item.id, 'Approved')}
                          disabled={actionLoadingId === item.id}
                          className="px-3 py-1 bg-[#047857] hover:bg-[#065f46] text-white text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shadow-xs disabled:opacity-50"
                        >
                          {actionLoadingId === item.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB: NOTIFICATIONS LIST */}
            {!isLoading && filteredNotifications.length > 0 ? (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkAsRead(notif)}
                  className={cn(
                    'p-3.5 hover:bg-gray-50 transition cursor-pointer flex items-start gap-3',
                    !notif.isRead && 'bg-emerald-50/30'
                  )}
                >
                  {/* Category / Severity Icon */}
                  <div className="mt-0.5 shrink-0">
                    {notif.category === 'SECURITY' ? (
                      <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                    ) : notif.category === 'INTEGRATION' ? (
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
                        <Layers className="w-4 h-4" />
                      </div>
                    ) : notif.severity === 'WARNING' ? (
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#047857] border border-emerald-200 flex items-center justify-center">
                        <Info className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-gray-900 truncate flex items-center gap-1.5">
                        {notif.title}
                        {!notif.isRead && <span className="w-1.5 h-1.5 rounded-full bg-[#047857]" />}
                      </span>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">{notif.body}</p>

                    {notif.actionUrl && (
                      <div className="pt-1">
                        <a
                          href={notif.actionUrl}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] font-bold text-[#047857] hover:underline inline-flex items-center gap-1"
                        >
                          View Details <ArrowRight className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : null}

            {/* EMPTY STATE */}
            {!isLoading &&
              filteredNotifications.length === 0 &&
              (activeTab !== 'approvals' || approvals.length === 0) && (
                <div className="py-12 text-center text-xs text-gray-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-[#047857] mx-auto opacity-70" />
                  <p className="font-semibold text-gray-700">All caught up!</p>
                  <p className="text-[11px] text-gray-400">No unread notifications in this category.</p>
                </div>
              )}
          </div>
        </div>
      )}

      {/* 3. Notification Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
      />
    </div>
  );
};
