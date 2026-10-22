// src/features/attendance/components/AttendanceNotificationDiagnosticModal.tsx
// ============================================================================
// JOY PeopleHR — Attendance Check-In/Check-Out Push Notification Diagnostic Console
// Provides administrators with full visibility into supervisor hierarchy routing,
// in-app persistence, and remote FCM push delivery for check-in / check-out events.
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  attendanceNotificationService,
  AttendanceNotificationDispatchLog,
} from '../../../services/attendance/attendanceNotificationService';

interface AttendanceNotificationDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AttendanceNotificationDiagnosticModal: React.FC<
  AttendanceNotificationDiagnosticModalProps
> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AttendanceNotificationDispatchLog[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const refreshLogs = () => {
    setIsRefreshing(true);
    try {
      const entries = attendanceNotificationService.getDiagnosticLogs({
        employeeCode: searchFilter,
        limit: 50,
      });
      setLogs(entries);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshLogs();
    }
  }, [isOpen, searchFilter]);

  if (!isOpen) return null;

  const handleTriggerTest = async (type: 'CHECK_IN' | 'CHECK_OUT') => {
    setIsSendingTest(true);
    setTestResult(null);
    try {
      // Trigger diagnostic check-in with JCS-099 (Arjun Kumar) mapped to JCS-017 (Dharun B)
      const res = await attendanceNotificationService.handleAttendanceEventAccepted({
        organizationId: '0c621892-e938-4707-9957-13534ea32c19',
        employeeId: 'e0000000-0000-4000-8000-fcad91430e98',
        employeeCode: 'JCS-099',
        employeeName: 'Arjun Kumar',
        eventType: type === 'CHECK_IN' ? 'attendance.check_in.accepted' : 'attendance.check_out.accepted',
        punchType: type,
        source: 'MOBILE',
        punchTime: new Date().toISOString(),
        idempotencyKey: `diag-test-${Date.now()}-${type}`,
      });

      const pushDeliveries = res.deliveries.filter((d) => d.channel === 'PUSH');
      const inAppDeliveries = res.deliveries.filter((d) => d.channel === 'IN_APP');

      const pushOk = pushDeliveries.some((d) => d.status === 'SENT');
      const inAppOk = inAppDeliveries.some((d) => d.status === 'SENT');

      setTestResult(
        `✓ ${type} Test Dispatched! In-App: ${inAppOk ? 'Recorded' : 'Failed'} | Push: ${
          pushOk ? 'Sent via FCM' : 'No Active Device / Provider Notice'
        }`
      );
      refreshLogs();
    } catch (err) {
      setTestResult(`✗ Test failed: ${String(err)}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
              <span className="text-xl">🔔</span>
            </div>
            <div>
              <h2 className="text-lg font-bold">Attendance Push & Supervisor Notification Console</h2>
              <p className="text-xs text-slate-300">
                Live delivery pipeline tracking: Check-In/Check-Out → Hierarchy Resolution → In-App & Remote FCM Push
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Toolbar & Test Actions */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 flex-1 max-w-md">
            <input
              type="text"
              placeholder="Filter by employee code or supervisor..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={refreshLogs}
              disabled={isRefreshing}
              className="px-3 py-2 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 transition"
            >
              {isRefreshing ? '...' : 'Refresh'}
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleTriggerTest('CHECK_IN')}
              disabled={isSendingTest}
              className="px-3 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition disabled:opacity-50"
            >
              Test Check-In Push
            </button>
            <button
              onClick={() => handleTriggerTest('CHECK_OUT')}
              disabled={isSendingTest}
              className="px-3 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition disabled:opacity-50"
            >
              Test Check-Out Push
            </button>
          </div>
        </div>

        {/* Test Result Alert Banner */}
        {testResult && (
          <div
            className={`px-4 py-2 text-xs font-medium border-b ${
              testResult.startsWith('✓')
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {testResult}
          </div>
        )}

        {/* Diagnostic Logs Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <span className="text-3xl block mb-2">📋</span>
              <p className="text-sm font-medium">No attendance notification dispatches recorded yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                Dispatches occur automatically whenever an employee successfully checks in or out, or use the test buttons above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const isCheckIn = log.eventType.includes('check_in');
                return (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-all shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase ${
                            isCheckIn ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isCheckIn ? 'Check-In' : 'Check-Out'}
                        </span>
                        <span className="font-semibold text-sm text-slate-800">
                          {log.punchingEmployee.name} ({log.punchingEmployee.code})
                        </span>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          via {log.source}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Punch: {new Date(log.punchTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </div>

                    {/* Routing & Supervisors */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-3">
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Resolved Supervisors ({log.resolvedRecipients.length})
                        </span>
                        {log.missingHierarchy ? (
                          <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded inline-block font-medium">
                            ⚠️ {log.routingException || 'No hierarchy mapped (No broadcast triggered)'}
                          </span>
                        ) : (
                          <div className="space-y-1">
                            {log.resolvedRecipients.map((r) => (
                              <div key={r.employeeId} className="flex items-center justify-between">
                                <span className="font-medium text-slate-700">
                                  {r.name} ({r.employeeCode})
                                </span>
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-1.5 py-0.5 rounded">
                                  {r.role.replace(/_/g, ' ')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Delivery Status Matrix */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Delivery Channels
                        </span>
                        <div className="space-y-1">
                          {log.deliveries.map((d, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-600 font-medium">
                                {d.channel === 'IN_APP' ? '📱 In-App Bell' : '🚀 Remote FCM Push'}:
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                  d.status === 'SENT'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : d.status === 'SKIPPED_NO_DEVICE'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {d.status} {d.providerMessageId ? `(${d.providerMessageId.slice(-8)})` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            WorkforceOS High-Importance Channel: <code className="bg-slate-200 px-1 py-0.5 rounded">joy_peoplehr_high_importance</code>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition"
          >
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
};
