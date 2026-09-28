// src/features/vendor/AttendanceMissEmailModal.tsx
// ============================================================================
// Joy People HR — Attendance Miss Email Escalation Dispatcher Modal
// Previews recipient routing, hierarchy tree, and dispatches automated emails
// ============================================================================

import React, { useState } from 'react';
import {
  AttendanceMissException,
  AttendanceMissEmailRun,
} from '../../types/vendorPortal';
import { VendorAttendanceMissEmailService } from '../../services/vendor/vendorAttendanceMissEmailService';

interface AttendanceMissEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  vendorId: string;
  clientCompanyName: string;
  siteName: string;
  reportingDate: string;
  exceptions: AttendanceMissException[];
  onDispatched: (run: AttendanceMissEmailRun) => void;
}

export const AttendanceMissEmailModal: React.FC<AttendanceMissEmailModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  vendorId,
  clientCompanyName,
  siteName,
  reportingDate,
  exceptions,
  onDispatched,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'recipients'>('preview');

  if (!isOpen) return null;

  const recipients = VendorAttendanceMissEmailService.resolveRecipients(exceptions, siteName, clientCompanyName);
  const { subject, html } = VendorAttendanceMissEmailService.generateEmailContent({
    clientCompanyName,
    siteName,
    date: reportingDate,
    exceptions,
  });

  const handleDispatch = async () => {
    setIsSending(true);
    const res = await VendorAttendanceMissEmailService.dispatchEscalationRun({
      organizationId,
      vendorId,
      clientCompanyName,
      siteName,
      reportingDate,
      exceptions,
      triggeredBy: 'Operations Desk',
    });

    setIsSending(false);
    if (res.success && res.run) {
      onDispatched(res.run);
      onClose();
    } else {
      alert(res.error || 'Failed to dispatch email run');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl text-gray-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/80 px-6 py-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">Automated Notification Engine</span>
            <h3 className="text-lg font-bold text-gray-900">Dispatch Hierarchy-Based Attendance Miss Escalation</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector & Scope Bar */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-[#047857] text-white shadow-xs'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              ✉️ Email Content Preview
            </button>
            <button
              onClick={() => setActiveTab('recipients')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'recipients'
                  ? 'bg-[#047857] text-white shadow-xs'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              👥 Recipient Routing Policy ({recipients.length})
            </button>
          </div>
          <div className="text-xs text-gray-500">
            Scope: <span className="font-semibold text-gray-800">{siteName}</span> · Date: <span className="font-semibold text-gray-800">{reportingDate}</span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'preview' ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs">
                <div className="text-gray-500 font-medium">Subject: <span className="text-gray-900 font-semibold">{subject}</span></div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 text-xs">
                <div
                  className="prose max-w-none text-gray-800"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700">
                The escalation engine automatically resolves email recipients according to the active reporting hierarchy. Workers and TLs will receive their respective unit breakdown, while Operations Managers and HR receive site-wide rollups.
              </div>

              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="p-3">Role</th>
                      <th className="p-3">Recipient Name</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3">Assigned Scope</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recipients.map((r, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/70">
                        <td className="p-3">
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-[#047857] border border-emerald-200">
                            {r.role.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-gray-900">{r.fullName}</td>
                        <td className="p-3 font-mono text-gray-600">{r.email}</td>
                        <td className="p-3 text-gray-500">{r.assignedScopeDescription}</td>
                        <td className="p-3">
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Ready to Route
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50/80 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            disabled={isSending}
            onClick={handleDispatch}
            className="rounded-lg bg-rose-600 px-5 py-2 text-xs font-semibold text-white hover:bg-rose-500 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            {isSending ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Dispatching Emails...
              </>
            ) : (
              <>🚀 Dispatch Escalation Emails Now ({exceptions.length} Exceptions)</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
