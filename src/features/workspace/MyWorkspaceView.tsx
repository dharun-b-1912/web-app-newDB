import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { useToast } from '../../components/ui/Toast';
import { workspaceService, UserWorkspaceData, PendingTaskItem } from '../../services/workspaceService';
import { hrEventBus } from '../../services/hrEventBus';
import { Breadcrumb } from '../../components/shell/Breadcrumb';

// Subcomponents
import { WorkspacePersonalHeader } from './components/WorkspacePersonalHeader';
import { WorkspaceQuickActions } from './components/WorkspaceQuickActions';
import { WorkspacePersonalSummary } from './components/WorkspacePersonalSummary';
import { WorkspaceUpcomingAndActivity } from './components/WorkspaceUpcomingAndActivity';
import { WorkspacePayrollAndDocs } from './components/WorkspacePayrollAndDocs';
import { WorkspaceRequestsAndNotifications } from './components/WorkspaceRequestsAndNotifications';

// Interactive Modals
import { WorkspaceApplyLeaveModal } from './components/WorkspaceApplyLeaveModal';
import { WorkspaceNewRequestModal } from './components/WorkspaceNewRequestModal';
import { WorkspacePayslipModal } from './components/WorkspacePayslipModal';
import { WorkspaceDocumentsModal } from './components/WorkspaceDocumentsModal';
import { DashboardSkeleton } from '../dashboard/components/DashboardSkeleton';

interface Props {
  onNavigate?: (route: string) => void;
}

export const MyWorkspaceView: React.FC<Props> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { activeCompany } = useTenant();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessingAttendance, setIsProcessingAttendance] = useState<boolean>(false);
  const [workspaceData, setWorkspaceData] = useState<UserWorkspaceData | null>(null);

  // Modals
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState<boolean>(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState<boolean>(false);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState<boolean>(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState<boolean>(false);

  // Load authenticated workspace data
  const loadWorkspace = useCallback(async () => {
    if (!user) return;
    try {
      const data = await workspaceService.getWorkspaceData(user, activeCompany?.id);
      setWorkspaceData(data);
    } catch (err: any) {
      console.error('Failed to load employee workspace:', err);
      showToast('Unable to load workspace data.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user, activeCompany?.id]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  // Idempotent Real-time Event Subscription
  useEffect(() => {
    const unsub = hrEventBus.subscribe('*', () => {
      loadWorkspace();
    });
    return () => unsub();
  }, [loadWorkspace]);

  // Check In Handler
  const handleCheckIn = async () => {
    if (!user) return;
    setIsProcessingAttendance(true);
    try {
      const record = workspaceService.punchIn(workspaceData?.employee || null, user);
      showToast(`Checked in successfully at ${record.first_check_in}`, 'success');
      loadWorkspace();
    } catch (err: any) {
      showToast(err.message || 'Check-In failed.', 'error');
    } finally {
      setIsProcessingAttendance(false);
    }
  };

  // Check Out Handler
  const handleCheckOut = async () => {
    if (!user) return;
    setIsProcessingAttendance(true);
    try {
      const record = workspaceService.punchOut(workspaceData?.employee || null, user);
      if (record) {
        showToast(`Checked out successfully at ${record.last_check_out}`, 'success');
      } else {
        showToast('Checked out successfully.', 'success');
      }
      loadWorkspace();
    } catch (err: any) {
      showToast(err.message || 'Check-Out failed.', 'error');
    } finally {
      setIsProcessingAttendance(false);
    }
  };

  // Task click handler
  const handleOpenTask = (task: PendingTaskItem) => {
    if (task.targetRoute) {
      onNavigate?.(task.targetRoute);
    } else {
      showToast(`Opening task: ${task.title}`, 'info');
    }
  };

  if (!user || isLoading || !workspaceData) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <Breadcrumb items={[{ label: 'Home' }, { label: 'My Workspace' }]} />

      {/* 1. TOP HERO & LIVE ATTENDANCE CONTROL */}
      <WorkspacePersonalHeader
        user={user}
        employee={workspaceData.employee}
        activeCompany={activeCompany}
        attendanceState={workspaceData.attendanceState}
        todayAttendance={workspaceData.todayAttendance}
        workingDuration={workspaceData.workingDuration}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
        isProcessing={isProcessingAttendance}
      />

      {/* 2. QUICK ACTIONS ROW */}
      <WorkspaceQuickActions
        onApplyLeave={() => setIsLeaveModalOpen(true)}
        onViewPayslip={() => setIsPayslipModalOpen(true)}
        onNewRequest={() => setIsRequestModalOpen(true)}
        onViewDocuments={() => setIsDocumentsModalOpen(true)}
        onViewAttendanceHistory={() => onNavigate?.('attendance')}
        onViewProfile={() => onNavigate?.('my-profile')}
      />

      {/* 3. PERSONAL LEAVE BALANCES */}
      <WorkspacePersonalSummary
        leaveEntitlements={workspaceData.leaveEntitlements}
        onApplyLeave={() => setIsLeaveModalOpen(true)}
        onViewAllLeaves={() => onNavigate?.('leave')}
      />

      {/* 4. MY ACTION CENTER & UPCOMING EVENTS (2-COL) */}
      <WorkspaceUpcomingAndActivity
        pendingTasks={workspaceData.pendingTasks}
        upcomingHoliday={workspaceData.upcomingHoliday}
        activeShift={workspaceData.activeShift}
        onOpenTask={handleOpenTask}
        onViewCalendar={() => onNavigate?.('leave')}
      />

      {/* 5. LATEST PAYSLIP & MY DOCUMENTS (2-COL) */}
      <WorkspacePayrollAndDocs
        latestPayslip={workspaceData.latestPayslip}
        documents={workspaceData.documents}
        onViewPayslip={() => setIsPayslipModalOpen(true)}
        onViewDocuments={() => setIsDocumentsModalOpen(true)}
      />

      {/* 6. MY SERVICE REQUESTS & NOTIFICATION ALERTS (2-COL) */}
      <WorkspaceRequestsAndNotifications
        serviceRequests={workspaceData.serviceRequests}
        notifications={workspaceData.notifications}
        unreadNotificationCount={workspaceData.unreadNotificationCount}
        onNewRequest={() => setIsRequestModalOpen(true)}
        onViewAllRequests={() => onNavigate?.('requests')}
        onOpenNotifications={() => showToast('Opening notification feed.', 'info')}
      />

      {/* INTERACTIVE WORKFLOW MODALS */}
      <WorkspaceApplyLeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        employee={workspaceData.employee}
        user={user}
        entitlements={workspaceData.leaveEntitlements}
        onSubmitted={loadWorkspace}
      />

      <WorkspaceNewRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        employee={workspaceData.employee}
        user={user}
      />

      <WorkspacePayslipModal
        isOpen={isPayslipModalOpen}
        onClose={() => setIsPayslipModalOpen(false)}
        employee={workspaceData.employee}
        user={user}
        activeCompany={activeCompany}
      />

      <WorkspaceDocumentsModal
        isOpen={isDocumentsModalOpen}
        onClose={() => setIsDocumentsModalOpen(false)}
        employee={workspaceData.employee}
        user={user}
      />
    </div>
  );
};
