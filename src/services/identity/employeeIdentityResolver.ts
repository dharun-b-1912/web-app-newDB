// src/services/identity/employeeIdentityResolver.ts
// ============================================================================
// Joy PeopleHR — Canonical Employee Identity Resolver
// Uses workforce_identity_aliases Master Table with Strict Collision Protection
// ============================================================================

import { supabase } from '../../lib/supabase';

export type IdentityResolutionResult =
  | {
      status: 'RESOLVED';
      employeeId: string;
      employeeCode: string;
      matchType: string;
      employee: CanonicalEmployee;
    }
  | {
      status: 'NOT_FOUND';
      identifier: string;
    }
  | {
      status: 'COLLISION';
      identifier: string;
      conflictingEmployeeIds: string[];
      reason: string;
    };

export interface CanonicalEmployee {
  id: string; // Database Primary Key (UUID)
  employee_code: string; // Canonical Business Identifier (e.g. JCS-017)
  first_name: string;
  last_name?: string;
  work_email?: string;
  status: string;
  organization_id: string;
  vendor_id?: string;
  salary_basis?: string;
}

export interface AuthorizedLocation {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  is_primary: boolean;
  attendance_allowed: boolean;
}

export class EmployeeIdentityResolver {
  /**
   * Resolves ANY identifier (code, badge, biometric id, email, uuid)
   * through workforce_identity_aliases with strict collision prevention.
   */
  async resolveIdentity(identifier: string): Promise<IdentityResolutionResult> {
    if (!identifier || !identifier.trim()) {
      return { status: 'NOT_FOUND', identifier: '' };
    }
    const cleanId = identifier.trim();

    try {
      // 1. Direct PK UUID Check
      if (cleanId.length >= 30 || cleanId.startsWith('emp-') || cleanId.startsWith('org-')) {
        const { data: byId } = await supabase
          .from('employees')
          .select('*')
          .eq('id', cleanId)
          .maybeSingle();

        if (byId) {
          return {
            status: 'RESOLVED',
            employeeId: byId.id,
            employeeCode: byId.employee_code,
            matchType: 'CANONICAL_UUID',
            employee: byId as CanonicalEmployee,
          };
        }
      }

      // 2. Query workforce_identity_aliases table
      const { data: matches, error } = await supabase
        .from('workforce_identity_aliases')
        .select('employee_id, alias_type, alias_value, is_active')
        .eq('alias_value', cleanId)
        .eq('is_active', true);

      if (error) {
        console.error('[IdentityResolver] Alias query error:', error);
      }

      if (matches && matches.length > 0) {
        // Distinct employee IDs matched
        const uniqueEmpIds = [...new Set(matches.map((m) => m.employee_id))];

        if (uniqueEmpIds.length > 1) {
          // IDENTITY COLLISION DETECTED
          return {
            status: 'COLLISION',
            identifier: cleanId,
            conflictingEmployeeIds: uniqueEmpIds,
            reason: `Identifier "${cleanId}" resolves to multiple distinct employees (${uniqueEmpIds.join(', ')}). Manual review required.`,
          };
        }

        const canonicalId = uniqueEmpIds[0];
        const { data: emp } = await supabase
          .from('employees')
          .select('*')
          .eq('id', canonicalId)
          .maybeSingle();

        if (emp) {
          return {
            status: 'RESOLVED',
            employeeId: emp.id,
            employeeCode: emp.employee_code,
            matchType: matches[0].alias_type,
            employee: emp as CanonicalEmployee,
          };
        }
      }

      // 3. Fallback direct match on employee_code or work_email
      const { data: directMatch } = await supabase
        .from('employees')
        .select('*')
        .or(`employee_code.ilike.${cleanId},work_email.ilike.${cleanId}`)
        .maybeSingle();

      if (directMatch) {
        return {
          status: 'RESOLVED',
          employeeId: directMatch.id,
          employeeCode: directMatch.employee_code,
          matchType: directMatch.employee_code.toLowerCase() === cleanId.toLowerCase() ? 'EMPLOYEE_CODE' : 'WORK_EMAIL',
          employee: directMatch as CanonicalEmployee,
        };
      }

      return { status: 'NOT_FOUND', identifier: cleanId };
    } catch (err: any) {
      console.error('[IdentityResolver] Exception resolving identifier:', err);
      return { status: 'NOT_FOUND', identifier: cleanId };
    }
  }

  /**
   * Helper method resolving directly to CanonicalEmployee
   */
  async resolveEmployee(identifier: string): Promise<CanonicalEmployee | null> {
    const result = await this.resolveIdentity(identifier);
    return result.status === 'RESOLVED' ? result.employee : null;
  }

  /**
   * Returns all authorized work locations for a given employee identifier.
   */
  async getAuthorizedLocations(identifier: string): Promise<AuthorizedLocation[]> {
    const employee = await this.resolveEmployee(identifier);
    if (!employee) return [];

    try {
      const { data: assignments, error } = await supabase
        .from('employee_work_location_assignments')
        .select(`
          work_location_id,
          is_primary,
          attendance_allowed,
          work_locations (
            id,
            name,
            code,
            latitude,
            longitude,
            geofence_radius_meters
          )
        `)
        .eq('employee_id', employee.id);

      if (error || !assignments) return [];

      return assignments
        .filter((a: any) => a.work_locations)
        .map((a: any) => ({
          id: a.work_locations.id,
          name: a.work_locations.name,
          code: a.work_locations.code,
          latitude: a.work_locations.latitude,
          longitude: a.work_locations.longitude,
          geofence_radius_meters: a.work_locations.geofence_radius_meters || 100,
          is_primary: a.is_primary,
          attendance_allowed: a.attendance_allowed ?? true,
        }));
    } catch (err) {
      console.error('[EmployeeIdentityResolver] Location fetch exception:', err);
      return [];
    }
  }
}

export const employeeIdentityResolver = new EmployeeIdentityResolver();
