// ============================================================
// Joy PeopleHR — Realtime Synchronization Engine
// ============================================================
// Subscribes domain entities through RealtimeChannelManager
// Bridges Postgres WAL changes into hrEventBus and authoritative cache invalidation
// ============================================================

import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { hrEventBus } from './hrEventBus';
import { api } from './api';
import { logger } from './diagnostics/loggerService';
import { realtimeChannelManager } from './realtime/realtimeChannelManager';
import { leaveApi } from './leaveApi';
import { attendanceRegularizationService } from './attendance/attendanceRegularizationService';
import { notificationService } from './notification/notificationService';

class RealtimeSyncEngine {
  private isInitialized: boolean = false;
  private disposers: Array<() => void> = [];
  private pollingTimer: any = null;

  public initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    realtimeChannelManager.initialize();

    if (isSupabaseEnabled) {
      this.setupDomainSubscribers();
    }

    this.setupAutoSyncPolling();
  }

  private setupDomainSubscribers(): void {
    // 1. Employees Table
    const unsubEmployees = realtimeChannelManager.subscribeToTable('employees', (payload) => {
      logger.sync('EMPLOYEE_EVENT', {
        table: 'employees',
        operation: payload.eventType,
        employeeId: payload.new?.id || payload.old?.id,
        status: 'PROCESSING',
      });

      if (payload.eventType === 'INSERT') {
        try {
          const list = JSON.parse(localStorage.getItem('workforce_employees') || '[]');
          if (!list.some((e: any) => e.id === payload.new.id)) {
            localStorage.setItem('workforce_employees', JSON.stringify([payload.new, ...list]));
          }
        } catch (_) {}
        hrEventBus.publish('employee.created', payload.new, { actorId: 'supabase-realtime' });
      } else if (payload.eventType === 'UPDATE') {
        try {
          const list = JSON.parse(localStorage.getItem('workforce_employees') || '[]');
          const idx = list.findIndex((e: any) => e.id === payload.new.id);
          if (idx !== -1) {
            const existingVersion = list[idx]?.record_version || 0;
            const newVersion = payload.new?.record_version || 0;
            if (newVersion >= existingVersion || payload.new?.avatar_url) {
              list[idx] = { ...list[idx], ...payload.new };
              localStorage.setItem('workforce_employees', JSON.stringify(list));
            }
          } else {
            list.unshift(payload.new);
            localStorage.setItem('workforce_employees', JSON.stringify(list));
          }
        } catch (_) {}

        // Immediate sync with current user in memory/session if avatar changed or user matches
        try {
          const currentUser = api.getCurrentUser();
          if (
            currentUser &&
            (currentUser.id === payload.new.id ||
              currentUser.employee_id === payload.new.id ||
              currentUser.employee_id === payload.new.employee_code ||
              (currentUser.email && payload.new.work_email && currentUser.email.toLowerCase() === payload.new.work_email.toLowerCase()))
          ) {
            if (payload.new.avatar_url && payload.new.avatar_url !== currentUser.avatar_url) {
              api.setCurrentUser({
                ...currentUser,
                avatar_url: payload.new.avatar_url,
              });
            }
          }
        } catch (_) {}

        hrEventBus.publish('employee.updated', payload.new, { actorId: 'supabase-realtime' });
        if (payload.new?.status) {
          hrEventBus.publish('employee.status_changed', { employee_id: payload.new.id, new_status: payload.new.status, employee: payload.new }, { actorId: 'supabase-realtime' });
        }
      } else if (payload.eventType === 'DELETE') {
        try {
          const list = JSON.parse(localStorage.getItem('workforce_employees') || '[]');
          localStorage.setItem('workforce_employees', JSON.stringify(list.filter((e: any) => e.id !== payload.old.id)));
        } catch (_) {}
        hrEventBus.publish('employee.deleted', payload.old, { actorId: 'supabase-realtime' });
      }
    });
    this.disposers.push(unsubEmployees);

    // 2. Attendance Regularizations (Canonical Table)
    const unsubRegularization = realtimeChannelManager.subscribeToTable('attendance_regularizations', (payload) => {
      logger.sync('REGULARIZATION_EVENT', {
        table: 'attendance_regularizations',
        operation: payload.eventType,
        status: payload.new?.status,
        metadata: { requestId: payload.new?.id || payload.old?.id },
      } as any);

      // Invalidate and refresh cache in background
      attendanceRegularizationService.fetchRequestsFromDb().catch(() => {});

      const row = payload.new || payload.old;
      const status = (payload.new?.status || '').toUpperCase();

      if (payload.eventType === 'INSERT') {
        hrEventBus.publish('regularization.submitted', row, { actorId: 'supabase-realtime' });
      } else if (payload.eventType === 'UPDATE') {
        if (status === 'APPROVED') {
          hrEventBus.publish('regularization.approved', row, { actorId: 'supabase-realtime' });
        } else if (status === 'REJECTED') {
          hrEventBus.publish('regularization.rejected', row, { actorId: 'supabase-realtime' });
        } else {
          hrEventBus.publish('regularization.updated', row, { actorId: 'supabase-realtime' });
        }
      } else if (payload.eventType === 'DELETE') {
        hrEventBus.publish('regularization.updated', row, { actorId: 'supabase-realtime' });
      }
    });
    this.disposers.push(unsubRegularization);

    // 3. Daily Attendance (Flutter Mobile & Biometric Live Punches)
    const unsubAttendance = realtimeChannelManager.subscribeToTable('attendance_daily', (payload) => {
      const row = payload.new || payload.old;
      if (!row) return;

      const getAttendanceKeys = () => {
        const s = new Set([
          'workforceos_attendance_daily_v2',
          'workforceos_attendance_daily_v2_org-joy-01',
        ]);
        try {
          const activeOrg = localStorage.getItem('workforce_active_org_id');
          if (activeOrg) s.add(`workforceos_attendance_daily_v2_${activeOrg}`);
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('workforceos_attendance_daily_v2')) {
              s.add(k);
            }
          }
        } catch {}
        return Array.from(s);
      };

      const keys = getAttendanceKeys();
      if (payload.eventType === 'DELETE') {
        for (const k of keys) {
          try {
            const stored = localStorage.getItem(k);
            const list = stored ? JSON.parse(stored) : [];
            const filtered = list.filter((a: any) => a.id !== row.id && !(a.employee_id === row.employee_id && a.date === row.date));
            localStorage.setItem(k, JSON.stringify(filtered));
          } catch {}
        }
        hrEventBus.publish('attendance.deleted', row, { actorId: 'supabase-realtime' });
      } else {
        for (const k of keys) {
          try {
            const stored = localStorage.getItem(k);
            const list = stored ? JSON.parse(stored) : [];
            const idx = list.findIndex((a: any) => 
              a.id === row.id || 
              (a.employee_id && row.employee_id && a.employee_id === row.employee_id && a.date === row.date) ||
              (a.employee_code && row.employee_code && a.employee_code === row.employee_code && a.date === row.date)
            );
            if (idx >= 0) {
              list[idx] = { ...list[idx], ...row };
            } else {
              list.unshift(row);
            }
            localStorage.setItem(k, JSON.stringify(list));
          } catch {}
        }
        if (payload.eventType === 'INSERT') {
          hrEventBus.publish('attendance.recorded', payload.new, { actorId: 'supabase-realtime' });
          hrEventBus.publish('attendance.punch_received', payload.new, { actorId: 'supabase-realtime' });
        } else if (payload.eventType === 'UPDATE') {
          hrEventBus.publish('attendance.updated', payload.new, { actorId: 'supabase-realtime' });
          hrEventBus.publish('attendance.punch_received', payload.new, { actorId: 'supabase-realtime' });
        }
      }
    });
    this.disposers.push(unsubAttendance);

    // 4. Leave Requests (Canonical Table)
    const unsubLeave = realtimeChannelManager.subscribeToTable('leave_requests', (payload) => {
      // Revalidate in-memory/async leave cache
      leaveApi.getLeaveRequestsAsync().catch(() => {});

      const status = (payload.new?.status || '').toUpperCase();
      if (payload.eventType === 'INSERT') {
        hrEventBus.publish('leave.submitted', payload.new, { actorId: 'supabase-realtime' });
      } else if (payload.eventType === 'UPDATE') {
        if (status === 'APPROVED') {
          hrEventBus.publish('leave.approved', payload.new, { actorId: 'supabase-realtime' });
        } else if (status === 'REJECTED') {
          hrEventBus.publish('leave.rejected', payload.new, { actorId: 'supabase-realtime' });
        } else {
          hrEventBus.publish('leave.submitted', payload.new, { actorId: 'supabase-realtime' });
        }
        hrEventBus.publish('leave.updated', payload.new, { actorId: 'supabase-realtime' });
      } else if (payload.eventType === 'DELETE') {
        hrEventBus.publish('leave.deleted', payload.old, { actorId: 'supabase-realtime' });
      }
    });
    this.disposers.push(unsubLeave);

    // 4b. Leave Balances (Canonical Table)
    const unsubLeaveEnt = realtimeChannelManager.subscribeToTable('leave_balances', (payload) => {
      hrEventBus.publish('leave.entitlement_updated', payload.new || payload.old, { actorId: 'supabase-realtime' });
    });
    this.disposers.push(unsubLeaveEnt);

    // 4c. Leave Ledger (Canonical Table)
    const unsubLeaveLed = realtimeChannelManager.subscribeToTable('leave_ledger_entries', (payload) => {
      hrEventBus.publish('leave.ledger_updated', payload.new || payload.old, { actorId: 'supabase-realtime' });
    });
    this.disposers.push(unsubLeaveLed);

    // 4d. Leave Types (Realtime Sync with Mobile App & Master Config)
    const unsubLeaveTypes = realtimeChannelManager.subscribeToTable('leave_types', (payload) => {
      const row = payload.new || payload.old;
      if (!row) return;

      const keys = ['workforce_leave_types_v2'];
      try {
        const activeOrg = localStorage.getItem('workforce_active_org_id');
        if (activeOrg) keys.push(`workforce_leave_types_v2_${activeOrg}`);
      } catch {}

      if (payload.eventType === 'DELETE') {
        for (const k of keys) {
          try {
            const list = JSON.parse(localStorage.getItem(k) || '[]');
            localStorage.setItem(k, JSON.stringify(list.filter((t: any) => t.id !== row.id)));
          } catch {}
        }
        hrEventBus.publish('leave.type_deleted', row, { actorId: 'supabase-realtime' });
      } else {
        for (const k of keys) {
          try {
            const list = JSON.parse(localStorage.getItem(k) || '[]');
            const idx = list.findIndex((t: any) => t.id === row.id || (t.code && row.code && t.code.toUpperCase() === row.code.toUpperCase()));
            if (idx >= 0) {
              list[idx] = { ...list[idx], ...row };
            } else {
              list.push(row);
            }
            localStorage.setItem(k, JSON.stringify(list));
          } catch {}
        }
        hrEventBus.publish('leave.type_updated', row, { actorId: 'supabase-realtime' });
      }
    });
    this.disposers.push(unsubLeaveTypes);

    // 5. Employee Shift Assignments (Canonical Table replacing roster)
    const unsubShiftAssignments = realtimeChannelManager.subscribeToTable('employee_shift_assignments', (payload) => {
      const row = payload.new || payload.old;
      if (row) {
        logger.sync('SHIFT_ASSIGNMENT_REALTIME_EVENT', {
          table: 'employee_shift_assignments',
          operation: payload.eventType,
          employeeId: row.employee_id,
          status: 'RECEIVED',
        });
        hrEventBus.publish('roster.updated', row, { actorId: 'supabase-realtime' });
        hrEventBus.publish('shift.assigned', row, { actorId: 'supabase-realtime' });
      }
    });
    this.disposers.push(unsubShiftAssignments);

    // 6. Employee Documents (Canonical Table)
    const unsubDocReq = realtimeChannelManager.subscribeToTable('employee_documents', (payload) => {
      const row = payload.new || payload.old;
      if (row) {
        logger.sync('DOCUMENT_REQUIREMENT_EVENT', {
          table: 'employee_documents',
          operation: payload.eventType,
          employeeId: row.employee_id,
          status: 'RECEIVED',
        });
        const status = (row.verification_status || row.status || '').toUpperCase();
        if (status === 'VERIFIED') {
          hrEventBus.publish('document.verified', row, { actorId: 'supabase-realtime' });
        } else if (status === 'REJECTED') {
          hrEventBus.publish('document.rejected', row, { actorId: 'supabase-realtime' });
        } else {
          hrEventBus.publish('document.updated', row, { actorId: 'supabase-realtime' });
        }
      }
    });
    this.disposers.push(unsubDocReq);

    // 7. Work Locations & Geofences Master (Canonical Table)
    const unsubWorkLocations = realtimeChannelManager.subscribeToTable('work_locations', (payload) => {
      const row = payload.new || payload.old;
      if (row) {
        logger.sync('WORK_LOCATION_EVENT', {
          table: 'work_locations',
          operation: payload.eventType,
          metadata: { locationId: row.id },
          status: 'RECEIVED',
        });
        try {
          const k = `workforceos_work_locations_v2_${row.organization_id || 'org-joy-01'}`;
          const list = JSON.parse(localStorage.getItem(k) || '[]');
          if (payload.eventType === 'DELETE') {
            localStorage.setItem(k, JSON.stringify(list.filter((l: any) => l.id !== row.id)));
          } else {
            const idx = list.findIndex((l: any) => l.id === row.id);
            if (idx >= 0) list[idx] = { ...list[idx], ...row };
            else list.push(row);
            localStorage.setItem(k, JSON.stringify(list));
          }
        } catch (_) {}
        hrEventBus.publish('location.updated', row, { actorId: 'supabase-realtime' });
      }
    });
    this.disposers.push(unsubWorkLocations);

    // 8. Payslips (Canonical Table)
    const unsubPayslips = realtimeChannelManager.subscribeToTable('payslips', (payload) => {
      const row = payload.new || payload.old;
      if (row) {
        logger.sync('PAYSLIP_REALTIME_EVENT', {
          table: 'payslips',
          operation: payload.eventType,
          employeeId: row.employee_id,
          status: 'RECEIVED',
        });
        hrEventBus.publish('payroll.payslip_published', row, { actorId: 'supabase-realtime' });
      }
    });
    this.disposers.push(unsubPayslips);

    // 9. Employee Requests (Canonical Table)
    const unsubEmployeeRequests = realtimeChannelManager.subscribeToTable('employee_requests', (payload) => {
      const row = payload.new || payload.old;
      if (row) {
        logger.sync('EMPLOYEE_REQUEST_EVENT', {
          table: 'employee_requests',
          operation: payload.eventType,
          employeeId: row.employee_id,
          status: 'RECEIVED',
        });
        hrEventBus.publish('employee_request.updated', row, { actorId: 'supabase-realtime' });
      }
    });
    this.disposers.push(unsubEmployeeRequests);

    // 10. Notification Events (Canonical Table)
    const unsubNotificationEvents = realtimeChannelManager.subscribeToTable('notification_events', (payload) => {
      const row = payload.new || payload.old;
      if (row) {
        logger.sync('NOTIFICATION_REALTIME_EVENT', {
          table: 'notification_events',
          operation: payload.eventType,
          type: row.event_type,
          status: 'RECEIVED',
          metadata: { recipientId: row.recipient_user_id },
        } as any);
        hrEventBus.publish('notification.received', row, { actorId: 'supabase-realtime' });
      }
    });
    this.disposers.push(unsubNotificationEvents);

    // 11. Vendors Master Table
    const unsubVendors = realtimeChannelManager.subscribeToTable('vendors', (payload) => {
      const row = payload.new || payload.old;
      if (row) {
        if (payload.eventType === 'INSERT') {
          hrEventBus.publish('vendor.created', row, { actorId: 'supabase-realtime' });
        } else if (payload.eventType === 'UPDATE') {
          hrEventBus.publish('vendor.updated', row, { actorId: 'supabase-realtime' });
        } else if (payload.eventType === 'DELETE') {
          hrEventBus.publish('vendor.deleted', row, { actorId: 'supabase-realtime' });
        }
      }
    });
    this.disposers.push(unsubVendors);

    // 12. Vendor Contracts
    const unsubVendorContracts = realtimeChannelManager.subscribeToTable('vendor_contracts', (payload) => {
      const row = payload.new || payload.old;
      if (row) {
        hrEventBus.publish('vendor.contract_updated', row, { actorId: 'supabase-realtime' });
      }
    });
    this.disposers.push(unsubVendorContracts);

    // 13. Vendor Employees / Contract Workers
    const unsubVendorWorkers = realtimeChannelManager.subscribeToTable('vendor_employees', (payload) => {
      const row = payload.new || payload.old;
      if (row) {
        hrEventBus.publish('vendor.worker_updated', row, { actorId: 'supabase-realtime' });
      }
    });
    this.disposers.push(unsubVendorWorkers);

    // 14. Vendor Invoices
    const unsubVendorInvoices = realtimeChannelManager.subscribeToTable('vendor_invoices', (payload) => {
      const row = payload.new || payload.old;
      if (row) {
        hrEventBus.publish('vendor.invoice_updated', row, { actorId: 'supabase-realtime' });
      }
    });
    this.disposers.push(unsubVendorInvoices);

    // 15. Approvals / Approval Requests
    const unsubApprovals = realtimeChannelManager.subscribeToTable('approval_requests', (payload) => {
      const row = payload.new || payload.old;
      if (row) {
        hrEventBus.publish('approval.requested', row, { actorId: 'supabase-realtime' });
      }
    });
    this.disposers.push(unsubApprovals);
  }

  private setupAutoSyncPolling(): void {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    this.pollingTimer = null;
  }

  public destroy(): void {
    this.disposers.forEach((unsub) => {
      try {
        unsub();
      } catch (_) {}
    });
    this.disposers = [];

    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.isInitialized = false;
  }
}

export const realtimeSyncEngine = new RealtimeSyncEngine();

