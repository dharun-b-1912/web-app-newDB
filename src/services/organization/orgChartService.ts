// src/services/organization/orgChartService.ts
// ============================================================================
// Joy PeopleHR — Dynamic Database-Backed Interactive Org Chart Service
// Generates Tree Graph from Normalized SQL Relationships & Detects Cycles
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { OrgChartNode, OrgChartFilterParams, Employee, EmployeeReportingRelationship } from '../../types';
import { hrEventBus } from '../hrEventBus';
import { api } from '../api';

class OrgChartService {
  /**
   * Builds the interactive organization chart hierarchy tree directly from real database records.
   */
  async getHierarchyTree(
    organizationId: string,
    filters: OrgChartFilterParams = {}
  ): Promise<{ rootNodes: OrgChartNode[]; totalNodes: number }> {
    if (!organizationId) {
      return { rootNodes: [], totalNodes: 0 };
    }

    let employeesList: Employee[] = [];
    let relationshipsList: EmployeeReportingRelationship[] = [];

    // 1. Fetch live employees from database
    if (isSupabaseEnabled && supabase) {
      try {
        let query = supabase
          .from('employees')
          .select('id, employee_code, first_name, last_name, display_name, work_email, designation_title, department_id, branch_id, company_id, avatar_url, status, manager_employee_id, team_id, department_name, branch_name')
          .eq('organization_id', organizationId)
          .neq('status', 'Exited');

        if (filters.companyId && filters.companyId !== 'ALL') {
          query = query.eq('company_id', filters.companyId);
        }
        if (filters.branchId && filters.branchId !== 'ALL') {
          query = query.eq('branch_id', filters.branchId);
        }
        if (filters.departmentId && filters.departmentId !== 'ALL') {
          query = query.eq('department_id', filters.departmentId);
        }
        if (filters.status && filters.status !== 'ALL') {
          query = query.eq('status', filters.status);
        }

        const { data, error } = await query.order('display_name', { ascending: true });
        if (!error && data) {
          employeesList = data as any[];
        }

        // 2. Fetch explicit reporting relationships if any
        const { data: rels } = await supabase
          .from('employee_reporting_relationships')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_primary', true);

        if (rels) {
          relationshipsList = rels;
        }
      } catch (err) {
        console.warn('[OrgChartService] getHierarchyTree error:', err);
      }
    }

    // If Supabase has no records or is offline, read canonical database records from api
    if (!employeesList.length) {
      try {
        const fallbackEmps = await api.getEmployees(
          typeof filters.companyId === 'string' && filters.companyId !== 'ALL'
            ? { companyId: filters.companyId }
            : undefined
        );
        if (fallbackEmps && fallbackEmps.length > 0) {
          employeesList = fallbackEmps;
        }
      } catch (_) {}
    }

    if (!employeesList.length) {
      return { rootNodes: [], totalNodes: 0 };
    }

    // Map reporting relationships: employee_id -> manager_employee_id
    const managerMap = new Map<string, string>();
    relationshipsList.forEach(r => {
      if (r.employee_id && r.manager_employee_id) {
        managerMap.set(r.employee_id, r.manager_employee_id);
      }
    });

    // Node dictionary by employee id
    const nodeMap = new Map<string, OrgChartNode>();

    employeesList.forEach(emp => {
      const explicitManager = managerMap.get(emp.id);
      const managerId = explicitManager || (emp as any).manager_employee_id || emp.employment?.reporting_manager_id || null;

      const node: OrgChartNode = {
        id: emp.id,
        employee_id: emp.id,
        name: emp.display_name || `${emp.first_name} ${emp.last_name}`.trim(),
        employee_code: emp.employee_code || 'EMP-0000',
        designation: emp.designation_title || 'Team Member',
        department_id: emp.department_id,
        department_name: (emp as any).department_name || (emp.employment as any)?.work_location || 'General Operations',
        branch_id: emp.branch_id,
        branch_name: (emp as any).branch_name || 'Coimbatore HQ',
        company_id: emp.company_id,
        avatar_url: emp.avatar_url,
        email: emp.work_email || '',
        status: emp.status || 'Active',
        manager_employee_id: managerId,
        level: 0,
        direct_reports_count: 0,
        total_team_count: 0,
        subordinates: [],
      };
      nodeMap.set(emp.id, node);
    });

    // Link subordinates to their managers
    const rootNodes: OrgChartNode[] = [];

    nodeMap.forEach(node => {
      const managerId = node.manager_employee_id;
      if (managerId && managerId !== node.id && nodeMap.has(managerId)) {
        const managerNode = nodeMap.get(managerId)!;
        managerNode.subordinates = managerNode.subordinates || [];
        managerNode.subordinates.push(node);
        managerNode.direct_reports_count += 1;
      } else {
        // Root node (no manager or manager outside current subset)
        rootNodes.push(node);
      }
    });

    // Helper: calculate total recursive team count and set level depth
    const calculateCountsAndDepth = (node: OrgChartNode, level: number, visited: Set<string>): number => {
      if (visited.has(node.id)) {
        return 0; // Prevent cycle
      }
      visited.add(node.id);
      node.level = level;

      let totalDescendants = 0;
      if (node.subordinates && node.subordinates.length > 0) {
        node.subordinates.forEach(sub => {
          totalDescendants += 1 + calculateCountsAndDepth(sub, level + 1, new Set(visited));
        });
      }
      node.total_team_count = totalDescendants;
      return totalDescendants;
    };

    rootNodes.forEach(root => {
      calculateCountsAndDepth(root, 0, new Set());
    });

    return {
      rootNodes,
      totalNodes: nodeMap.size,
    };
  }

