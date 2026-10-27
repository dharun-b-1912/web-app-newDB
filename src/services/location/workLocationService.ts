// src/services/location/workLocationService.ts
// ============================================================================
// Joy PeopleHR — Enterprise Multi-Tenant Work Location & Geofence Service
// Canonical Supabase Project: ysiajemrqakfngasehhi
// PostgreSQL Table: public.work_locations (id, organization_id, branch_id, name, address_line1, latitude, longitude, geofence_radius_meters, is_geofencing_enabled, is_active)
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { getActiveOrgId } from '../attendance/biometricCommandService';
import { hrEventBus } from '../hrEventBus';
import { ensureUUID, isValidUUID } from '../api';

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
  branch_id?: string;
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

export type LocationVerificationStatus =
  | 'ASSIGNED_LOCATION'
  | 'MAIN_OFFICE'
  | 'REGISTERED_BRANCH'
  | 'DIFFERENT_LOCATION'
  | 'GPS_UNAVAILABLE';

export interface LocationVerificationResult {
  verificationStatus: LocationVerificationStatus;
  matchedLocation?: WorkLocation;
  matchedLocationName?: string;
  matchedDistanceMeters?: number;
  isAllowedWithoutReason: boolean;
  requiresReason: boolean;
  reasonPromptTitle?: string;
  summaryMessage: string;
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
  verification_status?: LocationVerificationStatus;
  location_reason?: string;
  detected_address?: string;
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

const STORAGE_KEY_LOCATIONS = 'work_locations';
const STORAGE_KEY_ASSIGNMENTS = 'emp_work_locations';
const STORAGE_KEY_EVENTS = 'location_events';
const SEED_WORK_LOCATIONS: WorkLocation[] = [];

class WorkLocationService {
  private inMemoryLocations = new Map<string, WorkLocation[]>();
  private inMemoryAssignments = new Map<string, any[]>();
  private inMemoryEvents = new Map<string, AttendanceLocationEvent[]>();

  private loadStore<T>(baseKey: string, fallback: T, tenantId = getActiveOrgId()): T {
    if (baseKey === STORAGE_KEY_LOCATIONS) {
      const data = this.inMemoryLocations.get(tenantId || 'global');
      return (data ? (data as unknown as T) : fallback);
    }
    if (baseKey === STORAGE_KEY_ASSIGNMENTS) {
      const data = this.inMemoryAssignments.get(tenantId || 'global');
      return (data ? (data as unknown as T) : fallback);
    }
    const data = this.inMemoryEvents.get(tenantId || 'global');
    return (data ? (data as unknown as T) : fallback);
  }

  private saveStore<T>(baseKey: string, data: T, tenantId = getActiveOrgId()): void {
    if (baseKey === STORAGE_KEY_LOCATIONS) {
      this.inMemoryLocations.set(tenantId || 'global', data as unknown as WorkLocation[]);
    } else if (baseKey === STORAGE_KEY_ASSIGNMENTS) {
      this.inMemoryAssignments.set(tenantId || 'global', data as unknown as any[]);
    } else {
      this.inMemoryEvents.set(tenantId || 'global', data as unknown as AttendanceLocationEvent[]);
    }
  }

