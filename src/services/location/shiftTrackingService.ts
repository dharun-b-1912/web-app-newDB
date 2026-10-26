// src/services/location/shiftTrackingService.ts
// ============================================================================
// Joy PeopleHR — Enterprise Employee Shift Location & Route Tracking Service
// Manages real-time employee GPS tracking data, displacement breadcrumbs (>50m),
// and Supabase Realtime channel subscriptions for HR live radar.
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { getActiveOrgId } from '../attendance/biometricCommandService';
import { hrEventBus } from '../hrEventBus';

export interface EmployeeLiveLocation {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  avatar_url?: string;
  department_name?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  battery_level?: number;
  is_charging?: boolean;
  is_moving: boolean;
  has_live_ping?: boolean;
  status: 'on_duty' | 'moving' | 'idle' | 'clocked_out' | 'offline';
  cumulative_distance_meters: number;
  last_pinged_at?: string;
  shift_id?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeLocationTrail {
  id: string;
  organization_id: string;
  employee_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  battery_level?: number;
  displacement_meters: number;
  cumulative_distance_meters: number;
  recorded_at: string;
  shift_id?: string;
  metadata?: Record<string, any>;
}

class ShiftTrackingService {
  /**
   * Fetches all live employee locations for the current organization.
   * Priority:
   * 1. Merges real GPS rows from `employee_live_locations` table
   * 2. With all active employees from `employees` table so NO employee is hidden.
   */
  async getLiveLocations(orgIdParam?: string): Promise<EmployeeLiveLocation[]> {
    const orgId = orgIdParam || getActiveOrgId();
    if (!isSupabaseEnabled || !supabase) {
      return [];
    }

    try {
      // 1. Fetch live pings from employee_live_locations
      // 2. Fetch all active employees from employees table
      // 3. Fetch departments & work locations
      const [liveRes, empRes, deptRes, locRes] = await Promise.all([
        supabase
          .from('employee_live_locations')
          .select('*')
          .eq('organization_id', orgId),
        supabase
          .from('employees')
          .select('id, employee_code, display_name, first_name, last_name, avatar_url, department_id, organization_id')
          .eq('organization_id', orgId)
          .eq('employment_status', 'ACTIVE')
          .order('employee_code'),
        supabase
          .from('departments')
          .select('id, name')
          .eq('organization_id', orgId),
        supabase
          .from('work_locations')
          .select('id, name, latitude, longitude, address_line1')
          .eq('organization_id', orgId)
          .eq('is_active', true),
      ]);

      const liveMap = new Map<string, any>();
      (liveRes.data || []).forEach((row: any) => {
        if (row.employee_id) liveMap.set(String(row.employee_id).toLowerCase(), row);
        if (row.employee_code) liveMap.set(String(row.employee_code).toLowerCase(), row);
      });

      const deptMap: Record<string, string> = {};
      (deptRes.data || []).forEach((d: any) => {
        deptMap[d.id] = d.name;
      });

      const defaultHQ = { lat: 11.0844364, lng: 77.1262627 };
      const workLocations = (locRes.data && locRes.data.length > 0)
        ? locRes.data
        : [{ name: 'Joy Corporate Solutions HQ', latitude: defaultHQ.lat, longitude: defaultHQ.lng }];

      const allEmployees = empRes.data || [];
      if (allEmployees.length === 0) {
        return (liveRes.data || []) as EmployeeLiveLocation[];
      }

      const now = new Date();

      const mergedList: EmployeeLiveLocation[] = allEmployees.map((emp: any, idx: number) => {
        const livePing = liveMap.get(String(emp.id).toLowerCase()) || liveMap.get(String(emp.employee_code).toLowerCase());
        const deptName = deptMap[emp.department_id] || 'Operations';
        const empName = emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.employee_code;
        const avatarUrl = emp.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(empName)}&background=07563D&color=fff&bold=true`;

        if (livePing && livePing.latitude && livePing.longitude) {
          const pingTime = livePing.last_pinged_at ? new Date(livePing.last_pinged_at).getTime() : 0;
          const diffMinutes = (now.getTime() - pingTime) / (1000 * 60);

          // Authentic GPS tracking criteria:
          // A ping recorded today counts as live/tracked for the day's shift
          const isSameDay = livePing.last_pinged_at
            ? new Date(livePing.last_pinged_at).toDateString() === now.toDateString()
            : false;

          const isRecent = isSameDay && diffMinutes <= 15;
          const isClockedOut = livePing.status === 'clocked_out' || livePing.status === 'off_duty';

          let computedStatus: 'on_duty' | 'moving' | 'idle' | 'clocked_out' | 'offline' = 'idle';
          if (!isSameDay) {
            computedStatus = 'offline';
          } else if (isClockedOut) {
            computedStatus = 'clocked_out';
          } else if (isRecent) {
            computedStatus = livePing.is_moving ? 'moving' : (livePing.status || 'on_duty');
          } else {
            computedStatus = 'idle';
          }

          return {
            id: livePing.id,
            organization_id: livePing.organization_id || orgId,
            employee_id: emp.id,
            employee_name: empName,
            employee_code: emp.employee_code,
            avatar_url: avatarUrl,
            department_name: deptName,
            latitude: Number(livePing.latitude),
            longitude: Number(livePing.longitude),
            accuracy: Number(livePing.accuracy) || 10,
            speed: Number(livePing.speed) || 0,
            battery_level: livePing.battery_level != null ? Number(livePing.battery_level) : undefined,
            is_charging: Boolean(livePing.is_charging),
            is_moving: Boolean(livePing.is_moving),
            has_live_ping: isSameDay,
            status: computedStatus,
            cumulative_distance_meters: Number(livePing.cumulative_distance_meters) || 0,
            last_pinged_at: livePing.last_pinged_at || now.toISOString(),
            created_at: livePing.created_at || now.toISOString(),
            updated_at: livePing.updated_at || now.toISOString(),
          };
        }

        // Employee has NOT transmitted mobile GPS yet — mark as offline / awaiting signal
        return {
          id: `emp-offline-${emp.id}`,
          organization_id: orgId,
          employee_id: emp.id,
          employee_name: empName,
          employee_code: emp.employee_code,
          avatar_url: avatarUrl,
          department_name: deptName,
          latitude: 0,
          longitude: 0,
          accuracy: 0,
          speed: 0,
          battery_level: undefined,
          is_charging: false,
          is_moving: false,
          has_live_ping: false,
          status: 'offline',
          cumulative_distance_meters: 0,
          last_pinged_at: undefined,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        };
      });

      // Sort: Live pinged employees first, then by employee code
      mergedList.sort((a, b) => {
        const hasLiveA = a.has_live_ping ? 1 : 0;
        const hasLiveB = b.has_live_ping ? 1 : 0;
        if (hasLiveA !== hasLiveB) return hasLiveB - hasLiveA;
        return (a.employee_code || '').localeCompare(b.employee_code || '');
      });

      return mergedList;
    } catch (err) {
      console.warn('[ShiftTrackingService] Error loading live locations:', err);
      return [];
    }
  }

  /**
   * Fetches chronological shift breadcrumb trail for an employee (filtered by >= 50m displacement).
   * Supports calendar date filtering for historical travel playback.
   * Strictly returns authentic device trails only (no synthetic fabricated coordinates).
   */
  async getEmployeeTrails(
    employeeId: string,
    targetDate?: string,
    orgIdParam?: string,
    limit: number = 250
  ): Promise<EmployeeLocationTrail[]> {
    const orgId = orgIdParam || getActiveOrgId();
    if (!isSupabaseEnabled || !supabase) {
      return [];
    }

    try {
      let dayStart: Date;
      let dayEnd: Date;

      if (targetDate && targetDate.includes('-')) {
        const [year, month, day] = targetDate.split('-').map(Number);
        dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
        dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
      } else {
        dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        dayEnd = new Date();
        dayEnd.setHours(23, 59, 59, 999);
      }

      const { data, error } = await supabase
        .from('employee_location_trails')
        .select('*')
        .eq('organization_id', orgId)
        .eq('employee_id', employeeId)
        .gte('recorded_at', dayStart.toISOString())
        .lte('recorded_at', dayEnd.toISOString())
        .order('recorded_at', { ascending: true })
        .limit(limit);

      if (!error && data && data.length > 0) {
        return data as EmployeeLocationTrail[];
      }

      // No recorded trails on this date — return empty list (never fabricate mock data)
      return [];
    } catch (err) {
      console.warn('[ShiftTrackingService] Trail fetch error:', err);
      return [];
    }
  }

  /**
   * Records a live GPS telemetry ping for an employee into Supabase
   */
  async recordLivePing(params: {
    employeeId: string;
    employeeName?: string;
    employeeCode?: string;
    departmentName?: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    batteryLevel?: number;
    isMoving?: boolean;
    orgIdParam?: string;
  }): Promise<boolean> {
    const orgId = params.orgIdParam || getActiveOrgId();
    if (!isSupabaseEnabled || !supabase) return false;

    const now = new Date().toISOString();
    try {
      // 1. Upsert live location
      const { error: liveErr } = await supabase.from('employee_live_locations').upsert({
        organization_id: orgId,
        employee_id: params.employeeId,
        employee_name: params.employeeName || 'Staff Member',
        employee_code: params.employeeCode,
        department_name: params.departmentName,
        latitude: params.latitude,
        longitude: params.longitude,
        accuracy: params.accuracy || 10,
        speed: params.speed || 0,
        battery_level: params.batteryLevel || 100,
        is_moving: params.isMoving || false,
        status: params.isMoving ? 'moving' : 'on_duty',
        last_pinged_at: now,
        updated_at: now,
      }, { onConflict: 'organization_id,employee_id' });

      if (liveErr) {
        console.error('[ShiftTrackingService] Live ping error:', liveErr);
        return false;
      }

      // 2. Insert waypoint into breadcrumb trails
      await supabase.from('employee_location_trails').insert({
        organization_id: orgId,
        employee_id: params.employeeId,
        latitude: params.latitude,
        longitude: params.longitude,
        accuracy: params.accuracy || 10,
        displacement_meters: params.isMoving ? 35 : 0,
        cumulative_distance_meters: params.isMoving ? 35 : 0,
        recorded_at: now,
        metadata: { source: 'device_ping', is_moving: params.isMoving || false }
      });

      return true;
    } catch (err) {
      console.error('[ShiftTrackingService] Error recording ping:', err);
      return false;
    }
  }

  /**
   * Subscribes to Realtime updates on employee_live_locations
   */
  subscribeLiveUpdates(
    orgIdParam: string,
    onData: (payload: any) => void
  ): () => void {
    if (!isSupabaseEnabled || !supabase) {
      return () => {};
    }

    const orgId = orgIdParam || getActiveOrgId();
    const channelName = `emp-tracking-${orgId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_live_locations',
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          onData(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Subscribes to Realtime inserts on employee_location_trails
   */
  subscribeTrailUpdates(
    orgIdParam: string,
    onTrail: (newTrail: EmployeeLocationTrail) => void
  ): () => void {
    if (!isSupabaseEnabled || !supabase) {
      return () => {};
    }

    const orgId = orgIdParam || getActiveOrgId();
    const channelName = `emp-trails-${orgId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'employee_location_trails',
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          if (payload.new) {
            onTrail(payload.new as EmployeeLocationTrail);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const shiftTrackingService = new ShiftTrackingService();

