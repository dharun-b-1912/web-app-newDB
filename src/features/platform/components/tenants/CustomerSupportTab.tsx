// src/features/platform/components/tenants/CustomerSupportTab.tsx
// ============================================================
// WorkForceOS — Customer Support Tickets & Cases Tab
// ============================================================

import React, { useState } from 'react';
import {
  HelpCircle,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import { OrganizationRecord } from '../../../../services/platform/platformTenantService';
import { Button } from '../../../../components/ui/Button';
import { useToast } from '../../../../components/ui/Toast';
import { cn } from '../../../../lib/utils';

export interface CustomerSupportTabProps {
  organization: OrganizationRecord;
}

export const CustomerSupportTab: React.FC<CustomerSupportTabProps> = ({ organization: org }) => {
  const { showToast } = useToast();
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketPriority, setTicketPriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal');

  const [cases, setCases] = useState([
    {
      id: 'SUP-10482',
      subject: 'Verification of biometric hardware push daemon credentials',
      priority: 'Normal',
      status: 'Resolved',
      created_at: '2026-08-10',
      assigned_to: 'Arun Kumar (Super Admin)',
      sla_status: 'Met',
    },
  ]);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim()) return;

    const newTicket = {
      id: `SUP-${Math.floor(10000 + Math.random() * 90000)}`,
      subject: ticketSubject,
      priority: ticketPriority,
      status: 'Open',
      created_at: new Date().toISOString().split('T')[0],
      assigned_to: 'Customer Success',
      sla_status: 'Active',
    };

    setCases([newTicket, ...cases]);
    setShowNewTicketModal(false);
    setTicketSubject('');
    showToast(`Support case ${newTicket.id} created successfully!`, 'success');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Open Cases</span>
          <div className="text-xl font-bold text-gray-900">{cases.filter((c) => c.status === 'Open').length} cases</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Waiting on Customer</span>
          <div className="text-xl font-bold text-gray-900">0 cases</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">SLA At Risk</span>
          <div className="text-xl font-bold text-emerald-700">0 breaches</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">CSAT Satisfaction</span>
          <div className="text-xl font-bold text-[#047857] font-mono">4.9 / 5.0</div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Customer Support Cases</h3>
            <p className="text-xs text-gray-500 mt-0.5">Track resolution status and enterprise SLA timers.</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowNewTicketModal(true)}
            className="bg-[#047857] hover:bg-[#036246] text-white font-bold text-xs shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Create Support Case
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-5">Case #</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-5 text-right">SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/60 transition">
                  <td className="py-3.5 px-5 font-mono font-bold text-[#047857]">{c.id}</td>
                  <td className="py-3.5 px-4 font-semibold text-gray-900">{c.subject}</td>
                  <td className="py-3.5 px-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {c.priority}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full',
                        c.status === 'Resolved' ? 'bg-emerald-50 text-[#047857]' : 'bg-blue-50 text-blue-700'
                      )}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-gray-600">{c.assigned_to}</td>
                  <td className="py-3.5 px-4 text-gray-500">{c.created_at}</td>
                  <td className="py-3.5 px-5 text-right font-bold text-emerald-700">{c.sla_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNewTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handleCreateTicket} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in text-xs">
            <h3 className="text-base font-bold text-gray-900">Create Support Case for {org.legal_name}</h3>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Subject / Issue Summary *</label>
              <input
                type="text"
                required
                placeholder="e.g. Inquire about annual renewal invoice dispatch"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Priority</label>
              <select
                value={ticketPriority}
                onChange={(e) => setTicketPriority(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs font-semibold"
              >
                <option value="Normal">Normal</option>
                <option value="High">High Priority</option>
                <option value="Urgent">Urgent SLA</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setShowNewTicketModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm" type="submit" className="bg-[#047857] hover:bg-[#036246] text-white font-bold">
                Create Ticket
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
