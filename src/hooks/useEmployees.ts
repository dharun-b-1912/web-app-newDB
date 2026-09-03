// src/hooks/useEmployees.ts
// ============================================================
// Joy PeopleHR — Unified Employee Data Access Hook
// 100% Database-Driven • Reactive Realtime Updates • Zero LocalStorage Trap
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { Employee } from '../types';
import { api } from '../services/api';
import { hrEventBus } from '../services/hrEventBus';

export interface UseEmployeesOptions {
  companyId?: string;
  departmentId?: string;
  status?: string;
  search?: string;
  source?: string;
  vendorId?: string;
}

export function useEmployees(filters?: UseEmployeesOptions) {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      return api.getEmployeesSync(filters);
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => employees.length === 0);
  const [error, setError] = useState<string | null>(null);

  const filterKey = JSON.stringify(filters || {});

  const loadEmployees = useCallback(async () => {
    try {
      const data = await api.getEmployees(filters);
      setEmployees(data);
      setError(null);
    } catch (err: any) {
      console.warn('[useEmployees] Fetch error:', err);
      setError(err?.message || 'Failed to fetch employees from database');
    } finally {
      setIsLoading(false);
    }
  }, [filterKey]);

  useEffect(() => {
    loadEmployees();

    // Subscribe to employee real-time lifecycle events
    const unsub = hrEventBus.subscribe('employee.*', (payload: any) => {
      if (!payload) return;
      const { type, data } = payload;
      if (type === 'employee.created' && data?.id) {
        setEmployees((prev) => (prev.some((e) => e.id === data.id) ? prev : [data, ...prev]));
      } else if (type === 'employee.updated' && data?.id) {
        setEmployees((prev) => prev.map((e) => (e.id === data.id ? { ...e, ...data } : e)));
      } else if (type === 'employee.deleted' && data?.id) {
        setEmployees((prev) => prev.filter((e) => e.id !== data.id));
      } else {
        loadEmployees();
      }
    });

    return () => unsub();
  }, [loadEmployees]);

  return {
    employees,
    isLoading,
    error,
    refetch: loadEmployees,
  };
}
