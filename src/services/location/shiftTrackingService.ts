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
  gender?: string;
  department_name?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  battery_level?: number;
  is_charging?: boolean;
  is_moving: boolean;
  has_live_ping?: boolean;
  is_stale?: boolean;
  minutes_since_ping?: number;
  is_on_leave?: boolean;
  leave_reason?: string;
  last_known_latitude?: number;
  last_known_longitude?: number;
  status: 'on_duty' | 'moving' | 'idle' | 'clocked_out' | 'offline' | 'on_leave';
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
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      // 1. Fetch live telemetry pings from employee_live_locations
      // 2. Fetch all active employees from employees table
      // 3. Fetch departments & work locations
      // 4. Fetch authoritative GPS marks from attendance_punches (mobile GPS punches)
      // 5. Fetch approved & pending leave requests covering today (to honor employee leave privacy)
      // 6. Fetch canonical daily attendance records for today (to detect leave / clock-out states)
      const [liveRes, empRes, deptRes, locRes, punchRes, leaveRes, dailyRes] = await Promise.all([
        supabase
          .from('employee_live_locations')
          .select('*')
          .eq('organization_id', orgId)
          .neq('employee_code', 'JCS-099')
          .not('employee_name', 'ilike', '%DEMO%'),
        supabase
          .from('employees')
          .select('id, employee_code, display_name, first_name, last_name, avatar_url, department_id, organization_id, gender')
          .eq('organization_id', orgId)
          .eq('employment_status', 'ACTIVE')
          .neq('employee_code', 'JCS-099')
          .not('employee_code', 'ilike', '%DEMO%')
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
        supabase
          .from('attendance_punches')
          .select('id, employee_id, punch_time, punch_type, latitude, longitude, accuracy_meters, punch_source, created_at, location_authorized')
          .eq('organization_id', orgId)
          .not('latitude', 'is', null)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('leave_requests')
          .select('id, employee_id, start_date, end_date, status, reason')
          .eq('organization_id', orgId)
          .lte('start_date', todayStr)
          .gte('end_date', todayStr)
          .neq('status', 'REJECTED')
          .neq('status', 'CANCELLED'),
        supabase
          .from('attendance_daily')
          .select('id, employee_id, status, attendance_date, first_check_in, last_check_out')
          .eq('organization_id', orgId)
          .eq('attendance_date', todayStr),
      ]);

      const liveMap = new Map<string, any>();
      (liveRes.data || []).forEach((row: any) => {
        if (row.employee_id) liveMap.set(String(row.employee_id).toLowerCase(), row);
        if (row.employee_code) liveMap.set(String(row.employee_code).toLowerCase(), row);
      });

      // Index punches by employee_id — first punch encountered is the most recent
      const punchMap = new Map<string, any>();
      (punchRes.data || []).forEach((p: any) => {
        const k = String(p.employee_id).toLowerCase();
        if (!punchMap.has(k)) {
          punchMap.set(k, p);
        }
      });

      // Index approved / pending leaves covering today
      const leaveMap = new Map<string, any>();
      (leaveRes.data || []).forEach((l: any) => {
        const sStr = (l.start_date || l.from_date || '').toString().slice(0, 10);
        const eStr = (l.end_date || l.to_date || '').toString().slice(0, 10);
        const status = (l.status || '').toString().toUpperCase();
        const isActiveStatus = status !== 'REJECTED' && status !== 'CANCELLED';
        const coversToday = (!sStr || sStr <= todayStr) && (!eStr || eStr >= todayStr);

        if (isActiveStatus && coversToday && l.employee_id) {
          leaveMap.set(String(l.employee_id).toLowerCase(), l);
        }
      });

      // Index today's attendance daily ledger
      const dailyMap = new Map<string, any>();
      (dailyRes.data || []).forEach((d: any) => {
        if (d.employee_id) {
          dailyMap.set(String(d.employee_id).toLowerCase(), d);
        }
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

      const mergedList: EmployeeLiveLocation[] = allEmployees.map((emp: any) => {
        const empIdKey = String(emp.id).toLowerCase();
        const empCodeKey = String(emp.employee_code).toLowerCase();

        const livePing = liveMap.get(empIdKey) || liveMap.get(empCodeKey);
        const latestPunch = punchMap.get(empIdKey);
        const leaveRecord = leaveMap.get(empIdKey);
        const dailyRecord = dailyMap.get(empIdKey);

        const deptName = deptMap[emp.department_id] || 'Operations';
        const empName = emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.employee_code;
        const avatarUrl = emp.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(empName)}&background=07563D&color=fff&bold=true`;

        // Check timestamps to decide whether livePing or latestPunch is newer
        const pingTime = livePing && livePing.last_pinged_at ? new Date(livePing.last_pinged_at).getTime() : 0;
        const punchTime = latestPunch && (latestPunch.punch_time || latestPunch.created_at)
          ? new Date(latestPunch.punch_time || latestPunch.created_at).getTime()
          : 0;

        // Authoritative verification: Has the employee punched with GPS TODAY?
        const isPunchToday = punchTime > 0
          ? new Date(punchTime).toDateString() === now.toDateString()
          : false;

        // Has the employee transmitted a telemetry ping TODAY?
        const isPingToday = pingTime > 0
          ? new Date(pingTime).toDateString() === now.toDateString()
          : false;

        // Check if employee is on approved or pending leave today
        const leaveStatus = (leaveRecord?.status || '').toString().toUpperCase();
        const dailyStatus = (dailyRecord?.status || '').toString().toUpperCase();
        const isOnLeave = Boolean(
          (leaveRecord && (leaveStatus === 'APPROVED' || leaveStatus === 'PENDING')) ||
          (dailyRecord && (dailyStatus === 'ON_LEAVE' || dailyStatus === 'LEAVE'))
        );

        // Check if employee has clocked out today
        const isClockedOutToday = Boolean(
          (dailyRecord && dailyRecord.last_check_out) ||
          (isPunchToday && latestPunch && String(latestPunch.punch_type || '').toUpperCase().includes('OUT'))
        );

        // Historical fallback coordinates (strictly for profile inspection when offline, never plotted on fleet radar)
        const lastKnownLat = latestPunch?.latitude != null
          ? Number(latestPunch.latitude)
          : (livePing?.latitude != null ? Number(livePing.latitude) : undefined);
        const lastKnownLng = latestPunch?.longitude != null
          ? Number(latestPunch.longitude)
          : (livePing?.longitude != null ? Number(livePing.longitude) : undefined);

        // =====================================================================
        // CASE 1: EMPLOYEE IS ON LEAVE TODAY
        // Compliance & privacy rule: Never track or display radar pins for staff on leave!
        // =====================================================================
        if (isOnLeave) {
          return {
            id: `emp-leave-${emp.id}`,
            organization_id: orgId,
            employee_id: emp.id,
            employee_name: empName,
            employee_code: emp.employee_code,
            avatar_url: avatarUrl,
            gender: emp.gender,
            department_name: deptName,
            latitude: 0,
            longitude: 0,
            accuracy: 0,
            speed: 0,
            battery_level: undefined,
            is_charging: false,
            is_moving: false,
            has_live_ping: false,
            is_on_leave: true,
            leave_reason: leaveRecord?.reason || 'On Leave Today',
            last_known_latitude: lastKnownLat,
            last_known_longitude: lastKnownLng,
            status: 'on_leave',
            cumulative_distance_meters: 0,
            last_pinged_at: undefined,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          };
        }

        // =====================================================================
        // CASE 2: EMPLOYEE HAS NOT PUNCHED OR PINGED GPS TODAY (OFFLINE / AWAITING SHIFT)
        // Privacy rule: Do NOT plot stale historical coordinates from past weeks on fleet radar!
        // =====================================================================
        if (!isPunchToday && !isPingToday) {
          return {
            id: `emp-offline-${emp.id}`,
            organization_id: orgId,
            employee_id: emp.id,
            employee_name: empName,
            employee_code: emp.employee_code,
            avatar_url: avatarUrl,
            gender: emp.gender,
            department_name: deptName,
            latitude: 0,
            longitude: 0,
            accuracy: 0,
            speed: 0,
            battery_level: undefined,
            is_charging: false,
            is_moving: false,
            has_live_ping: false,
            is_on_leave: false,
            last_known_latitude: lastKnownLat,
            last_known_longitude: lastKnownLng,
            status: 'offline',
            cumulative_distance_meters: 0,
            last_pinged_at: punchTime > 0 ? new Date(punchTime).toISOString() : (pingTime > 0 ? new Date(pingTime).toISOString() : undefined),
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          };
        }

        // =====================================================================
        // CASE 3: EMPLOYEE HAS CLOCKED OUT TODAY
        // Shift has ended: tracking terminates
        // =====================================================================
        if (isClockedOutToday) {
          return {
            id: latestPunch?.id || `clockout-${emp.id}`,
            organization_id: orgId,
            employee_id: emp.id,
            employee_name: empName,
            employee_code: emp.employee_code,
            avatar_url: avatarUrl,
            gender: emp.gender,
            department_name: deptName,
            latitude: 0,
            longitude: 0,
            accuracy: 0,
            speed: 0,
            battery_level: livePing?.battery_level != null ? Number(livePing.battery_level) : undefined,
            is_charging: Boolean(livePing?.is_charging),
            is_moving: false,
            has_live_ping: false,
            is_on_leave: false,
            last_known_latitude: lastKnownLat,
            last_known_longitude: lastKnownLng,
            status: 'clocked_out',
            cumulative_distance_meters: Number(livePing?.cumulative_distance_meters) || 0,
            last_pinged_at: dailyRecord?.last_check_out || (punchTime > 0 ? new Date(punchTime).toISOString() : now.toISOString()),
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          };
        }

        // =====================================================================
        // CASE 4: ACTIVE SHIFT WITH TODAY'S AUTHORITATIVE GPS FIX
        // Compare today's latest punch vs today's live telemetry ping
        // A signal is genuinely LIVE only if received within the last 20 minutes!
        // =====================================================================
        const shouldUsePunch = isPunchToday && latestPunch?.latitude && latestPunch?.longitude && (punchTime >= pingTime || !isPingToday || !livePing?.latitude);

        if (shouldUsePunch) {
          const punchDiffMinutes = (now.getTime() - punchTime) / (1000 * 60);
          const isGenuinelyLive = punchDiffMinutes <= 20;

          return {
            id: latestPunch.id || `punch-loc-${emp.id}`,
            organization_id: orgId,
            employee_id: emp.id,
            employee_name: empName,
            employee_code: emp.employee_code,
            avatar_url: avatarUrl,
            gender: emp.gender,
            department_name: deptName,
            latitude: Number(latestPunch.latitude),
            longitude: Number(latestPunch.longitude),
            accuracy: Number(latestPunch.accuracy_meters) || 10,
            speed: 0,
            battery_level: livePing?.battery_level != null ? Number(livePing.battery_level) : undefined,
            is_charging: Boolean(livePing?.is_charging),
            is_moving: false,
            has_live_ping: isGenuinelyLive,
            is_stale: !isGenuinelyLive,
            minutes_since_ping: Math.round(punchDiffMinutes),
            is_on_leave: false,
            last_known_latitude: Number(latestPunch.latitude),
            last_known_longitude: Number(latestPunch.longitude),
            status: isGenuinelyLive ? 'on_duty' : 'idle',
            cumulative_distance_meters: Number(livePing?.cumulative_distance_meters) || 0,
            last_pinged_at: new Date(punchTime).toISOString(),
            created_at: latestPunch.created_at || now.toISOString(),
            updated_at: now.toISOString(),
          };
        }

        const isGooglePlexEmulator = (lat: number, lng: number) =>
          lat >= 37.41 && lat <= 37.43 && lng >= -122.09 && lng <= -122.07;

        if (isPingToday && livePing && livePing.latitude && livePing.longitude) {
          const pingLat = Number(livePing.latitude);
          const pingLng = Number(livePing.longitude);

          if (isGooglePlexEmulator(pingLat, pingLng)) {
            // Reject default Android emulator Googleplex coordinates from fleet radar
            return {
              id: `emp-offline-${emp.id}`,
              organization_id: orgId,
              employee_id: emp.id,
              employee_name: empName,
              employee_code: emp.employee_code,
              avatar_url: avatarUrl,
              gender: emp.gender,
              department_name: deptName,
              latitude: 0,
              longitude: 0,
              accuracy: 0,
              speed: 0,
              battery_level: livePing?.battery_level != null ? Number(livePing.battery_level) : undefined,
              is_charging: Boolean(livePing?.is_charging),
              is_moving: false,
              has_live_ping: false,
              is_on_leave: false,
              last_known_latitude: lastKnownLat,
              last_known_longitude: lastKnownLng,
              status: 'offline',
              cumulative_distance_meters: 0,
              last_pinged_at: livePing.last_pinged_at || now.toISOString(),
              created_at: now.toISOString(),
              updated_at: now.toISOString(),
            };
          }

          const pingDiffMinutes = (now.getTime() - pingTime) / (1000 * 60);
          const isGenuinelyLive = pingDiffMinutes <= 20;
          const isMoving = Boolean(livePing.is_moving || (Number(livePing.speed) || 0) > 0.8);

          return {
            id: livePing.id,
            organization_id: livePing.organization_id || orgId,
            employee_id: emp.id,
            employee_name: empName,
            employee_code: emp.employee_code,
            avatar_url: avatarUrl,
            gender: emp.gender,
            department_name: deptName,
            latitude: Number(livePing.latitude),
            longitude: Number(livePing.longitude),
            accuracy: Number(livePing.accuracy) || 10,
            speed: Number(livePing.speed) || 0,
            battery_level: livePing.battery_level != null ? Number(livePing.battery_level) : undefined,
            is_charging: Boolean(livePing.is_charging),
            is_moving: isMoving,
            has_live_ping: isGenuinelyLive,
            is_stale: !isGenuinelyLive,
            minutes_since_ping: Math.round(pingDiffMinutes),
            is_on_leave: false,
            last_known_latitude: Number(livePing.latitude),
            last_known_longitude: Number(livePing.longitude),
            status: isMoving ? 'moving' : (isGenuinelyLive ? 'on_duty' : 'idle'),
            cumulative_distance_meters: Number(livePing.cumulative_distance_meters) || 0,
            last_pinged_at: livePing.last_pinged_at || now.toISOString(),
            created_at: livePing.created_at || now.toISOString(),
            updated_at: livePing.updated_at || now.toISOString(),
          };
        }

        // Fallback default
        return {
          id: `emp-offline-${emp.id}`,
          organization_id: orgId,
          employee_id: emp.id,
          employee_name: empName,
          employee_code: emp.employee_code,
          avatar_url: avatarUrl,
          gender: emp.gender,
          department_name: deptName,
          latitude: 0,
          longitude: 0,
          accuracy: 0,
          speed: 0,
          battery_level: undefined,
          is_charging: false,
          is_moving: false,
          has_live_ping: false,
          is_on_leave: false,
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
   * Fetches chronological shift breadcrumb trail for an employee.
   * Merges telemetry trails with authoritative GPS punch waypoints.
   * Supports calendar date filtering for historical travel playback.
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

      const [trailRes, punchRes] = await Promise.all([
        supabase
          .from('employee_location_trails')
          .select('*')
          .eq('organization_id', orgId)
          .eq('employee_id', employeeId)
          .gte('recorded_at', dayStart.toISOString())
          .lte('recorded_at', dayEnd.toISOString())
          .order('recorded_at', { ascending: true })
          .limit(limit),
        supabase
          .from('attendance_punches')
          .select('id, organization_id, employee_id, punch_time, punch_type, latitude, longitude, accuracy_meters, created_at')
          .eq('organization_id', orgId)
          .eq('employee_id', employeeId)
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString())
          .not('latitude', 'is', null)
          .order('created_at', { ascending: true }),
      ]);

      const trails = (trailRes.data || []) as EmployeeLocationTrail[];
      const punches = punchRes.data || [];

      if (punches.length > 0) {
        const punchWaypoints: EmployeeLocationTrail[] = punches.map((p: any) => ({
          id: `punch-wp-${p.id}`,
          organization_id: p.organization_id || orgId,
          employee_id: p.employee_id,
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
          accuracy: Number(p.accuracy_meters) || 10,
          speed: 0,
          displacement_meters: 0,
          cumulative_distance_meters: 0,
          recorded_at: p.punch_time || p.created_at,
          metadata: { is_punch: true, punch_type: p.punch_type }
        }));

        // Deduplicate against existing trail fixes within 15 meters
        const merged = [...trails];
        punchWaypoints.forEach((wp) => {
          const hasNearby = merged.some(
            (t) =>
              Math.abs(t.latitude - wp.latitude) < 0.00015 &&
              Math.abs(t.longitude - wp.longitude) < 0.00015
          );
          if (!hasNearby) {
            merged.push(wp);
          }
        });

        merged.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
        return merged;
      }

      return trails;
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_punches',
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

