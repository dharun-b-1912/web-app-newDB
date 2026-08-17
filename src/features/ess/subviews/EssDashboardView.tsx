import React from 'react';
import { MyWorkspaceView } from '../../workspace/MyWorkspaceView';

interface EssDashboardViewProps {
  onNavigateTab?: (tabKey: string) => void;
}

export const EssDashboardView: React.FC<EssDashboardViewProps> = ({ onNavigateTab }) => {
  return <MyWorkspaceView onNavigate={onNavigateTab} />;
};