  /**
   * Validates whether setting targetManagerId for employeeId would introduce a circular hierarchy.
   */
  async validateReportingRelationship(
    organizationId: string,
    employeeId: string,
    targetManagerId: string
  ): Promise<{ isValid: boolean; error?: string }> {
    if (employeeId === targetManagerId) {
      return { isValid: false, error: 'An employee cannot report to themselves.' };
    }

    const { rootNodes } = await this.getHierarchyTree(organizationId);

    // Build parent map
    const parentMap = new Map<string, string>();
    const traverse = (node: OrgChartNode) => {
      if (node.subordinates) {
        node.subordinates.forEach(sub => {
          parentMap.set(sub.id, node.id);
          traverse(sub);
        });
      }
    };
    rootNodes.forEach(traverse);

    // Check if employeeId is an ancestor of targetManagerId
    let current: string | undefined = targetManagerId;
    const visited = new Set<string>();

    while (current) {
      if (current === employeeId) {
        return {
          isValid: false,
          error: 'This reporting change would create a circular hierarchy loop.',
        };
      }
      if (visited.has(current)) {
        break;
      }
      visited.add(current);
      current = parentMap.get(current);
    }

    return { isValid: true };
  }

  /**
   * Finds the path of ancestor node IDs from root down to the target employee for search highlighting.
   */
  findAncestorPath(rootNodes: OrgChartNode[], targetEmployeeId: string): string[] | null {
    const path: string[] = [];

    const search = (node: OrgChartNode): boolean => {
      path.push(node.id);
      if (node.id === targetEmployeeId || node.employee_code.toLowerCase() === targetEmployeeId.toLowerCase()) {
        return true;
      }
      if (node.subordinates) {
        for (const sub of node.subordinates) {
          if (search(sub)) return true;
        }
      }
      path.pop();
      return false;
    };

    for (const root of rootNodes) {
      if (search(root)) {
        return path;
      }
    }

    return null;
  }

  /**
   * Updates an employee's primary reporting manager with audit tracking.
   */
  async updateManager(
    organizationId: string,
    employeeId: string,
    newManagerEmployeeId: string,
    actorId?: string,
    actorName?: string,
    changeReason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const validation = await this.validateReportingRelationship(organizationId, employeeId, newManagerEmployeeId);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    if (isSupabaseEnabled && supabase) {
      try {
        // Update employee record
        await supabase
          .from('employees')
          .update({ manager_employee_id: newManagerEmployeeId, updated_at: new Date().toISOString() })
          .eq('id', employeeId);

        // Record in reporting relationships table
        await supabase.from('employee_reporting_relationships').insert([
          {
            id: `err-${Date.now()}`,
            organization_id: organizationId,
            employee_id: employeeId,
            manager_employee_id: newManagerEmployeeId,
            relationship_type: 'DIRECT_MANAGER',
            is_primary: true,
            effective_from: new Date().toISOString().split('T')[0],
            changed_by: actorName || 'HR Admin',
            change_reason: changeReason || 'Organizational realignment',
          },
        ]);

        // Audit log
        await supabase.from('organization_audit_logs').insert([
          {
            id: `oaudit-${Date.now()}`,
            organization_id: organizationId,
            entity_type: 'REPORTING_RELATIONSHIP',
            entity_id: employeeId,
            action: 'MANAGER_REASSIGNED',
            actor_id: actorId,
            actor_name: actorName || 'HR Admin',
            details: { employeeId, newManagerEmployeeId, changeReason },
          },
        ]);

        hrEventBus.emit('organization.hierarchy_updated', { employeeId, newManagerEmployeeId });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to update manager in database' };
      }
    }

    hrEventBus.emit('organization.hierarchy_updated', { employeeId, newManagerEmployeeId });
    return { success: true };
  }
}

export const orgChartService = new OrgChartService();