  /**
   * Resolves canonical active organization ID from auth session or context.
   */
  public async resolveActiveOrgId(overrideOrgId?: string): Promise<string> {
    if (overrideOrgId && isValidUUID(overrideOrgId)) {
      return overrideOrgId;
    }

    const contextOrg = getActiveOrgId();
    if (contextOrg && isValidUUID(contextOrg)) {
      return contextOrg;
    }

    if (isSupabaseEnabled) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const authUser = sessionData?.session?.user;
        if (authUser) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('organization_id')
            .eq('auth_user_id', authUser.id)
            .maybeSingle();

          if (profile?.organization_id && isValidUUID(profile.organization_id)) {
            return profile.organization_id;
          }
        }
      } catch (err) {
        console.warn('[WorkLocationService] Org resolution error:', err);
      }
    }

    return '0c621892-e938-4707-9957-13534ea32c19'; // Canonical Joy Corporate Solutions Org ID fallback
  }

  /**
   * Resolves a valid branch ID for the given organization.
   */
  public async resolveBranchId(orgId: string, overrideBranchId?: string): Promise<string> {
    if (overrideBranchId && isValidUUID(overrideBranchId)) {
      return overrideBranchId;
    }

    if (isSupabaseEnabled) {
      try {
        const { data: branches, error } = await supabase
          .from('branches')
          .select('id')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: true })
          .limit(1);

        if (!error && branches && branches.length > 0) {
          return branches[0].id;
        }
      } catch (err) {
        console.warn('[WorkLocationService] Branch resolution error:', err);
      }
    }

    return '';
  }

  // ==========================================================================
  // 1. WORK LOCATIONS MASTER (CRUD)
  // ==========================================================================

  getLocations(tenantId = getActiveOrgId(), onlyActive = true): WorkLocation[] {
    const list = this.loadStore<WorkLocation[]>(STORAGE_KEY_LOCATIONS, SEED_WORK_LOCATIONS, tenantId);
    return onlyActive ? list.filter((l) => l.is_active) : list;
  }

  async fetchLocationsFromDb(tenantId?: string): Promise<WorkLocation[]> {
    const effectiveOrgId = await this.resolveActiveOrgId(tenantId);

    if (!isSupabaseEnabled) {
      return this.getLocations(effectiveOrgId, false);
    }

    try {
      // Fetch work_locations from DB with RLS
      const { data, error } = await supabase
        .from('work_locations')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('[Supabase WorkLocation] fetch error:', error);
        throw error;
      }

      if (data !== null) {
        const locations: WorkLocation[] = data.map((d: any) => ({
          id: d.id,
          tenant_id: d.organization_id || effectiveOrgId,
          organization_id: d.organization_id || effectiveOrgId,
          branch_id: d.branch_id,
          name: d.name,
          code: d.code || `LOC-${d.id.slice(0, 4).toUpperCase()}`,
          location_type: d.location_type || 'OFFICE',
          address: d.address_line1 || d.address || '',
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

        this.saveStore(STORAGE_KEY_LOCATIONS, locations, effectiveOrgId);
        return locations;
      }
    } catch (err) {
      console.warn('[Supabase WorkLocation] fetchLocationsFromDb fallback:', err);
    }

    return this.getLocations(effectiveOrgId, false);
  }

  getLocationById(id: string, tenantId = getActiveOrgId()): WorkLocation | null {
    const list = this.getLocations(tenantId, false);
    return list.find((l) => l.id === id) || null;
  }

  async saveLocation(location: Partial<WorkLocation>, tenantId?: string): Promise<WorkLocation> {
    // Validate coordinates
    if (location.latitude !== undefined && location.longitude !== undefined) {
      if (!isValidGeoPoint({ latitude: Number(location.latitude), longitude: Number(location.longitude) })) {
        throw new Error(`Invalid coordinates: (${location.latitude}, ${location.longitude}). Latitude must be -90 to 90, Longitude must be -180 to 180.`);
      }
    }

    if (location.geofence_radius_meters !== undefined && Number(location.geofence_radius_meters) <= 0) {
      throw new Error('Geofence radius must be a positive number greater than 0 meters.');
    }

    const effectiveOrgId = await this.resolveActiveOrgId(tenantId || location.organization_id);
    const effectiveBranchId = await this.resolveBranchId(effectiveOrgId, location.branch_id);

    const now = new Date().toISOString();
    const targetId = ensureUUID(location.id);

    const record: WorkLocation = {
      id: targetId,
      tenant_id: effectiveOrgId,
      organization_id: effectiveOrgId,
      branch_id: effectiveBranchId,
      name: (location.name || 'New Work Location').trim(),
      code: location.code || `LOC-${targetId.slice(0, 4).toUpperCase()}`,
      location_type: location.location_type || 'OFFICE',
      address: location.address || (location as any).address_line1 || location.name || 'Office Address',
      city: location.city || 'Coimbatore',
      state: location.state || 'Tamil Nadu',
      country: location.country || 'India',
      postal_code: location.postal_code || '641014',
      latitude: Number(location.latitude ?? 11.0844364),
      longitude: Number(location.longitude ?? 77.1262627),
      geofence_radius_meters: Number(location.geofence_radius_meters ?? 100),
      accuracy_requirement_meters: Number(location.accuracy_requirement_meters ?? 50),
      location_max_age_seconds: Number(location.location_max_age_seconds ?? 60),
      timezone: location.timezone || 'Asia/Kolkata',
      is_active: location.is_active ?? true,
      version: (location.version || 0) + 1,
      created_at: location.created_at || now,
      updated_at: now,
    };

    if (isSupabaseEnabled) {
      const dbPayload = {
        id: record.id,
        organization_id: effectiveOrgId,
        branch_id: effectiveBranchId,
        name: record.name,
        address_line1: record.address,
        latitude: record.latitude,
        longitude: record.longitude,
        geofence_radius_meters: record.geofence_radius_meters,
        is_geofencing_enabled: true,
        is_active: record.is_active,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from('work_locations')
        .upsert(dbPayload)
        .select()
        .single();

      if (error) {
        console.error('[Supabase WorkLocation] Persistence Error:', error);
        if (error.code === '23505') {
          throw new Error(`A work location with the name "${record.name}" already exists.`);
        }
        if (error.code === '42501') {
          throw new Error('Access denied: You do not have permission to manage work locations.');
        }
        throw new Error(error.message || 'Failed to persist work location to database.');
      }

      if (data) {
        record.id = data.id;
        record.created_at = data.created_at || record.created_at;
        record.updated_at = data.updated_at || record.updated_at;
      }
    }

    // Update local cache
    const list = this.getLocations(effectiveOrgId, false);
    const existingIndex = list.findIndex((l) => l.id === record.id);
    if (existingIndex >= 0) {
      list[existingIndex] = record;
    } else {
      list.push(record);
    }
    this.saveStore(STORAGE_KEY_LOCATIONS, list, effectiveOrgId);

    hrEventBus.publish('location.saved', record);
    return record;
  }

  async toggleLocationActive(id: string, active: boolean, tenantId?: string): Promise<boolean> {
    const effectiveOrgId = await this.resolveActiveOrgId(tenantId);
    const now = new Date().toISOString();

    if (isSupabaseEnabled) {
      const { error } = await supabase
        .from('work_locations')
        .update({ is_active: active, updated_at: now })
        .eq('id', ensureUUID(id));

      if (error) {
        console.error('[Supabase WorkLocation] toggleActive error:', error);
        throw new Error(error.message || 'Failed to update location status.');
      }
    }

    const list = this.getLocations(effectiveOrgId, false);
    const item = list.find((l) => l.id === id);
    if (item) {
      item.is_active = active;
      item.updated_at = now;
      this.saveStore(STORAGE_KEY_LOCATIONS, list, effectiveOrgId);
      hrEventBus.publish('location.updated', item);
    }
    return true;
  }

  async deleteLocation(id: string, tenantId?: string): Promise<boolean> {
    const effectiveOrgId = await this.resolveActiveOrgId(tenantId);

    if (isSupabaseEnabled) {
      const { error } = await supabase
        .from('work_locations')
        .delete()
        .eq('id', ensureUUID(id));

      if (error) {
        console.error('[Supabase WorkLocation] delete error:', error);
        if (error.code === '23503') {
          throw new Error('This location is currently referenced by other active records and cannot be deleted.');
        }
        throw new Error(error.message || 'Failed to delete work location.');
      }
    }

    let list = this.getLocations(effectiveOrgId, false);
    list = list.filter((l) => l.id !== id);
    this.saveStore(STORAGE_KEY_LOCATIONS, list, effectiveOrgId);

    hrEventBus.publish('location.deleted', { id });
    return true;
  }

  // ==========================================================================
  // 2. EMPLOYEE LOCATION ASSIGNMENTS (STAFF MAPPING)
  // ==========================================================================

  async fetchAssignmentsFromDb(tenantId?: string): Promise<EmployeeWorkLocationAssignment[]> {
    const effectiveOrgId = await this.resolveActiveOrgId(tenantId);
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('employee_work_location_assignments')
          .select('*')
          .eq('is_active', true);

        if (!error && Array.isArray(data)) {
          const mapped: EmployeeWorkLocationAssignment[] = data.map((d: any) => ({
            id: d.id,
            tenant_id: d.organization_id || effectiveOrgId,
            organization_id: d.organization_id || effectiveOrgId,
            employee_id: d.employee_id,
            work_location_id: d.work_location_id,
            is_primary: Boolean(d.is_primary),
            attendance_allowed: Boolean(d.attendance_allowed),
            effective_from: d.effective_from,
            effective_to: d.effective_to,
            is_active: Boolean(d.is_active),
            created_at: d.created_at,
            updated_at: d.updated_at,
          }));
          this.saveStore(STORAGE_KEY_ASSIGNMENTS, mapped, effectiveOrgId);
          return mapped;
        }
      } catch (err) {
        console.warn('[Supabase WorkLocation] fetchAssignmentsFromDb error:', err);
      }
    }
    return this.getAllAssignments(effectiveOrgId);
  }

  async fetchMyAssignedLocationsFromDb(): Promise<WorkLocation[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.rpc('fn_get_my_assigned_work_locations');
        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            tenant_id: d.organization_id,
            organization_id: d.organization_id,
            branch_id: d.branch_id,
            name: d.name,
            code: `LOC-${d.id.slice(0, 4).toUpperCase()}`,
            location_type: 'OFFICE' as LocationType,
            address: d.address_line1 || '',
            latitude: Number(d.latitude),
            longitude: Number(d.longitude),
            geofence_radius_meters: Number(d.geofence_radius_meters) || 100,
            accuracy_requirement_meters: 50,
            location_max_age_seconds: 60,
            timezone: 'Asia/Kolkata',
            is_active: Boolean(d.is_active),
            version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
        }
      } catch (err) {
        console.warn('[WorkLocationService] fetchMyAssignedLocationsFromDb fallback:', err);
      }
    }
    return this.getLocations(getActiveOrgId(), true);
  }

  getEmployeeAuthorizedLocations(employeeId: string, tenantId = getActiveOrgId()): WorkLocation[] {
    const allLocations = this.getLocations(tenantId, true);
    const assignments = this.loadStore<EmployeeWorkLocationAssignment[]>(STORAGE_KEY_ASSIGNMENTS, [], tenantId);
    const empAssignments = assignments.filter(
      (a) => (a.employee_id === employeeId || a.employee_id === String(employeeId)) && a.is_active && a.attendance_allowed
    );

    if (empAssignments.length === 0) {
      // Default: Allow all active locations in the organization if no specific restriction is assigned
      return allLocations;
    }

    const assignedIds = new Set(empAssignments.map((a) => a.work_location_id));
    return allLocations.filter((l) => assignedIds.has(l.id));
  }

  async setEmployeeLocations(
    employeeId: string,
    locationIds: string[],
    primaryLocationId?: string,
    tenantId?: string,
    employeeCode?: string
  ): Promise<void> {
    const effectiveOrgId = await this.resolveActiveOrgId(tenantId);
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const allLocations = this.getLocations(effectiveOrgId, false);
    const primaryLoc = allLocations.find((l) => l.id === (primaryLocationId || locationIds[0]));

    // 1. Authoritative local store persistence FIRST - ensures 100% operational availability
    let assignments = this.loadStore<EmployeeWorkLocationAssignment[]>(STORAGE_KEY_ASSIGNMENTS, [], effectiveOrgId);
    assignments = assignments.filter((a) => a.employee_id !== employeeId && (employeeCode ? a.employee_id !== employeeCode : true));

    locationIds.forEach((locId, idx) => {
      const isPrim = primaryLocationId ? primaryLocationId === locId : idx === 0;
      const rowId = `assign-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const row: EmployeeWorkLocationAssignment = {
        id: rowId,
        tenant_id: effectiveOrgId,
        organization_id: effectiveOrgId,
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

      if (employeeCode && employeeCode !== employeeId) {
        const codeRowId = `assign-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        assignments.push({
          ...row,
          id: codeRowId,
          employee_id: employeeCode,
        });
      }
    });

    this.saveStore(STORAGE_KEY_ASSIGNMENTS, assignments, effectiveOrgId);

    // 2. Synchronize to Supabase if available & valid UUID with resilient error boundary
    if (isSupabaseEnabled && isValidUUID(employeeId)) {
      try {
        const targetOrgId = (tenantId && isValidUUID(tenantId))
          ? tenantId
          : (primaryLoc?.organization_id && isValidUUID(primaryLoc.organization_id))
            ? primaryLoc.organization_id
            : effectiveOrgId;

        // Delete existing assignments for this employee
        await supabase
          .from('employee_work_location_assignments')
          .delete()
          .eq('employee_id', employeeId);

        // Insert new assignments
        if (locationIds.length > 0) {
          const insertPayloads = locationIds.map((locId, idx) => ({
            organization_id: targetOrgId,
            employee_id: employeeId,
            work_location_id: locId,
            is_primary: primaryLocationId ? primaryLocationId === locId : idx === 0,
            attendance_allowed: true,
            effective_from: today,
            is_active: true,
          }));

          const { error: insErr } = await supabase
            .from('employee_work_location_assignments')
            .insert(insertPayloads);

          if (insErr) {
            console.warn('[Supabase Assignment] Remote sync note (persisted locally):', insErr.message || insErr);
          }
        }
      } catch (err: any) {
        console.warn('[Supabase Assignment] setEmployeeLocations remote sync note:', err.message || err);
      }
    }

    // Update primary branch on employee if available in DB
    if (isSupabaseEnabled && primaryLoc && primaryLoc.branch_id) {
      try {
        await supabase
          .from('employees')
          .update({ branch_id: primaryLoc.branch_id, updated_at: now })
          .eq('id', ensureUUID(employeeId));
      } catch (e) {
        console.warn('[Supabase Employee] branch sync note:', e);
      }
    }

    hrEventBus.publish('location.assignment_updated', { employeeId, locationIds, primaryLocationId });
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
    const isAccurate = accuracyMeters <= (location.accuracy_requirement_meters || 50);

    if (!isAccurate) {
      return {
        distanceMeters,
        radiusMeters,
        accuracyMeters,
        geofenceStatus: 'GPS_INACCURATE',
        isInside: false,
        isAccurate: false,
        reason: `GPS accuracy (±${accuracyMeters}m) is lower than required threshold (≤${location.accuracy_requirement_meters || 50}m).`,
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

  /**
   * Authoritative Multi-Tier Location Verification Layer for Real-World Employee Movement
   * 1. Assigned Location (Normal / No reason needed)
   * 2. Main Office HQ (Recognized / No reason needed)
   * 3. Registered Branch (Recognized / No reason needed)
   * 4. Different Location (Allowed with reason prompt, captures exact coordinates)
   * 5. GPS Unavailable (Allowed with reason prompt)
   */
  verifyEmployeePunchLocation(
    userLat?: number,
    userLon?: number,
    accuracyMeters: number = 20,
    employeeId?: string,
    tenantId = getActiveOrgId()
  ): LocationVerificationResult {
    // Check 1: Is GPS Available from device?
    if (userLat === undefined || userLon === undefined || isNaN(userLat) || isNaN(userLon)) {
      return {
        verificationStatus: 'GPS_UNAVAILABLE',
        isAllowedWithoutReason: false,
        requiresReason: true,
        reasonPromptTitle: 'GPS Signal Unavailable',
        summaryMessage: 'GPS coordinates could not be acquired from device. Please provide an explanation to complete attendance.',
      };
    }

    const allLocations = this.getLocations(tenantId, true);
    const assignedLocations = employeeId ? this.getEmployeeAuthorizedLocations(employeeId, tenantId) : allLocations;

    // Check 2: Within Assigned Location Geofence?
    for (const loc of assignedLocations) {
      const d = this.calculateDistanceInMeters(userLat, userLon, loc.latitude, loc.longitude);
      const effectiveRadius = loc.geofence_radius_meters + (accuracyMeters <= 50 ? accuracyMeters * 0.4 : 0);
      if (d <= effectiveRadius) {
        return {
          verificationStatus: 'ASSIGNED_LOCATION',
          matchedLocation: loc,
          matchedLocationName: loc.name,
          matchedDistanceMeters: d,
          isAllowedWithoutReason: true,
          requiresReason: false,
          summaryMessage: `Verified inside assigned location: ${loc.name} (${d}m from center).`,
        };
      }
    }

    // Check 3: At Main Office Branch (HQ)?
    const mainOffice = allLocations.find(
      (l) =>
        l.code.toUpperCase().includes('HQ') ||
        l.name.toLowerCase().includes('hq') ||
        l.name.toLowerCase().includes('headquarter') ||
        l.location_type === 'OFFICE'
    );
    if (mainOffice) {
      const dHq = this.calculateDistanceInMeters(userLat, userLon, mainOffice.latitude, mainOffice.longitude);
      const effectiveRadiusHq = mainOffice.geofence_radius_meters + (accuracyMeters <= 50 ? accuracyMeters * 0.4 : 0);
      if (dHq <= effectiveRadiusHq) {
        return {
          verificationStatus: 'MAIN_OFFICE',
          matchedLocation: mainOffice,
          matchedLocationName: mainOffice.name,
          matchedDistanceMeters: dHq,
          isAllowedWithoutReason: true,
          requiresReason: false,
          summaryMessage: `Recognized at Company Main Office (HQ): ${mainOffice.name} (${dHq}m from center).`,
        };
      }
    }

    // Check 4: At Another Registered Branch / Site?
    for (const loc of allLocations) {
      const d = this.calculateDistanceInMeters(userLat, userLon, loc.latitude, loc.longitude);
      const effectiveRadius = loc.geofence_radius_meters + (accuracyMeters <= 50 ? accuracyMeters * 0.4 : 0);
      if (d <= effectiveRadius) {
        return {
          verificationStatus: 'REGISTERED_BRANCH',
          matchedLocation: loc,
          matchedLocationName: loc.name,
          matchedDistanceMeters: d,
          isAllowedWithoutReason: true,
          requiresReason: false,
          summaryMessage: `Recognized at Registered Branch: ${loc.name} (${d}m from center).`,
        };
      }
    }

    // Check 5: Different / Unknown Location
    let closestLoc: WorkLocation | undefined;
    let minD = Infinity;
    for (const loc of allLocations) {
      const d = this.calculateDistanceInMeters(userLat, userLon, loc.latitude, loc.longitude);
      if (d < minD) {
        minD = d;
        closestLoc = loc;
      }
    }

    return {
      verificationStatus: 'DIFFERENT_LOCATION',
      matchedLocation: closestLoc,
      matchedLocationName: closestLoc ? closestLoc.name : undefined,
      matchedDistanceMeters: minD !== Infinity ? minD : undefined,
      isAllowedWithoutReason: false,
      requiresReason: true,
      reasonPromptTitle: 'Different / Client Site Location Detected',
      summaryMessage: `You are at an unassigned/external location (${minD !== Infinity ? `${minD}m from nearest branch` : 'off-site'}). Please provide a brief reason to complete attendance.`,
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
    this.saveStore(STORAGE_KEY_EVENTS, events.slice(0, 1000), tenantId);
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
 * Completely dynamic - extracts exact pin coordinates, place names, and decimal coordinates for any location worldwide.
 */
export function parseGoogleMapsInput(input: string): {
  latitude?: number;
  longitude?: number;
  name?: string;
  address?: string;
} | null {
  if (!input || typeof input !== 'string') return null;
  const raw = input.trim();

  // 1. Google Maps exact place pin: !3d(lat)!4d(lon)
  const pinMatch = raw.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (pinMatch) {
    let placeName: string | undefined;
    const placeMatch = raw.match(/place\/([^/@?]+)/);
    if (placeMatch) {
      try {
        placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      } catch {
        placeName = placeMatch[1].replace(/\+/g, ' ');
      }
    }
    return {
      latitude: Number(parseFloat(pinMatch[1]).toFixed(7)),
      longitude: Number(parseFloat(pinMatch[2]).toFixed(7)),
      name: placeName,
    };
  }

  // 2. Google Maps URL containing /@lat,lon,
  const atMatch = raw.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    let placeName: string | undefined;
    const placeMatch = raw.match(/place\/([^/@?]+)/);
    if (placeMatch) {
      try {
        placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      } catch {
        placeName = placeMatch[1].replace(/\+/g, ' ');
      }
    }
    return {
      latitude: Number(parseFloat(atMatch[1]).toFixed(7)),
      longitude: Number(parseFloat(atMatch[2]).toFixed(7)),
      name: placeName,
    };
  }

  // 3. Google Maps query parameter ?q=lat,lon or ?ll=lat,lon
  const qMatch = raw.match(/[?&](?:q|ll)=(-?\d+\.\d+)[,%20]+(-?\d+\.\d+)/i);
  if (qMatch) {
    return {
      latitude: Number(parseFloat(qMatch[1]).toFixed(7)),
      longitude: Number(parseFloat(qMatch[2]).toFixed(7)),
    };
  }

  // 4. DMS format (Degrees Minutes Seconds)
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

  // 5. Raw Decimal Coordinates (e.g. "11.0844364, 77.1262627" or "11.0844364 77.1262627")
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
