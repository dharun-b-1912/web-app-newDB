import { useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  hasPermission as engineHasPermission,
  canViewModule as engineCanViewModule,
  getDataScope as engineGetDataScope,
  getPrimaryRole as engineGetPrimaryRole,
  canAccessEmployee as engineCanAccessEmployee,
  filterAccessibleEmployees as engineFilterAccessibleEmployees,
  getRoleProfile as engineGetRoleProfile,
} from '../lib/rbac/permissionEngine';
import { PermissionAction, ModuleId } from '../lib/rbac/types';
import { Employee } from '../types';

export function usePermission() {
  const { user } = useAuth();

  const primaryRole = engineGetPrimaryRole(user);

  const hasPermission = useCallback((module: string, action: string = 'view'): boolean => {
    return engineHasPermission(user, module as ModuleId, action as PermissionAction);
  }, [user]);

  const canViewModule = useCallback((module: string): boolean => {
    return engineCanViewModule(user, module as ModuleId);
  }, [user]);

  const getDataScope = useCallback((module: string) => {
    return engineGetDataScope(user, module as ModuleId);
  }, [user]);

  const isRole = useCallback((roleName: string): boolean => {
    if (!user || !user.roles) return false;
    return primaryRole.toLowerCase() === roleName.toLowerCase() ||
      user.roles.some(r => r.name.toLowerCase() === roleName.toLowerCase());
  }, [user, primaryRole]);

  const canAccessEmployee = useCallback((targetEmployee: Employee): boolean => {
    return engineCanAccessEmployee(user, targetEmployee);
  }, [user]);

  const filterAccessibleEmployees = useCallback((employees: Employee[]): Employee[] => {
    return engineFilterAccessibleEmployees(user, employees);
  }, [user]);

  return {
    user,
    primaryRole,
    roleProfile: engineGetRoleProfile(user),
    hasPermission,
    canViewModule,
    getDataScope,
    isRole,
    canAccessEmployee,
    filterAccessibleEmployees,
    userRoles: user?.roles || [],
  };
}

