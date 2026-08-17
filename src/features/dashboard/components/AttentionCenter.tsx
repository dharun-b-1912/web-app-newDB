import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { AttentionItem, ActionableAttentionItem } from './AttentionItem';
import { DashboardEmptyState } from './DashboardEmptyState';
import { FileCheck, ShieldAlert, Filter, CheckCircle2 } from 'lucide-react';

interface Props {
  items: ActionableAttentionItem[];
  onReviewItem: (item: ActionableAttentionItem) => void;
  onQuickApprove?: (item: ActionableAttentionItem) => void;
  onQuickReject?: (item: ActionableAttentionItem) => void;
  onViewAllApprovals: () => void;
}

export const AttentionCenter: React.FC<Props> = ({
  items,
  onReviewItem,
  onQuickApprove,
  onQuickReject,
  onViewAllApprovals,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredItems = items.filter((item) => {
    if (filterType === 'ALL') return true;
    return item.type === filterType;
  });

  // Sort by priority order: Critical > Overdue > Due Today > Due Soon > Normal
  const priorityWeight: Record<ActionableAttentionItem['priority'], number> = {
    Critical: 5,
    Overdue: 4,
    'Due Today': 3,
    'Due Soon': 2,
    Normal: 1,
  };

  const sortedItems = [...filteredItems].sort((a, b) => {
    return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
  });

  const criticalCount = items.filter((i) => i.priority === 'Critical' || i.priority === 'Overdue').length;

  return (
    <Card className="p-6 space-y-4 border border-gray-100/90 shadow-sm bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-gray-900 tracking-tight">
                Needs Your Attention
              </h2>
              {items.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-black rounded-full bg-amber-100 text-amber-800">
                  {items.length}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              High-priority approvals and operational exceptions requiring HR decision
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
          >
            <option value="ALL">All Types ({items.length})</option>
            <option value="leave">Leaves</option>
            <option value="attendance">Attendance & Regularization</option>
            <option value="overtime">Overtime</option>
            <option value="onboarding">Onboarding</option>
            <option value="document">Documents</option>
          </select>

          <Button
            size="sm"
            variant="ghost"
            onClick={onViewAllApprovals}
            className="text-xs text-[#07563D] hover:bg-emerald-50 h-8 font-bold"
          >
            View All Desk
          </Button>
        </div>
      </div>

      {sortedItems.length === 0 ? (
        <DashboardEmptyState
          icon={CheckCircle2}
          title="You're all caught up!"
          description="No pending approvals or alerts require your attention right now."
        />
      ) : (
        <div className="space-y-2.5">
          {sortedItems.slice(0, 5).map((item) => (
            <AttentionItem
              key={item.id}
              item={item}
              onReview={onReviewItem}
              onQuickApprove={onQuickApprove}
              onQuickReject={onQuickReject}
            />
          ))}

          {sortedItems.length > 5 && (
            <div className="pt-2 text-center">
              <Button
                size="sm"
                variant="secondary"
                onClick={onViewAllApprovals}
                className="text-xs font-semibold text-gray-600 w-full sm:w-auto"
              >
                Show {sortedItems.length - 5} More Pending Requests
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
