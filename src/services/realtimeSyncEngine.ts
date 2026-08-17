import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { hrEventBus } from './hrEventBus';
import { api } from './api';
import { attendanceApi } from './attendanceApi';
import { leaveApi } from './leaveApi';

class RealtimeSyncEngine {
  private isInitialized: boolean = false;
  private channel: any = null;
  private pollingTimer: any = null;

  public initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (isSupabaseEnabled) {
      this.setupSupabaseRealtime();
    }

    // Secondary automatic reconciliation ticker (every 20s)
    this.setupAutoSyncPolling();
  }

  private setupSupabaseRealtime(): void {
    try {
      this.channel = supabase
        .channel('workforceos-realtime-mesh')
        // 1. Employees table changes
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'employees' },
          (payload: any) => {
            if (payload.eventType === 'INSERT') {
              hrEventBus.publish('employee.created', payload.new, { actorId: 'supabase-realtime' });
            } else if (payload.eventType === 'UPDATE') {
              hrEventBus.publish('employee.updated', payload.new, { actorId: 'supabase-realtime' });
            } else if (payload.eventType === 'DELETE') {
              hrEventBus.publish('employee.exited', payload.old, { actorId: 'supabase-realtime' });
            }
          }
        )
        // 2. Daily Attendance table changes
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'attendance_daily' },
          (payload: any) => {
            if (payload.eventType === 'INSERT') {
              hrEventBus.publish('attendance.recorded', payload.new, { actorId: 'supabase-realtime' });
            } else if (payload.eventType === 'UPDATE') {
              hrEventBus.publish('attendance.updated', payload.new, { actorId: 'supabase-realtime' });
            }
          }
        )
        // 3. Leave Requests table changes
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'leave_requests' },
          (payload: any) => {
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
          }
        )
        // 4. Approval Items
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'approval_items' },
          (payload: any) => {
            hrEventBus.publish('position.created', payload.new, { actorId: 'supabase-realtime' });
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log('[RealtimeSyncEngine] Supabase Postgres live replication stream active.');
          }
        });
    } catch (err) {
      console.warn('[RealtimeSyncEngine] Error initializing Supabase Realtime channel:', err);
    }
  }

  private setupAutoSyncPolling(): void {
    if (this.pollingTimer) clearInterval(this.pollingTimer);

    // Run automatic quiet background polling to ensure zero data drift across all clients
    this.pollingTimer = setInterval(async () => {
      try {
        if (isSupabaseEnabled) {
          const today = new Date().toISOString().split('T')[0];
          const [employees, attendance, leaves] = await Promise.all([
            supabase.from('employees').select('*').limit(200),
            supabase.from('attendance_daily').select('*').eq('date', today),
            supabase.from('leave_requests').select('*').limit(100),
          ]);

          if (employees.data) {
            localStorage.setItem('workforce_employees', JSON.stringify(employees.data));
          }
          if (attendance.data) {
            localStorage.setItem('workforceos_attendance_daily_v1', JSON.stringify(attendance.data));
          }
          if (leaves.data) {
            localStorage.setItem('workforce_leave_requests_v1', JSON.stringify(leaves.data));
          }
        }
      } catch (err) {
        // Silently ignore background polling exceptions
      }
    }, 20000);
  }

  public destroy(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.isInitialized = false;
  }
}

export const realtimeSyncEngine = new RealtimeSyncEngine();
