// src/services/__tests__/phaseDDatabaseGovernanceTelemetry.test.ts
// ============================================================================
// Joy PeopleHR — Phase D Test Matrix: Database Governance & Edge Function Health
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { platformDatabaseGovernanceService } from '../platform/platformDatabaseGovernanceService';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    isSupabaseEnabled: true,
    supabase: {
      ...actual.supabase,
      rpc: vi.fn(),
      from: vi.fn(),
    },
  };
});

describe('Phase D: Database Governance & Edge Function Health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Supabase Database Governance (getDatabaseGovernance)', () => {
    it('queries get_platform_database_governance RPC and returns schema statistics', async () => {
      const mockDbResponse = {
        total_tables: 48,
        rls_enabled_tables: 48,
        rls_disabled_tables: 0,
        rls_coverage_pct: 100.0,
        total_indexes: 124,
        total_policies: 186,
        estimated_total_rows: 52000,
        tables: [
          {
            table_name: 'organizations',
            rls_enabled: true,
            estimated_rows: 15,
            total_bytes: 262144,
            pretty_size: '256 kB',
            index_count: 4,
            policy_count: 6,
          },
          {
            table_name: 'employees',
            rls_enabled: true,
            estimated_rows: 1420,
            total_bytes: 4194304,
            pretty_size: '4 MB',
            index_count: 8,
            policy_count: 5,
          },
        ],
        audited_at: new Date().toISOString(),
      };

      (supabase.rpc as any).mockResolvedValueOnce({
        data: mockDbResponse,
        error: null,
      });

      const res = await platformDatabaseGovernanceService.getDatabaseGovernance();

      expect(supabase.rpc).toHaveBeenCalledWith('get_platform_database_governance');
      expect(res.total_tables).toBe(48);
      expect(res.rls_coverage_pct).toBe(100.0);
      expect(res.tables).toHaveLength(2);
      expect(res.tables[0].table_name).toBe('organizations');
      expect(res.tables[0].rls_enabled).toBe(true);
    });

    it('falls back gracefully to cached baseline metrics on network or RPC error', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: null,
        error: { message: 'function does not exist' },
      });

      const res = await platformDatabaseGovernanceService.getDatabaseGovernance();

      expect(res.total_tables).toBeGreaterThan(0);
      expect(res.rls_coverage_pct).toBe(100.0);
      expect(res.tables.length).toBeGreaterThan(0);
    });
  });

  describe('2. Edge Functions Telemetry & Sentinel Health (getEdgeFunctionsTelemetry)', () => {
    it('queries get_platform_edge_functions_telemetry RPC and computes fleet metrics', async () => {
      const mockFnResponse = {
        total_functions: 6,
        healthy_functions: 6,
        overall_health_pct: 100.0,
        total_invocations: 250000,
        total_errors: 120,
        system_error_rate_pct: 0.048,
        functions: [
          {
            id: 'fn-shift-1',
            function_name: 'shift-roster-engine',
            route_path: '/functions/v1/shift-roster-engine',
            description: '24/7 Multi-Shift Roster Generation',
            runtime: 'deno-2.x',
            memory_limit_mb: 512,
            timeout_seconds: 60,
            status: 'HEALTHY',
            total_invocations: 15000,
            total_errors: 12,
            error_rate_pct: 0.08,
            p50_latency_ms: 65.0,
            p95_latency_ms: 180.0,
            last_invoked_at: new Date().toISOString(),
            circuit_breaker_status: 'CLOSED',
          },
        ],
        reported_at: new Date().toISOString(),
      };

      (supabase.rpc as any).mockResolvedValueOnce({
        data: mockFnResponse,
        error: null,
      });

      const res = await platformDatabaseGovernanceService.getEdgeFunctionsTelemetry();

      expect(supabase.rpc).toHaveBeenCalledWith('get_platform_edge_functions_telemetry');
      expect(res.total_functions).toBe(6);
      expect(res.overall_health_pct).toBe(100.0);
      expect(res.functions).toHaveLength(1);
      expect(res.functions[0].function_name).toBe('shift-roster-engine');
      expect(res.functions[0].circuit_breaker_status).toBe('CLOSED');
    });

    it('returns high-fidelity fallback telemetry when Supabase connection is offline', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: null,
        error: { message: 'Connection timeout' },
      });

      const res = await platformDatabaseGovernanceService.getEdgeFunctionsTelemetry();

      expect(res.total_functions).toBeGreaterThan(0);
      expect(res.functions.length).toBeGreaterThan(0);
      expect(res.functions.some(f => f.function_name === 'biometric-ingest')).toBe(true);
    });
  });
});
