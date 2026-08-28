// src/components/notifications/NotificationPreferencesModal.tsx
// ============================================================
// Joy PeopleHR — Multi-Channel Notification Preferences Modal
// ============================================================

import React, { useState, useEffect } from 'react';
import { X, Bell, Mail, Smartphone, MessageSquare, Shield, Clock, Check } from 'lucide-react';
import {
  notificationPreferencesService,
  webPushService,
  NotificationCategory,
  NotificationChannel,
  NotificationPreferenceItem,
} from '../../services/notification';
import { useToast } from '../ui/Toast';
import { cn } from '../../lib/utils';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

const CATEGORIES: { key: NotificationCategory; label: string; desc: string }[] = [
  { key: 'APPROVAL', label: 'Approvals & Requests', desc: 'Leave, expense, travel, and document authorization workflows' },
  { key: 'SECURITY', label: 'Security & Access Alerts', desc: 'Suspicious logins, MFA changes, session revocations' },
  { key: 'INTEGRATION', label: 'Integration & Webhooks', desc: 'Connector outages, webhook failures, token expirations' },
  { key: 'PLATFORM', label: 'Platform & Incidents', desc: 'Service degradation, maintenance schedules, worker health' },
  { key: 'BILLING', label: 'Billing & Invoices', desc: 'Invoice generated, subscription renewals, payment failures' },
  { key: 'SYSTEM', label: 'System & Reports', desc: 'Data imports, CSV exports, asynchronous background jobs' },
];

const CHANNELS: { key: NotificationChannel; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'IN_APP', label: 'In-App', icon: Bell },
  { key: 'EMAIL', label: 'Email', icon: Mail },
  { key: 'PUSH', label: 'Browser Push', icon: Smartphone },
  { key: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare },
];

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
  userId = '00000000-0000-0000-0000-000000000001',
}) => {
  const { showToast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferenceItem[]>([]);
  const [pushStatus, setPushStatus] = useState<NotificationPermission>('default');
  const [quietHours, setQuietHours] = useState({
    enabled: false,
    start: '22:00',
    end: '08:00',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      notificationPreferencesService.getPreferences(userId).then((res) => {
        setPreferences(res);
        if (res.length > 0) {
          setQuietHours({
            enabled: res[0].quiet_hours_enabled,
            start: res[0].quiet_hours_start,
            end: res[0].quiet_hours_end,
          });
        }
      });
      setPushStatus(webPushService.getPermission());
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const isChannelEnabled = (category: NotificationCategory, channel: NotificationChannel) => {
    const item = preferences.find((p) => p.category === category && p.channel === channel);
    return item ? item.enabled : false;
  };

  const handleToggleChannel = (category: NotificationCategory, channel: NotificationChannel) => {
    setPreferences((prev) => {
      const idx = prev.findIndex((p) => p.category === category && p.channel === channel);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], enabled: !next[idx].enabled };
        notificationPreferencesService.updatePreference({
          userId,
          category,
          channel,
          enabled: next[idx].enabled,
        });
        return next;
      }
      return prev;
    });
  };

  const handleEnablePush = async () => {
    const success = await webPushService.subscribeUser(userId);
    if (success) {
      setPushStatus('granted');
      showToast('Browser push notifications enabled!', 'success');
    } else {
      showToast('Push notifications permission was denied or unsupported.', 'error');
    }
  };

  const handleSaveQuietHours = async () => {
    setIsSaving(true);
    try {
      await notificationPreferencesService.updateQuietHours({
        userId,
        enabled: quietHours.enabled,
        start: quietHours.start,
        end: quietHours.end,
      });
      showToast('Quiet hours preferences updated.', 'success');
    } catch {
      showToast('Failed to update quiet hours.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#047857]" />
              Notification Settings & Channels
            </h3>
            <p className="text-xs text-gray-500">
              Customize delivery channels and configure quiet hours across all Joy PeopleHR domains.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Web Push Banner */}
          {pushStatus !== 'granted' && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-[#047857] shrink-0" />
                <div>
                  <span className="font-bold text-gray-900">Enable Desktop Push Notifications</span>
                  <p className="text-[11px] text-gray-600">
                    Receive urgent approvals and critical security alerts even when Joy PeopleHR is closed.
                  </p>
                </div>
              </div>
              <button
                onClick={handleEnablePush}
                className="px-3 py-1.5 bg-[#047857] hover:bg-[#065f46] text-white font-bold rounded-lg transition shadow-xs shrink-0 cursor-pointer"
              >
                Enable Push
              </button>
            </div>
          )}

          {/* Channels Matrix Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Event Category</th>
                  {CHANNELS.map((ch) => (
                    <th key={ch.key} className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <ch.icon className="w-3.5 h-3.5 text-gray-500" />
                        <span>{ch.label}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {CATEGORIES.map((cat) => (
                  <tr key={cat.key} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4">
                      <span className="font-bold text-gray-900">{cat.label}</span>
                      <p className="text-[10px] text-gray-500">{cat.desc}</p>
                    </td>
                    {CHANNELS.map((ch) => {
                      const enabled = isChannelEnabled(cat.key, ch.key);
                      return (
                        <td key={ch.key} className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={() => handleToggleChannel(cat.key, ch.key)}
                            className="w-4 h-4 rounded text-[#047857] focus:ring-[#047857] cursor-pointer"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quiet Hours Configuration */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600" />
                <div>
                  <span className="font-bold text-gray-900">Quiet Hours</span>
                  <p className="text-[11px] text-gray-500">Mute non-critical notification sounds and push notifications</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={quietHours.enabled}
                  onChange={(e) => setQuietHours({ ...quietHours, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#047857]" />
              </label>
            </div>

            {quietHours.enabled && (
              <div className="flex items-center gap-4 pt-2 border-t border-gray-200/80">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 font-medium">From:</span>
                  <input
                    type="time"
                    value={quietHours.start}
                    onChange={(e) => setQuietHours({ ...quietHours, start: e.target.value })}
                    className="px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 font-medium">To:</span>
                  <input
                    type="time"
                    value={quietHours.end}
                    onChange={(e) => setQuietHours({ ...quietHours, end: e.target.value })}
                    className="px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                  />
                </div>
                <button
                  onClick={handleSaveQuietHours}
                  disabled={isSaving}
                  className="ml-auto px-3 py-1 bg-gray-900 text-white rounded text-xs font-bold hover:bg-gray-800 transition cursor-pointer"
                >
                  Save Times
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-[#047857] text-white hover:bg-[#065f46] transition shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
