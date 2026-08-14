import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { CheckSquare, Square, Mail, Tag, UserPlus, ArrowRight, Trash2, CheckCircle2 } from 'lucide-react';
import { atsService } from '../../../services/atsService';
import { useToast } from '../../../components/ui/Toast';

export const ShortlistedManager: React.FC = () => {
  const { showToast } = useToast();
  const candidates = atsService.getCandidates().filter(c => c.status === 'Shortlisted' || c.status === 'Screening');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; actionName: string }>({ isOpen: false, actionName: '' });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === candidates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(candidates.map(c => c.id));
    }
  };

  const handleExecuteBulkAction = () => {
    showToast(`Bulk action "${confirmModal.actionName}" executed on ${selectedIds.length} candidate(s)!`);
    setSelectedIds([]);
    setConfirmModal({ isOpen: false, actionName: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#07563D]" /> Shortlisted Candidates & Bulk Actions Engine
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Perform batch stage movement, recruiter assignments, email notifications, and candidate tagging
          </p>
        </div>
      </div>

      {/* Bulk Toolbar */}
      {selectedIds.length > 0 && (
        <Card className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="font-extrabold text-[#07563D]">
            {selectedIds.length} Candidate(s) Selected
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => setConfirmModal({ isOpen: true, actionName: 'Bulk Move to Interview Stage' })}>
              Schedule Interview Batch
            </Button>
            <Button variant="outline" size="sm" leftIcon={<Mail className="w-3.5 h-3.5" />} onClick={() => setConfirmModal({ isOpen: true, actionName: 'Bulk Email Invite' })}>
              Send Email
            </Button>
            <Button variant="outline" size="sm" leftIcon={<Tag className="w-3.5 h-3.5" />} onClick={() => setConfirmModal({ isOpen: true, actionName: 'Bulk Add Tag' })}>
              Add Tag
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmModal({ isOpen: true, actionName: 'Bulk Reject Candidates' })}>
              Reject Selected
            </Button>
          </div>
        </Card>
      )}

      {/* Candidates Table */}
      <Card className="p-6 bg-white rounded-2xl border border-gray-100 shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.length > 0 && selectedIds.length === candidates.length}
                  onChange={toggleSelectAll}
                  className="rounded text-[#07563D] focus:ring-[#07563D]"
                />
              </TableHead>
              <TableHead>Candidate</TableHead>
              <TableHead>Current Role</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map(c => (
              <TableRow key={c.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="rounded text-[#07563D] focus:ring-[#07563D]"
                  />
                </TableCell>
                <TableCell>
                  <div className="font-bold text-gray-900 text-sm">{c.full_name}</div>
                  <div className="text-xs text-gray-500">{c.email}</div>
                </TableCell>
                <TableCell className="text-xs text-gray-800 font-semibold">{c.current_title || 'Developer'}</TableCell>
                <TableCell className="text-xs font-bold text-amber-600">{c.rating} / 5.0</TableCell>
                <TableCell className="text-xs text-gray-700">{c.source}</TableCell>
                <TableCell>
                  <Badge variant="emerald" size="sm">{c.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* CONFIRMATION MODAL */}
      <Modal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ isOpen: false, actionName: '' })} title="Confirm Bulk Action" size="md">
        <div className="space-y-4 text-xs">
          <p className="text-gray-700">
            Are you sure you want to execute <strong className="text-gray-900">{confirmModal.actionName}</strong> on <strong className="text-emerald-800">{selectedIds.length} candidate(s)</strong>?
          </p>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setConfirmModal({ isOpen: false, actionName: '' })}>
              Cancel
            </Button>
            <Button onClick={handleExecuteBulkAction}>Confirm Execution</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
