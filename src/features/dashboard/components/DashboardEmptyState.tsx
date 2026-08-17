import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface Props {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const DashboardEmptyState: React.FC<Props> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="py-8 px-4 text-center space-y-3">
      <div className="w-11 h-11 mx-auto rounded-2xl bg-gray-50 border border-gray-100 text-gray-400 flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-gray-800">{title}</h4>
        <p className="text-xs text-gray-400 max-w-xs mx-auto">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button size="sm" variant="secondary" onClick={onAction} className="text-xs">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
