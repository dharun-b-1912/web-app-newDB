// ============================================================
// Joy PeopleHR — Realtime Synchronization Engine
// ============================================================
// Subscribes domain entities through RealtimeChannelManager
// Bridges Postgres WAL changes into hrEventBus and authoritative cache invalidation
// ============================================================

import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { hrEventBus } from './hrEventBus';
import { logger } from './diagnostics/loggerService';
import { realtimeChannelManager } from './realtime/realtimeChannelManager';

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
            if (newVersion >= existingVersion) {
              list[idx] = { ...list[idx], ...payload.new };
              localStorage.setItem('workforce_employees', JSON.stringify(list));
            }
          } else {
            list.unshift(payload.new);
            localStorage.setItem('workforce_employees', JSON.stringify(list));
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

    // 2. Realtime Outbox Mesh (Canonical Domain Events)
    const unsubOutbox = realtimeChannelManager.subscribeToTable('realtime_outbox', (payload) => {
      if (payload.eventType === 'INSERT') {
        const outboxRecord = payload.new;
        if (outboxRecord?.event_type) {
          logger.sync('OUTBOX_EVENT', {
            action: outboxRecord.event_type,
            organizationId: outboxRecord.organization_id,
            status: 'RECEIVED',
          });
          hrEventBus.publish(outboxRecord.event_type, outboxRecord.payload, {
            organizationId: outboxRecord.organization_id,
            actorId: outboxRecord.actor_id,
            eventId: outboxRecord.id,
          });
        }
      }
    });
    this.disposers.push(unsubOutbox);

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

    // 4. Leave Requests
    const unsubLeave = realtimeChannelManager.subscribeToTable('leave_requests', (payload) => {
      if (payload.eventType === 'INSERT') {
        hrEventBus.publish('leave.submitted', payload.new, { actorId: 'supabase-realtime' });
      } else if (payload.eventType === 'UPDATE') {
        if (payload.new.status === 'Approved') {
          hrEventBus.publish('leave.approved', payload.new, { actorId: 'supabase-realtime' });
        } else if (payload.new.status === 'Rejected') {
          hrEventBus.publish('leave.rejected', payload.new, { actorId: 'supabase-realtime' });
        } else {
          hrEventBus.publish('leave.submitted', payload.new, { actorId: 'supabase-realtime' });
        }
      }
    });
    this.disposers.push(unsubLeave);

    // 4b. Leave Entitlements
    const unsubLeaveEnt = realtimeChannelManager.subscribeToTable('leave_entitlements', (payload) => {
      hrEventBus.publish('leave.entitlement_updated', payload.new || payload.old, { actorId: 'supabase-realtime' });
    });
    this.disposers.push(unsubLeaveEnt);

    // 4c. Leave Ledger
    const unsubLeaveLed = realtimeChannelManager.subscribeToTable('leave_ledger_transactions', (payload) => {
      hrEventBus.publish('leave.ledger_updated', payload.new || payload.old, { actorId: 'supabase-realtime' });
    });
    this.disposers.push(unsubLeaveLed);

    // 4d. Leave Types (Realtime Sync with Flutter Mobile App & Master Config)
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

    // 5. Document Master
    const unsubDocuments = realtimeChannelManager.subscribeToTable('document_master', (payload) => {
      const row = payload.new || payload.old;
      if (!row) return;

      const keys = ['workforce_document_master_v2', 'workforce_document_master_v2_org-joy-01'];
      try {
        const activeOrg = localStorage.getItem('workforce_active_org_id');
        if (activeOrg) keys.push(`workforce_document_master_v2_${activeOrg}`);
      } catch {}

      if (payload.eventType === 'DELETE') {
        for (const k of keys) {
          try {
            const list = JSON.parse(localStorage.getItem(k) || '[]');
            localStorage.setItem(k, JSON.stringify(list.filter((d: any) => d.id !== row.id)));
          } catch {}
        }
        hrEventBus.publish('document.deleted', row, { actorId: 'supabase-realtime' });
      } else {
        for (const k of keys) {
          try {
            const list = JSON.parse(localStorage.getItem(k) || '[]');
            const idx = list.findIndex((d: any) => d.id === row.id);
            if (idx >= 0) list[idx] = { ...list[idx], ...row };
            else list.unshift(row);
            localStorage.setItem(k, JSON.stringify(list));
          } catch {}
        }
        if (payload.eventType === 'INSERT') {
          hrEventBus.publish('document.created', row, { actorId: 'supabase-realtime' });
        } else if (payload.eventType === 'UPDATE') {
          if (row.verification_status === 'VERIFIED') {
            hrEventBus.publish('document.verified', row, { actorId: 'supabase-realtime' });
          } else if (row.verification_status === 'REJECTED') {
            hrEventBus.publish('document.rejected', row, { actorId: 'supabase-realtime' });
          } else {
            hrEventBus.publish('document.updated', row, { actorId: 'supabase-realtime' });
          }
        }
      }
    });
    this.disposers.push(unsubDocuments);

    // 6. Employee Profile Media
    const unsubMedia = realtimeChannelManager.subscribeToTable('employee_profile_media', (payload) => {
      const row = payload.new;
      if (row && payload.eventType === 'INSERT' && row.status === 'ACTIVE') {
        hrEventBus.publish('employee.profile_photo.updated', {
          tenant_id: row.tenant_id,
          organization_id: row.organization_id,
          employee_id: row.employee_id,
          media_id: row.id,
          media_version: row.media_version,
          occurred_at: row.created_at,
        }, { actorId: 'supabase-realtime' });
      }
    });
    this.disposers.push(unsubMedia);

    // 7. Attendance Shift Roster Entries (Sync with Mobile App & Multi-Device)
    const unsubRoster = realtimeChannelManager.subscribeToTable('attendance_roster_entries', (payload) => {
      const row = payload.new || payload.old;
      if (row) {
        logger.sync('ROSTER_REALTIME_EVENT', {
          table: 'attendance_roster_entries',
          operation: payload.eventType,
          employeeId: row.employee_id,
          status: 'RECEIVED',
        });
        hrEventBus.publish('roster.updated', row, { actorId: 'supabase-realtime' });
      }
    });
    this.disposers.push(unsubRoster);

    // 8. Document Requirements (Realtime Document Requests to Employee Mobile)
    const unsubDocReq = realtimeChannelManager.subscribeToTable('document_requirements', (payload) => {
      const row = payload.new || payload.old;
      if (row) {
        logger.sync('DOCUMENT_REQUIREMENT_EVENT', {
          table: 'document_requirements',
          operation: payload.eventType,
          employeeId: row.employee_id,
          status: 'RECEIVED',
        });
        hrEventBus.publish('document.updated', row, { actorId: 'supabase-realtime' });
      }
    });
    this.disposers.push(unsubDocReq);

    // 9. Work Locations & Geofences Master
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

    // 10. Employee Work Location Assignments
    const unsubEmpWorkLocations = realtimeChannelManager.subscribeToTable('employee_work_locations', (payload) => {
      const row = payload.new || payload.old;
      if (row) {
        logger.sync('EMP_WORK_LOCATION_EVENT', {
          table: 'employee_work_locations',
          operation: payload.eventType,
          employeeId: row.employee_id,
          status: 'RECEIVED',
        });
        try {
          const k = `workforceos_emp_work_locations_v2_${row.organization_id || 'org-joy-01'}`;
          const list = JSON.parse(localStorage.getItem(k) || '[]');
          if (payload.eventType === 'DELETE') {
            localStorage.setItem(k, JSON.stringify(list.filter((a: any) => a.id !== row.id)));
          } else {
            const idx = list.findIndex((a: any) => a.id === row.id);
            if (idx >= 0) list[idx] = { ...list[idx], ...row };
            else list.push(row);
            localStorage.setItem(k, JSON.stringify(list));
          }
        } catch (_) {}
        hrEventBus.publish('location.assignment_updated', row, { actorId: 'supabase-realtime' });
      }
    });
    this.disposers.push(unsubEmpWorkLocations);

    // 11. Attendance Location Events & GPS Audit Logs
    const unsubLocEvents = realtimeChannelManager.subscribeToTable('attendance_location_events', (payload) => {
      const row = payload.new;
      if (row && payload.eventType === 'INSERT') {
        logger.sync('LOCATION_AUDIT_EVENT', {
          table: 'attendance_location_events',
          operation: payload.eventType,
          employeeId: row.employee_id,
          metadata: { eventId: row.id },
          status: 'RECEIVED',
        });
        try {
          const k = `workforceos_location_events_v2_${row.organization_id || 'org-joy-01'}`;
          const list = JSON.parse(localStorage.getItem(k) || '[]');
          list.unshift(row);
          if (list.length > 500) list.length = 500;
          localStorage.setItem(k, JSON.stringify(list));
        } catch (_) {}
        hrEventBus.publish('attendance.location_event_created', row, { actorId: 'supabase-realtime' });
      }
    });
    this.disposers.push(unsubLocEvents);
  }

  private setupAutoSyncPolling(): void {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    this.pollingTimer = null;
    // WebSockets via realtimeChannelManager provide live instant sync with zero excess egress.
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
