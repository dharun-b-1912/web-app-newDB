// src/features/vendor/components/VendorCommunicationTab.tsx
// ============================================================================
// Joy PeopleHR — Two-Way Vendor Communication & Ticketing System Component
// Manages Company <-> Vendor tickets, comments, announcements, & WhatsApp alerts
// ============================================================================

import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Send, Clock, AlertTriangle, ShieldCheck, Phone, CheckCircle2 } from 'lucide-react';
import { VendorCommunicationService, VendorRequestRecord } from '../../../services/vendor/vendorCommunicationService';
import { whatsAppNotificationService } from '../../../services/whatsapp/whatsappNotificationService';

interface VendorCommunicationTabProps {
  vendorId?: string;
  vendorName?: string;
}

export const VendorCommunicationTab: React.FC<VendorCommunicationTabProps> = ({
  vendorId,
  vendorName,
}) => {
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<VendorRequestRecord | null>(null);
  const [newCommentBody, setNewCommentBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form State for ticket
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('COMPLIANCE');
  const [priority, setPriority] = useState<VendorRequestRecord['priority']>('MEDIUM');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  // =========================================================================
  // ZERO-MOCK POLICY: Dynamically loads tickets from database, starts empty
  // =========================================================================
  const [requests, setRequests] = useState<VendorRequestRecord[]>([]);

  useEffect(() => {
    if (!vendorId) {
      setRequests([]);
      setSelectedTicket(null);
      return;
    }
    const fetchTickets = async () => {
      setIsLoading(true);
      try {
        const data = await VendorCommunicationService.getRequests(vendorId);
        setRequests(data || []);
        if (data && data.length > 0) {
          setSelectedTicket(data[0]);
        } else {
          setSelectedTicket(null);
        }
      } catch (err) {
        console.error('Failed to load vendor tickets:', err);
        setRequests([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTickets();
  }, [vendorId]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description) return;

    const res = await VendorCommunicationService.createRequest({
      vendorId: vendorId || '',
      senderType: 'COMPANY',
      authorName: 'Company HR Admin',
      category,
      priority,
      subject,
      description,
      dueDate: dueDate || undefined,
    });

    if (res.success && res.request) {
      setRequests([res.request, ...requests]);
      setSelectedTicket(res.request);

      // WhatsApp alert dispatch (non-blocking)
      if (vendorName) {
        whatsAppNotificationService
          .sendVendorDocumentExpiryAlert({
            phone: '+91 98401 23456',
            vendorName: vendorName,
            documentType: subject,
            expiryDate: dueDate || 'Immediate',
          })
          .catch(() => {});
      }
    }

    setIsNewTicketModalOpen(false);
    setSubject('');
    setDescription('');
    setDueDate('');
  };

  const handleAddComment = async () => {
    if (!selectedTicket || !newCommentBody.trim()) return;

    const res = await VendorCommunicationService.addComment({
      requestId: selectedTicket.id,
      senderType: 'COMPANY',
      authorName: 'Company HR Admin',
      commentBody: newCommentBody,
    });

    if (res.success && res.comment) {
      const updatedComments = [...selectedTicket.comments, res.comment];
      const updatedTicket = { ...selectedTicket, comments: updatedComments };

      setSelectedTicket(updatedTicket);
      setRequests(requests.map((r) => (r.id === selectedTicket.id ? updatedTicket : r)));
      setNewCommentBody('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 bg-white rounded-2xl border border-gray-100 shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-indigo-600" />
            Two-Way Company ↔ Vendor Communication
          </h2>
          <p className="text-sm text-gray-500 mt-1">Raise compliance requests, clarify attendance/payroll queries, and track audit history.</p>
        </div>

        <button
          onClick={() => setIsNewTicketModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-100"
        >
          <Plus className="w-4 h-4" /> Raise New Request Ticket
        </button>
      </div>

      {/* Grid of Tickets & Conversation Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Communication Threads ({requests.length})</h3>
          {isLoading ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 text-gray-400 text-xs">
              Loading communication threads...
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-gray-200">
              <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-600">No communication tickets</p>
              <p className="text-[11px] text-gray-400 mt-1">Raise a request ticket to start collaborating.</p>
            </div>
          ) : (
            requests.map((req) => (
              <div
                key={req.id}
                onClick={() => setSelectedTicket(req)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedTicket?.id === req.id
                    ? 'bg-indigo-50/50 border-indigo-500 shadow-sm ring-1 ring-indigo-500'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-indigo-600 font-bold">{req.requestNumber}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      req.priority === 'HIGH' || req.priority === 'URGENT'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {req.priority}
                  </span>
                </div>
                <h4 className="font-bold text-gray-900 text-sm mt-1.5 line-clamp-1">{req.subject}</h4>
                <p className="text-xs text-gray-500 line-clamp-2 mt-1">{req.description}</p>
                <div className="flex items-center justify-between text-[11px] text-gray-400 mt-3 pt-2 border-t border-gray-100">
                  <span>By: {req.senderType}</span>
                  <span>Due: {req.dueDate || 'N/A'}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Conversation View */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between min-h-[450px]">
          {selectedTicket ? (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <span className="text-xs font-mono text-indigo-600 font-bold">{selectedTicket.requestNumber}</span>
                    <h3 className="text-lg font-bold text-gray-900 mt-0.5">{selectedTicket.subject}</h3>
                    <p className="text-xs text-gray-500">Category: {selectedTicket.category} • Priority: {selectedTicket.priority}</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                    {selectedTicket.status}
                  </span>
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-800">
                  {selectedTicket.description}
                </div>

                {/* Comment History */}
                <div className="mt-6 space-y-4 max-h-[260px] overflow-y-auto pr-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase">Conversation History ({selectedTicket.comments.length})</h4>
                  {selectedTicket.comments.map((cmt) => (
                    <div
                      key={cmt.id}
                      className={`p-3.5 rounded-2xl max-w-md ${
                        cmt.senderType === 'COMPANY'
                          ? 'bg-indigo-600 text-white ml-auto'
                          : 'bg-gray-100 text-gray-900 mr-auto'
                      }`}
                    >
                      <div className="text-[10px] font-semibold opacity-80">{cmt.authorName} ({cmt.senderType})</div>
                      <div className="text-xs mt-1">{cmt.commentBody}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Comment Input */}
              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <input
                  type="text"
                  placeholder="Type response to vendor..."
                  value={newCommentBody}
                  onChange={(e) => setNewCommentBody(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                  onClick={handleAddComment}
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" /> Send
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-16 text-gray-400">
              <MessageSquare className="w-12 h-12 stroke-[1.5] mb-2 text-gray-300" />
              <p className="text-sm font-medium">Select a communication thread on the left to view messages and respond.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {isNewTicketModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateTicket} className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900">Raise Communication Ticket</h3>
              <button type="button" onClick={() => setIsNewTicketModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-medium">
              <div>
                <label className="text-gray-700">Subject / Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Missing PF Return Statement"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-700">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl">
                    <option value="COMPLIANCE">Statutory Compliance</option>
                    <option value="ATTENDANCE">Attendance Correction</option>
                    <option value="PAYROLL">Payroll / Wages</option>
                    <option value="INVOICE">Invoice & Payment</option>
                    <option value="GENERAL">General Query</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-700">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-700">Description *</label>
                <textarea
                  rows={3}
                  placeholder="Provide detailed instructions or request clarification..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="text-gray-700">Action Due Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button type="button" onClick={() => setIsNewTicketModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-semibold text-gray-700">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700">
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
