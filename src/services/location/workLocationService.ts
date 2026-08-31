// src/services/location/workLocationService.ts
// ============================================================================
// Joy PeopleHR — Enterprise Multi-Tenant Work Location & Geofence Service
// Features: Dynamic Location Master, Employee Location Assignments, Configurable Radii,
// Haversine Spherical Distance Math, Geofence Decision Engine, Violation Tracking
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { getActiveOrgId } from '../attendance/biometricCommandService';
import { hrEventBus } from '../hrEventBus';

export type LocationType =
  | 'OFFICE'
  | 'FACTORY'
  | 'BRANCH'
  | 'WAREHOUSE'
  | 'PROJECT_SITE'
  | 'CLIENT_SITE'
  | 'REMOTE_SITE'
  | 'OTHER';

export type GeofenceStatus =
  | 'INSIDE'
  | 'OUTSIDE'
  | 'BORDERLINE'
  | 'GPS_UNAVAILABLE'
  | 'GPS_INACCURATE'
  | 'STALE_LOCATION'
  | 'MOCK_LOCATION'
  | 'UNAUTHORIZED';

export type LocationEventType =
  | 'PUNCH_CHECK_IN'
  | 'PUNCH_CHECK_OUT'
  | 'OUTSIDE_GEOFENCE'
  | 'LOW_ACCURACY'
  | 'STALE_LOCATION'
  | 'MOCK_LOCATION'
  | 'LOCATION_PERMISSION_DENIED'
  | 'UNAUTHORIZED_WORK_LOCATION'
  | 'FACE_MATCH'
  | 'FACE_MISMATCH'
  | 'LOCATION_ANOMALY';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export function isValidGeoPoint(point: GeoPoint): boolean {
  return (
    typeof point.latitude === 'number' &&
    typeof point.longitude === 'number' &&
    !isNaN(point.latitude) &&
    !isNaN(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

export interface WorkLocation {
  id: string;
  tenant_id: string;
  organization_id: string;
  name: string;
  code: string;
  location_type: LocationType;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  accuracy_requirement_meters: number;
  location_max_age_seconds: number;
  timezone: string;
  ip_ranges?: string[];
  bssid_list?: string[];
  qr_code_enabled?: boolean;
  biometric_enabled?: boolean;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface EmployeeWorkLocationAssignment {
  id: string;
  tenant_id: string;
  organization_id: string;
  employee_id: string;
  work_location_id: string;
  is_primary: boolean;
  attendance_allowed: boolean;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendanceLocationEvent {
  id: string;
  tenant_id: string;
  organization_id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  work_location_id?: string;
  work_location_name?: string;
  event_type: LocationEventType;
  geofence_status: GeofenceStatus;
  face_status?: 'FACE_MATCH' | 'FACE_MISMATCH' | 'FACE_NOT_AVAILABLE' | 'FACE_VERIFICATION_REQUIRED';
  latitude: number;
  longitude: number;
  accuracy_meters: number;
  distance_meters: number;
  device_timestamp: string;
  server_timestamp: string;
  source: 'MOBILE_GPS' | 'MOBILE_GPS_FACE' | 'BIOMETRIC' | 'WEB' | 'MANUAL';
  device_info?: any;
  metadata?: any;
  created_at: string;
}

const STORAGE_KEY_LOCATIONS = 'workforceos_work_locations_v2';
const STORAGE_KEY_ASSIGNMENTS = 'workforceos_emp_work_locations_v2';
const STORAGE_KEY_EVENTS = 'workforceos_location_events_v2';

const SEED_WORK_LOCATIONS: WorkLocation[] = [];

class WorkLocationService {
  private getStorageKey(base: string, tenantId = getActiveOrgId()): string {
    return `${base}_${tenantId}`;
  }

  private loadStore<T>(baseKey: string, fallback: T, tenantId = getActiveOrgId()): T {
    try {
      const key = this.getStorageKey(baseKey, tenantId);
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === 0 && Array.isArray(fallback) && fallback.length > 0) {
          return fallback;
        }
        return parsed;
      }
      return fallback;
    } catch {
      return fallback;
    }
  }

  private saveStore<T>(baseKey: string, data: T, tenantId = getActiveOrgId()): void {
    try {
      const key = this.getStorageKey(baseKey, tenantId);
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  }

  // ==========================================================================
  // 1. WORK LOCATIONS MASTER (CRUD)
  // ==========================================================================

  getLocations(tenantId = getActiveOrgId(), onlyActive = true): WorkLocation[] {
    const list = this.loadStore<WorkLocation[]>(STORAGE_KEY_LOCATIONS, SEED_WORK_LOCATIONS, tenantId);
    return onlyActive ? list.filter((l) => l.is_active) : list;
  }

  async fetchLocationsFromDb(tenantId = getActiveOrgId()): Promise<WorkLocation[]> {
    if (!isSupabaseEnabled) {
      return this.getLocations(tenantId, false);
    }
    try {
      // 1. Fetch work_locations from DB
      const { data, error } = await supabase
        .from('work_locations')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data !== null && data.length > 0) {
        const locations: WorkLocation[] = data.map((d: any) => ({
          id: d.id,
          tenant_id: d.tenant_id || tenantId,
          organization_id: d.organization_id || tenantId,
          name: d.name,
          code: d.code,
          location_type: d.location_type || 'OFFICE',
          address: d.address || '',
          city: d.city,
          state: d.state,
          country: d.country,
          postal_code: d.postal_code,
          latitude: Number(d.latitude),
          longitude: Number(d.longitude),
          geofence_radius_meters: Number(d.geofence_radius_meters) || 100,
          accuracy_requirement_meters: Number(d.accuracy_requirement_meters || 50),
          location_max_age_seconds: Number(d.location_max_age_seconds || 60),
          timezone: d.timezone || 'Asia/Kolkata',
          ip_ranges: Array.isArray(d.ip_ranges) ? d.ip_ranges : [],
          bssid_list: Array.isArray(d.bssid_list) ? d.bssid_list : [],
          qr_code_enabled: Boolean(d.qr_code_enabled),
          biometric_enabled: Boolean(d.biometric_enabled),
          is_active: Boolean(d.is_active),
          version: d.version || 1,
          created_at: d.created_at || new Date().toISOString(),
          updated_at: d.updated_at || new Date().toISOString(),
        }));
        this.saveStore(STORAGE_KEY_LOCATIONS, locations, tenantId);
        return locations;
      }

      // 2. If table empty, also check branches table to bridge existing branches automatically
      const { data: branchData } = await supabase.from('branches').select('*');
      if (branchData && branchData.length > 0) {
        const bridgedLocs: WorkLocation[] = branchData.map((b: any, idx: number) => ({
          id: `loc-${b.code?.toLowerCase() || b.id}`,
          tenant_id: tenantId,
          organization_id: tenantId,
          name: b.name,
          code: b.code || `LOC-${idx + 1}`,
          location_type: (b.branch_type as LocationType) || 'OFFICE',
          address: b.address || `${b.city || 'Coimbatore'}, ${b.state || 'TN'}`,
          city: b.city || 'Coimbatore',
          state: b.state || 'Tamil Nadu',
          country: b.country || 'India',
          postal_code: b.postal_code || '641014',
          latitude: b.latitude ? Number(b.latitude) : 11.0844364 + idx * 0.04,
          longitude: b.longitude ? Number(b.longitude) : 77.1262627 + idx * 0.03,
          geofence_radius_meters: 100,
          accuracy_requirement_meters: 50,
          location_max_age_seconds: 60,
          timezone: b.timezone || 'Asia/Kolkata',
          ip_ranges: [],
          bssid_list: [],
          qr_code_enabled: true,
          biometric_enabled: true,
          is_active: true,
          version: 1,
          created_at: b.created_at || new Date().toISOString(),
          updated_at: b.updated_at || new Date().toISOString(),
        }));
        this.saveStore(STORAGE_KEY_LOCATIONS, bridgedLocs, tenantId);
        return bridgedLocs;
      }
    } catch (err) {
      console.warn('[Supabase WorkLocation] fetchLocationsFromDb fallback:', err);
    }
    return this.getLocations(tenantId, false);
  }

  getLocationById(id: string, tenantId = getActiveOrgId()): WorkLocation | null {
    const list = this.getLocations(tenantId, false);
    return list.find((l) => l.id === id) || null;
  }

  saveLocation(location: Partial<WorkLocation>, tenantId = getActiveOrgId()): WorkLocation {
    // Validate coordinates
    if (location.latitude !== undefined && location.longitude !== undefined) {
      if (!isValidGeoPoint({ latitude: location.latitude, longitude: location.longitude })) {
        throw new Error(`Invalid geographic coordinates: (${location.latitude}, ${location.longitude}). Latitude must be between -90 and 90, Longitude between -180 and 180.`);
      }
    }

    const list = this.getLocations(tenantId, false);
    const now = new Date().toISOString();

    if (location.id) {
      const idx = list.findIndex((l) => l.id === location.id);
      if (idx >= 0) {
        const updated: WorkLocation = {
          ...list[idx],
          ...location,
          version: (list[idx].version || 1) + 1,
          updated_at: now,
        };
        list[idx] = updated;
        this.saveStore(STORAGE_KEY_LOCATIONS, list, tenantId);

        if (isSupabaseEnabled) {
          Promise.resolve(
            supabase.from('work_locations').upsert({
              id: updated.id,
              tenant_id: tenantId,
              organization_id: tenantId,
              name: updated.name,
              code: updated.code,
              location_type: updated.location_type,
              address: updated.address,
              city: updated.city,
              state: updated.state,
              country: updated.country,
              postal_code: updated.postal_code,
              latitude: updated.latitude,
              longitude: updated.longitude,
              geofence_radius_meters: updated.geofence_radius_meters,
              accuracy_requirement_meters: updated.accuracy_requirement_meters,
              location_max_age_seconds: updated.location_max_age_seconds,
              timezone: updated.timezone,
              is_active: updated.is_active,
              version: updated.version,
              updated_at: now,
            })
          ).catch((e: any) => console.warn('[Supabase WorkLocation] update failed:', e));
        }

        hrEventBus.publish('location.updated', updated);
        return updated;
      }
    }

    // Create New Location
    const created: WorkLocation = {
      id: location.id || `loc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      tenant_id: tenantId,
      organization_id: tenantId,
      name: location.name || 'New Work Location',
      code: location.code || `LOC-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      location_type: location.location_type || 'OFFICE',
      address: location.address || '',
      city: location.city || '',
      state: location.state || '',
      country: location.country || 'India',
      postal_code: location.postal_code || '',
      latitude: location.latitude ?? 11.0844364,
      longitude: location.longitude ?? 77.1262627,
      geofence_radius_meters: location.geofence_radius_meters ?? 100.00,
      accuracy_requirement_meters: location.accuracy_requirement_meters ?? 50.00,
      location_max_age_seconds: location.location_max_age_seconds ?? 60,
      timezone: location.timezone || 'Asia/Kolkata',
      is_active: location.is_active ?? true,
      version: 1,
      created_at: now,
      updated_at: now,
    };

    list.push(created);
    this.saveStore(STORAGE_KEY_LOCATIONS, list, tenantId);

    if (isSupabaseEnabled) {
      Promise.resolve(
        supabase.from('work_locations').upsert({
          id: created.id,
          tenant_id: tenantId,
          organization_id: tenantId,
          name: created.name,
          code: created.code,
          location_type: created.location_type,
          address: created.address,
          city: created.city,
          state: created.state,
          country: created.country,
          postal_code: created.postal_code,
          latitude: created.latitude,
          longitude: created.longitude,
          geofence_radius_meters: created.geofence_radius_meters,
          accuracy_requirement_meters: created.accuracy_requirement_meters,
          location_max_age_seconds: created.location_max_age_seconds,
          timezone: created.timezone,
          is_active: created.is_active,
          version: created.version,
          created_at: now,
          updated_at: now,
        })
      ).catch((e: any) => console.warn('[Supabase WorkLocation] insert failed:', e));
    }

    hrEventBus.publish('location.created', created);
    return created;
  }

  toggleLocationActive(id: string, active: boolean, tenantId = getActiveOrgId()): boolean {
    const list = this.getLocations(tenantId, false);
    const item = list.find((l) => l.id === id);
    if (!item) return false;
    item.is_active = active;
    item.updated_at = new Date().toISOString();
    this.saveStore(STORAGE_KEY_LOCATIONS, list, tenantId);

    if (isSupabaseEnabled) {
      Promise.resolve(
        supabase.from('work_locations').update({ is_active: active, updated_at: item.updated_at }).eq('id', id)
      ).catch((e: any) => console.warn('[Supabase WorkLocation] toggleActive failed:', e));
    }

    hrEventBus.publish('location.updated', item);
    return true;
  }

  deleteLocation(id: string, tenantId = getActiveOrgId()): boolean {
    let list = this.getLocations(tenantId, false);
    const initialLen = list.length;
    list = list.filter((l) => l.id !== id);
    if (list.length !== initialLen) {
      this.saveStore(STORAGE_KEY_LOCATIONS, list, tenantId);

      if (isSupabaseEnabled) {
        Promise.resolve(supabase.from('work_locations').delete().eq('id', id)).catch((e: any) =>
          console.warn('[Supabase WorkLocation] delete failed:', e)
        );
      }

      hrEventBus.publish('location.deleted', { id });
      return true;
    }
    return false;
  }

  // ==========================================================================
  // 2. EMPLOYEE LOCATION ASSIGNMENTS
  // ==========================================================================

  async fetchAssignmentsFromDb(tenantId = getActiveOrgId()): Promise<EmployeeWorkLocationAssignment[]> {
    if (!isSupabaseEnabled) {
      return this.getAllAssignments(tenantId);
    }
    try {
      const { data, error } = await supabase
        .from('employee_work_locations')
        .select('*')
        .eq('is_active', true);

      if (!error && data !== null) {
        const assignments: EmployeeWorkLocationAssignment[] = data.map((d: any) => ({
          id: d.id,
          tenant_id: d.tenant_id || tenantId,
          organization_id: d.organization_id || tenantId,
          employee_id: d.employee_id,
          work_location_id: d.work_location_id,
          is_primary: d.is_primary ?? true,
          attendance_allowed: d.attendance_allowed ?? true,
          effective_from: d.effective_from || new Date().toISOString().split('T')[0],
          is_active: d.is_active ?? true,
          created_at: d.created_at || new Date().toISOString(),
          updated_at: d.updated_at || new Date().toISOString(),
        }));
        this.saveStore(STORAGE_KEY_ASSIGNMENTS, assignments, tenantId);
        return assignments;
      }
    } catch (err) {
      console.warn('[Supabase WorkLocation] fetchAssignmentsFromDb fallback:', err);
    }
    return this.getAllAssignments(tenantId);
  }

  getEmployeeAuthorizedLocations(employeeId: string, tenantId = getActiveOrgId()): WorkLocation[] {
    const allLocations = this.getLocations(tenantId, true);
    const assignments = this.loadStore<EmployeeWorkLocationAssignment[]>(STORAGE_KEY_ASSIGNMENTS, [], tenantId);
    const empAssignments = assignments.filter((a) => (a.employee_id === employeeId || a.employee_id === String(employeeId)) && a.is_active && a.attendance_allowed);

    if (empAssignments.length === 0) {
      // Default fallback: allow tenant primary locations if no restrictive assignment is made
      return allLocations;
    }

    const assignedIds = new Set(empAssignments.map((a) => a.work_location_id));
    return allLocations.filter((l) => assignedIds.has(l.id));
  }

  async setEmployeeLocations(
    employeeId: string,
    locationIds: string[],
    primaryLocationId?: string,
    tenantId = getActiveOrgId(),
    employeeCode?: string
  ): Promise<void> {
    let assignments = this.loadStore<EmployeeWorkLocationAssignment[]>(STORAGE_KEY_ASSIGNMENTS, [], tenantId);
    assignments = assignments.filter((a) => a.employee_id !== employeeId && (employeeCode ? a.employee_id !== employeeCode : true));
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const allLocations = this.getLocations(tenantId, false);
    const primaryLoc = allLocations.find((l) => l.id === (primaryLocationId || locationIds[0]));

    const newRows: any[] = [];
    locationIds.forEach((locId, idx) => {
      const isPrim = primaryLocationId ? primaryLocationId === locId : idx === 0;
      const row: EmployeeWorkLocationAssignment = {
        id: `assign-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        tenant_id: tenantId,
        organization_id: tenantId,
        employee_id: employeeId,
        work_location_id: locId,
        is_primary: isPrim,
        attendance_allowed: true,
        effective_from: today,
        is_active: true,
        created_at: now,
        updated_at: now,
      };
      assignments.push(row);
      newRows.push({
        tenant_id: tenantId,
        organization_id: tenantId,
        employee_id: employeeId,
        work_location_id: locId,
        is_primary: isPrim,
        attendance_allowed: true,
        effective_from: today,
        is_active: true,
      });

      // If employeeCode is provided and distinct from employeeId, also create assignment record
      if (employeeCode && employeeCode !== employeeId) {
        newRows.push({
          tenant_id: tenantId,
          organization_id: tenantId,
          employee_id: employeeCode,
          work_location_id: locId,
          is_primary: isPrim,
          attendance_allowed: true,
          effective_from: today,
          is_active: true,
        });
      }
    });

    this.saveStore(STORAGE_KEY_ASSIGNMENTS, assignments, tenantId);

    if (isSupabaseEnabled) {
      try {
        // 1. Delete prior mappings for employee
        await supabase
          .from('employee_work_locations')
          .delete()
          .in('employee_id', employeeCode ? [employeeId, employeeCode] : [employeeId]);

        // 2. Insert new mappings
        if (newRows.length > 0) {
          await supabase.from('employee_work_locations').insert(newRows);
        }

        // 3. Update employee record location name & branch to primary work location
        if (primaryLoc) {
          await supabase.from('employees').update({
            branch_name: primaryLoc.name,
            location_name: primaryLoc.name,
          }).or(`id.eq.${employeeId},employee_code.eq.${employeeCode || employeeId}`);
        }

        // 4. Publish real-time outbox event
        await supabase.from('realtime_outbox').insert({
          tenant_id: tenantId,
          organization_id: tenantId,
          entity_type: 'employee_work_locations',
          entity_id: employeeId,
          event_type: 'location.assignment_updated',
          actor_id: 'admin',
          payload: { employeeId, employeeCode, locationIds, primaryLocationId, primaryLocation: primaryLoc },
        });
      } catch (e: any) {
        console.warn('[Supabase EmployeeWorkLocation] sync notice:', e);
      }
    }

    hrEventBus.publish('location.assignment_updated', { employeeId, locationIds });
  }

  getEmployeeAssignments(employeeId: string, tenantId = getActiveOrgId()): EmployeeWorkLocationAssignment[] {
    const assignments = this.loadStore<EmployeeWorkLocationAssignment[]>(STORAGE_KEY_ASSIGNMENTS, [], tenantId);
    return assignments.filter((a) => (a.employee_id === employeeId || a.employee_id === String(employeeId)) && a.is_active);
  }

  getAllAssignments(tenantId = getActiveOrgId()): EmployeeWorkLocationAssignment[] {
    return this.loadStore<EmployeeWorkLocationAssignment[]>(STORAGE_KEY_ASSIGNMENTS, [], tenantId);
  }

  // ==========================================================================
  // 3. HAVERSINE DISTANCE & GEOFENCE EVALUATION MATH
  // ==========================================================================

  /**
   * Precise Spherical Haversine Distance Formula (returns distance in meters)
   */
  calculateDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's mean radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  /**
   * Evaluates geofence status for given coordinates against target location
   */
  evaluateGeofence(
    userLat: number,
    userLon: number,
    accuracyMeters: number,
    location: WorkLocation,
    mockLocationDetected = false
  ): {
    distanceMeters: number;
    radiusMeters: number;
    accuracyMeters: number;
    geofenceStatus: GeofenceStatus;
    isInside: boolean;
    isAccurate: boolean;
    reason?: string;
  } {
    if (mockLocationDetected) {
      return {
        distanceMeters: 0,
        radiusMeters: location.geofence_radius_meters,
        accuracyMeters,
        geofenceStatus: 'MOCK_LOCATION',
        isInside: false,
        isAccurate: false,
        reason: 'Mock location / simulated GPS provider detected on client device.',
      };
    }

    const distanceMeters = this.calculateDistanceInMeters(userLat, userLon, location.latitude, location.longitude);
    const radiusMeters = location.geofence_radius_meters;
    const isAccurate = accuracyMeters <= location.accuracy_requirement_meters;

    if (!isAccurate) {
      return {
        distanceMeters,
        radiusMeters,
        accuracyMeters,
        geofenceStatus: 'GPS_INACCURATE',
        isInside: false,
        isAccurate: false,
        reason: `GPS accuracy (±${accuracyMeters}m) is lower than required threshold (≤${location.accuracy_requirement_meters}m).`,
      };
    }

    // Borderline evaluation: within 10% of perimeter with loose accuracy
    const isInside = distanceMeters <= radiusMeters;
    const isBorderline = Math.abs(distanceMeters - radiusMeters) < 15 && accuracyMeters > 25;

    let geofenceStatus: GeofenceStatus = isInside ? 'INSIDE' : 'OUTSIDE';
    if (isBorderline) geofenceStatus = 'BORDERLINE';

    return {
      distanceMeters,
      radiusMeters,
      accuracyMeters,
      geofenceStatus,
      isInside,
      isAccurate,
      reason: isInside
        ? `Within ${location.name} geofence zone (${distanceMeters}m from center; radius: ${radiusMeters}m).`
        : `Outside ${location.name} geofence zone (${distanceMeters}m away; allowed radius: ${radiusMeters}m).`,
    };
  }

  // ==========================================================================
  // 4. ATTENDANCE LOCATION EVENTS & VIOLATIONS LOG
  // ==========================================================================

  recordLocationEvent(event: Partial<AttendanceLocationEvent>, tenantId = getActiveOrgId()): AttendanceLocationEvent {
    const events = this.loadStore<AttendanceLocationEvent[]>(STORAGE_KEY_EVENTS, [], tenantId);
    const now = new Date().toISOString();

    const created: AttendanceLocationEvent = {
      id: event.id || `locevt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      tenant_id: tenantId,
      organization_id: tenantId,
      employee_id: event.employee_id || 'unknown',
      employee_name: event.employee_name || 'Employee',
      employee_code: event.employee_code || 'WF-EMP',
      work_location_id: event.work_location_id,
      work_location_name: event.work_location_name,
      event_type: event.event_type || 'PUNCH_CHECK_IN',
      geofence_status: event.geofence_status || 'INSIDE',
      face_status: event.face_status || 'FACE_NOT_AVAILABLE',
      latitude: event.latitude || 0,
      longitude: event.longitude || 0,
      accuracy_meters: event.accuracy_meters || 0,
      distance_meters: event.distance_meters || 0,
      device_timestamp: event.device_timestamp || now,
      server_timestamp: now,
      source: event.source || 'MOBILE_GPS',
      device_info: event.device_info || {},
      metadata: event.metadata || {},
      created_at: now,
    };

    events.unshift(created);
    this.saveStore(STORAGE_KEY_EVENTS, events.slice(0, 1000), tenantId); // Keep latest 1000 events
    hrEventBus.publish('location.event_created', created);
    return created;
  }

  getLocationEvents(tenantId = getActiveOrgId()): AttendanceLocationEvent[] {
    return this.loadStore<AttendanceLocationEvent[]>(STORAGE_KEY_EVENTS, [], tenantId);
  }

  getViolationsCount(tenantId = getActiveOrgId(), dateStr?: string): number {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const events = this.getLocationEvents(tenantId);
    return events.filter(
      (e) =>
        e.created_at.startsWith(targetDate) &&
        (e.event_type === 'OUTSIDE_GEOFENCE' ||
          e.event_type === 'LOW_ACCURACY' ||
          e.event_type === 'MOCK_LOCATION' ||
          e.event_type === 'UNAUTHORIZED_WORK_LOCATION' ||
          e.geofence_status === 'OUTSIDE' ||
          e.geofence_status === 'MOCK_LOCATION')
    ).length;
  }

  getFaceMismatchesCount(tenantId = getActiveOrgId(), dateStr?: string): number {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const events = this.getLocationEvents(tenantId);
    return events.filter(
      (e) =>
        e.created_at.startsWith(targetDate) &&
        (e.event_type === 'FACE_MISMATCH' || e.face_status === 'FACE_MISMATCH')
    ).length;
  }
}

/**
 * Parses Google Maps links, Place URLs, DMS coordinates, Plus codes, or raw Lat/Lon inputs.
 */
export function parseGoogleMapsInput(input: string): {
  latitude?: number;
  longitude?: number;
  name?: string;
  address?: string;
} | null {
  if (!input || typeof input !== 'string') return null;
  const raw = input.trim();

  // 1. Check known shortlink for Joy Corporate Solutions
  if (raw.includes('cyya5UiZ1Brnbirz5') || raw.toLowerCase().includes('joy corporate solutions')) {
    return {
      latitude: 11.0844364,
      longitude: 77.1262627,
      name: 'Joy Corporate Solutions Private Limited',
      address: 'D.No: 2 31 A9, Annur Road, Thennampalayam, Sulur, Arasur, Coimbatore, Tamil Nadu 641407',
    };
  }

  // 2. Google Maps exact place pin: !3d(lat)!4d(lon)
  const pinMatch = raw.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (pinMatch) {
    let placeName: string | undefined;
    const placeMatch = raw.match(/place\/([^/@]+)/);
    if (placeMatch) {
      placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    }
    return {
      latitude: Number(parseFloat(pinMatch[1]).toFixed(7)),
      longitude: Number(parseFloat(pinMatch[2]).toFixed(7)),
      name: placeName,
    };
  }

  // 3. Google Maps URL containing /@lat,lon,
  const atMatch = raw.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    let placeName: string | undefined;
    const placeMatch = raw.match(/place\/([^/@]+)/);
    if (placeMatch) {
      placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    }
    return {
      latitude: Number(parseFloat(atMatch[1]).toFixed(7)),
      longitude: Number(parseFloat(atMatch[2]).toFixed(7)),
      name: placeName,
    };
  }

  // 4. Google Maps query parameter ?q=lat,lon or ?ll=lat,lon
  const qMatch = raw.match(/[?&](?:q|ll)=(-?\d+\.\d+)[,%20]+(-?\d+\.\d+)/i);
  if (qMatch) {
    return {
      latitude: Number(parseFloat(qMatch[1]).toFixed(7)),
      longitude: Number(parseFloat(qMatch[2]).toFixed(7)),
    };
  }

  // 5. DMS format (Degrees Minutes Seconds, e.g. 11°05'05.0"N 77°07'34.0"E or 11°5'5"N 77°7'34"E)
  const dmsMatch = raw.match(/(\d+)°\s*(\d+)'\s*([\d.]+)"?\s*([NSns])\s*[, ]+\s*(\d+)°\s*(\d+)'\s*([\d.]+)"?\s*([EWew])/);
  if (dmsMatch) {
    const latDeg = parseFloat(dmsMatch[1]);
    const latMin = parseFloat(dmsMatch[2]);
    const latSec = parseFloat(dmsMatch[3]);
    const latHem = dmsMatch[4].toUpperCase();

    const lonDeg = parseFloat(dmsMatch[5]);
    const lonMin = parseFloat(dmsMatch[6]);
    const lonSec = parseFloat(dmsMatch[7]);
    const lonHem = dmsMatch[8].toUpperCase();

    let lat = latDeg + latMin / 60 + latSec / 3600;
    if (latHem === 'S') lat = -lat;

    let lon = lonDeg + lonMin / 60 + lonSec / 3600;
    if (lonHem === 'W') lon = -lon;

    return {
      latitude: Number(lat.toFixed(7)),
      longitude: Number(lon.toFixed(7)),
    };
  }

  // 6. Raw Decimal Coordinates (e.g. "11.0844364, 77.1262627" or "11.0844364 77.1262627")
  const coordMatch = raw.match(/^(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)$/);
  if (coordMatch) {
    return {
      latitude: Number(parseFloat(coordMatch[1]).toFixed(7)),
      longitude: Number(parseFloat(coordMatch[2]).toFixed(7)),
    };
  }

  return null;
}

export const workLocationService = new WorkLocationService();

