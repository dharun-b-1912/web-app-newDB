import React from 'react';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Clock, AlertCircle } from 'lucide-react';

export interface ActionableAttentionItem {
  id: string;
  type: 'leave' | 'attendance' | 'overtime' | 'onboarding' | 'document' | 'service_request' | 'exit' | 'other';
  title: string;
  requesterName: string;
  requesterEmail?: string;
  requesterAvatar?: string;
  department?: string;
  details: string;
  durationOrAmount?: string;
  priority: 'Critical' | 'Overdue' | 'Due Today' | 'Due Soon' | 'Normal';
  dateSubmitted: string;
  rawRecord?: any;
}

interface Props {
  item: ActionableAttentionItem;
  onReview: (item: ActionableAttentionItem) => void;
  onQuickApprove?: (item: ActionableAttentionItem) => void;
  onQuickReject?: (item: ActionableAttentionItem) => void;
}

export const AttentionItem: React.FC<Props> = ({
  item,
  onReview,
  onQuickApprove,
  onQuickReject,
}) => {
  const getPriorityBadge = (p: ActionableAttentionItem['priority']) => {
    switch (p) {
      case 'Critical':
      case 'Overdue':
        return <Badge variant="danger" size="sm">{p}</Badge>;
      case 'Due Today':
        return <Badge variant="amber" size="sm">{p}</Badge>;
      case 'Due Soon':
        return <Badge variant="secondary" size="sm">{p}</Badge>;
      default:
        return <Badge variant="outline" size="sm">{p}</Badge>;
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white hover:bg-gray-50/80 rounded-xl border border-gray-100 transition-colors gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <Avatar name={item.requesterName} src={item.requesterAvatar} size="md" className="flex-shrink-0 mt-0.5" />
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-gray-900 truncate">
              {item.title}
            </span>
            {getPriorityBadge(item.priority)}
            {item.durationOrAmount && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                {item.durationOrAmount}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
            <span className="font-medium text-gray-800">{item.requesterName}</span>
            {item.department && (
              <>
                <span className="text-gray-300">•</span>
                <span>{item.department}</span>
              </>
            )}
            <span className="text-gray-300">•</span>
            <span className="flex items-center gap-1 text-gray-400">
              <Clock className="w-3 h-3" />
              {item.dateSubmitted}
            </span>
          </div>

          <p className="text-xs text-gray-600 line-clamp-1">
            {item.details}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
        {onQuickReject && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onQuickReject(item)}
            className="text-xs text-rose-600 hover:bg-rose-50 h-8"
          >
            Reject
          </Button>
        )}
        {onQuickApprove && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onQuickApprove(item)}
            className="text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-200 h-8"
          >
            Approve
          </Button>
        )}
        <Button
          size="sm"
          variant="primary"
          onClick={() => onReview(item)}
          className="text-xs bg-[#07563D] hover:bg-[#064e37] text-white h-8"
        >
          Review
        </Button>
      </div>
    </div>
  );
};
