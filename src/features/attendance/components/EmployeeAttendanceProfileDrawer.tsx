import React from 'react';
import { EmployeeAttendanceStatementModal } from './EmployeeAttendanceStatementModal';

export interface EmployeeAttendanceProfileDrawerProps {
  employeeId: string | null;
  initialDate?: string;
  initialPeriod?: string;
  onClose: () => void;
  onNavigateEmployee?: (employeeId: string) => void;
  onNavigateSubPath?: (subPath: string) => void;
}

export const EmployeeAttendanceProfileDrawer: React.FC<EmployeeAttendanceProfileDrawerProps> = ({
  employeeId,
  initialDate,
  initialPeriod,
  onClose,
  onNavigateEmployee,
  onNavigateSubPath,
}) => {
  if (!employeeId) return null;

  return (
    <EmployeeAttendanceStatementModal
      employeeId={employeeId}
      initialDate={initialDate}
      initialPeriod={initialPeriod}
      onClose={onClose}
      onNavigateEmployee={onNavigateEmployee}
      onNavigateSubPath={onNavigateSubPath}
    />
  );
};
