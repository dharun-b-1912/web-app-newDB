import React, { useState } from 'react';
import { Drawer } from '../../../components/ui/Drawer';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { ActionableAttentionItem } from './AttentionItem';
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  AlertTriangle,
  Building2,
  Search,
} from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: ActionableAttentionItem[];
  selectedItem: ActionableAttentionItem | null;
  onSelectItem: (item: ActionableAttentionItem | null) => void;
  onApprove: (id: string, comment?: string) => Promise<void>;
  onReject: (id: string, comment?: string) => Promise<void>;
}

export const ApprovalsActionDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  items,
  selectedItem,
  onSelectItem,
  onApprove,
  onReject,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [decisionComment, setDecisionComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const filteredItems = items.filter((item) => {
    if (activeTab !== 'ALL' && item.type !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.requesterName.toLowerCase().includes(q) ||
        item.details.toLowerCase().includes(q) ||
        (item.department && item.department.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleExecute = async (decision: 'Approved' | 'Rejected') => {
    if (!selectedItem) return;
    setIsSubmitting(true);
    try {
      if (decision === 'Approved') {
        await onApprove(selectedItem.id, decisionComment);
        showToast(`Request "${selectedItem.title}" approved successfully.`, 'success');
      } else {
        await onReject(selectedItem.id, decisionComment);
        showToast(`Request "${selectedItem.title}" rejected.`, 'info');
      }
      setDecisionComment('');
      onSelectItem(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to update approval status', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="HR Approvals & Action Desk"
      subtitle={`${items.length} pending items requiring HR authorization`}
      width="2xl"
    >
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {/* Search & Tabs */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by employee, department or request type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#07563D]"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'ALL', label: `All (${items.length})` },
              { id: 'leave', label: 'Leaves' },
              { id: 'attendance', label: 'Attendance' },
              { id: 'overtime', label: 'Overtime' },
              { id: 'onboarding', label: 'Onboarding' },
              { id: 'document', label: 'Documents' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 font-bold rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#07563D] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Item Review Card */}
        {selectedItem ? (
          <div className="p-5 rounded-2xl border-2 border-[#07563D]/30 bg-emerald-50/20 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Avatar name={selectedItem.requesterName} src={selectedItem.requesterAvatar} size="lg" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-gray-900">{selectedItem.title}</h3>
                    <Badge variant="amber" size="sm">{selectedItem.priority}</Badge>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Requested by <span className="font-bold text-gray-900">{selectedItem.requesterName}</span>
                    {selectedItem.department && ` (${selectedItem.department})`}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSelectItem(null)}
                className="text-xs text-gray-500"
              >
                Back to list
              </Button>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Submitted Date:</span>
                <span className="font-semibold text-gray-900">{selectedItem.dateSubmitted}</span>
              </div>
              {selectedItem.durationOrAmount && (
                <div className="flex justify-between text-gray-500">
                  <span>Scope / Duration:</span>
                  <span className="font-bold text-emerald-800">{selectedItem.durationOrAmount}</span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-100">
                <span className="text-gray-500 block mb-1">Details & Justification:</span>
                <p className="text-gray-800 bg-gray-50 p-2.5 rounded-lg font-medium leading-relaxed">
                  {selectedItem.details}
                </p>
              </div>
            </div>

            {/* Decision Comments */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                Decision Note / Remarks (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Enter remarks for the audit trail and requester..."
                value={decisionComment}
                onChange={(e) => setDecisionComment(e.target.value)}
                className="w-full text-xs p-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#07563D]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => handleExecute('Rejected')}
                className="text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200"
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Reject Request
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={isSubmitting}
                onClick={() => handleExecute('Approved')}
                className="text-xs bg-[#07563D] hover:bg-[#064e37] text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Authorize & Approve
              </Button>
            </div>
          </div>
        ) : null}

        {/* Requests List */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">
            Pending Queue ({filteredItems.length})
          </h4>

          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/60" />
              <p className="font-bold text-gray-700">No matching requests in this category</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  selectedItem?.id === item.id
                    ? 'border-[#07563D] bg-emerald-50/40 shadow-xs'
                    : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={item.requesterName} src={item.requesterAvatar} size="sm" />
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">
                      {item.requesterName} {item.department ? `· ${item.department}` : ''}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-[11px] font-bold text-gray-700 block">
                    {item.durationOrAmount || 'Action'}
                  </span>
                  <span className="text-[10px] text-gray-400 block">
                    {item.dateSubmitted}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Drawer>
  );
};
