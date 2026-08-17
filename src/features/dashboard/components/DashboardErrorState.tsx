import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface Props {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const DashboardErrorState: React.FC<Props> = ({
  title = 'Failed to load section data',
  message = 'An unexpected error occurred while communicating with the data service.',
  onRetry,
}) => {
  return (
    <div className="p-6 rounded-2xl border border-rose-100 bg-rose-50/40 text-center space-y-3">
      <div className="w-10 h-10 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-gray-900">{title}</h4>
        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">{message}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry} className="text-xs">
          <RotateCw className="w-3.5 h-3.5 mr-1.5" />
          Retry
        </Button>
      )}
    </div>
  );
};
