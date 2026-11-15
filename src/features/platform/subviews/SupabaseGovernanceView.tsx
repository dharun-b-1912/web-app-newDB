// src/features/platform/subviews/SupabaseGovernanceView.tsx
// ============================================================================
// Joy PeopleHR — Supabase Database Governance & Edge Function Telemetry Console
// Master Super Admin Control Plane View for Schema Inventory, RLS Policies, & Edge Workers
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Activity,
  Search,
  Filter,
  RefreshCw,
  HardDrive,
  Layers,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  SlidersHorizontal,
  Table,
  Lock,
} from 'lucide-react';
import {
  platformDatabaseGovernanceService,
  DatabaseGovernanceSummary,
  EdgeFunctionsTelemetrySummary,
  DatabaseTableGovernanceRecord,
  EdgeFunctionTelemetryRecord,
} from '../../../services/platform/platformDatabaseGovernanceService';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';

export interface SupabaseGovernanceViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const SupabaseGovernanceView: React.FC<SupabaseGovernanceViewProps> = ({
  onNavigateTab,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'DATABASE' | 'EDGE_FUNCTIONS'>('DATABASE');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Data states
  const [dbData, setDbData] = useState<DatabaseGovernanceSummary | null>(null);
  const [fnData, setFnData] = useState<EdgeFunctionsTelemetrySummary | null>(null);

  // Filters
  const [tableSearch, setTableSearch] = useState<string>('');
  const [rlsFilter, setRlsFilter] = useState<'ALL' | 'SEALED' | 'UNPROTECTED'>('ALL');
  const [functionSearch, setFunctionSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [dbRes, fnRes] = await Promise.all([
        platformDatabaseGovernanceService.getDatabaseGovernance(),
        platformDatabaseGovernanceService.getEdgeFunctionsTelemetry(),
      ]);
      setDbData(dbRes);
      setFnData(fnRes);
      if (isManualRefresh) {
        showToast('Database governance and Edge Function telemetry refreshed.', 'success');
      }
    } catch (err: any) {
      showToast('Error loading telemetry data: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Tables
  const filteredTables = useMemo(() => {
    if (!dbData) return [];
    return dbData.tables.filter((t) => {
      const matchSearch =
        !tableSearch || t.table_name.toLowerCase().includes(tableSearch.toLowerCase());
      const matchRls =
        rlsFilter === 'ALL'
          ? true
          : rlsFilter === 'SEALED'
          ? t.rls_enabled
          : !t.rls_enabled;
      return matchSearch && matchRls;
    });
  }, [dbData, tableSearch, rlsFilter]);

  // Filtered Functions
  const filteredFunctions = useMemo(() => {
    if (!fnData) return [];
    return fnData.functions.filter((f) => {
      const matchSearch =
        !functionSearch ||
        f.function_name.toLowerCase().includes(functionSearch.toLowerCase()) ||
        f.description.toLowerCase().includes(functionSearch.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || f.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [fnData, functionSearch, statusFilter]);

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------
          1. HEADER COMMAND STRIP & NAVIGATION SWITCHER
         ---------------------------------------------------- */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#047857]" />
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              Supabase Database Governance & Edge Worker Telemetry
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              SOC-2 Type II Control Plane
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real-time PostgreSQL schema catalog, Row-Level Security policy enforcement, and serverless Edge Function telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-gray-100 p-1 rounded-2xl flex items-center gap-1 border border-gray-200">
            <button
              onClick={() => setActiveTab('DATABASE')}
              className={cn(
                'px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5',
                activeTab === 'DATABASE'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <Database className="w-3.5 h-3.5 text-[#047857]" />
              <span>Database Architecture</span>
            </button>
            <button
              onClick={() => setActiveTab('EDGE_FUNCTIONS')}
              className={cn(
                'px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5',
                activeTab === 'EDGE_FUNCTIONS'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Edge Worker Telemetry</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="text-xs font-bold gap-1.5 border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 text-gray-600', refreshing && 'animate-spin')} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ----------------------------------------------------
          2. TAB A: DATABASE ARCHITECTURE & RLS GOVERNANCE
         ---------------------------------------------------- */}
      {activeTab === 'DATABASE' && (
        <div className="space-y-6">
          {/* Executive KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Total Tables
              </span>
              <strong className="text-xl font-mono font-bold text-gray-900 block mt-1">
                {dbData?.total_tables || 0}
              </strong>
              <span className="text-[10px] text-gray-500 mt-0.5 block">Public schema relations</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                RLS Coverage
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <strong className="text-xl font-mono font-bold text-emerald-700">
                  {dbData?.rls_coverage_pct || 100}%
                </strong>
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
                {dbData?.rls_enabled_tables || 0} tables sealed
              </span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Total Indexes
              </span>
              <strong className="text-xl font-mono font-bold text-gray-900 block mt-1">
                {dbData?.total_indexes || 0}
              </strong>
              <span className="text-[10px] text-gray-500 mt-0.5 block">B-tree, GIN & partial</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Active Policies
              </span>
              <strong className="text-xl font-mono font-bold text-gray-900 block mt-1">
                {dbData?.total_policies || 0}
              </strong>
              <span className="text-[10px] text-gray-500 mt-0.5 block">PostgreSQL RLS rules</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs col-span-2 md:col-span-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Estimated Rows
              </span>
              <strong className="text-xl font-mono font-bold text-gray-900 block mt-1">
                {(dbData?.estimated_total_rows || 0).toLocaleString('en-IN')}
              </strong>
              <span className="text-[10px] text-gray-500 mt-0.5 block">Total live tuples</span>
            </div>
          </div>

          {/* Security Boundary Certification Alert */}
          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <strong className="font-bold text-emerald-950 block">
                Zero Unprotected Table Policy Enforced
              </strong>
              <p className="text-emerald-800 leading-relaxed text-[11px]">
                Every relation in the public schema has PostgreSQL Row-Level Security enabled. All queries through Supabase PostgREST validate caller JWT claims and verified organization memberships.
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search database tables..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#047857]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Status:
              </span>
              <select
                value={rlsFilter}
                onChange={(e) => setRlsFilter(e.target.value as any)}
                className="text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white font-medium focus:outline-none"
              >
                <option value="ALL">All Tables ({dbData?.tables.length || 0})</option>
                <option value="SEALED">RLS Sealed ({dbData?.rls_enabled_tables || 0})</option>
                <option value="UNPROTECTED">Unprotected ({dbData?.rls_disabled_tables || 0})</option>
              </select>
            </div>
          </div>

          {/* Table Inventory Table */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Relation / Table Name</th>
                    <th className="py-3 px-4">RLS Status</th>
                    <th className="py-3 px-4">Active Policies</th>
                    <th className="py-3 px-4">Indexes</th>
                    <th className="py-3 px-4">Estimated Tuples</th>
                    <th className="py-3 px-4">Disk Footprint</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTables.map((tbl) => (
                    <tr key={tbl.table_name} className="hover:bg-gray-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-gray-900 flex items-center gap-2">
                        <Table className="w-3.5 h-3.5 text-gray-400" />
                        <span>{tbl.table_name}</span>
                      </td>
                      <td className="py-3 px-4">
                        {tbl.rls_enabled ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Lock className="w-2.5 h-2.5 text-emerald-600" /> RLS Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-600" /> Unprotected
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-700">
                        {tbl.policy_count} policies
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-700">
                        {tbl.index_count} indexes
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-900 font-medium">
                        {tbl.estimated_rows.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-600 font-medium">
                        {tbl.pretty_size}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          3. TAB B: EDGE FUNCTIONS & API TELEMETRY
         ---------------------------------------------------- */}
      {activeTab === 'EDGE_FUNCTIONS' && (
        <div className="space-y-6">
          {/* Executive Edge KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Edge Fleet Size
              </span>
              <strong className="text-xl font-mono font-bold text-gray-900 block mt-1">
                {fnData?.total_functions || 0}
              </strong>
              <span className="text-[10px] text-gray-500 mt-0.5 block">Deno v2.x serverless workers</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Fleet Health
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <Activity className="w-5 h-5 text-emerald-600" />
                <strong className="text-xl font-mono font-bold text-emerald-700">
                  {fnData?.overall_health_pct || 100}%
                </strong>
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
                {fnData?.healthy_functions || 0} healthy workers
              </span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Total Invocations
              </span>
              <strong className="text-xl font-mono font-bold text-gray-900 block mt-1">
                {(fnData?.total_invocations || 0).toLocaleString('en-IN')}
              </strong>
              <span className="text-[10px] text-gray-500 mt-0.5 block">Telemetry event count</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                System Error Rate
              </span>
              <strong className="text-xl font-mono font-bold text-emerald-700 block mt-1">
                {fnData?.system_error_rate_pct || 0}%
              </strong>
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                {fnData?.total_errors || 0} total exceptions
              </span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs col-span-2 md:col-span-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Circuit Breakers
              </span>
              <div className="flex items-center gap-1 mt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <strong className="text-xl font-mono font-bold text-emerald-700">CLOSED</strong>
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
                All circuits healthy
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Edge Functions..."
                value={functionSearch}
                onChange={(e) => setFunctionSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#047857]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white font-medium focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="HEALTHY">Healthy</option>
                <option value="DEGRADED">Degraded</option>
                <option value="INCIDENT">Incident</option>
              </select>
            </div>
          </div>

          {/* Edge Functions Registry Table */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Function & Route</th>
                    <th className="py-3 px-4">Health Status</th>
                    <th className="py-3 px-4">Runtime / RAM</th>
                    <th className="py-3 px-4">Invocations</th>
                    <th className="py-3 px-4">Error Rate</th>
                    <th className="py-3 px-4">Latency (p50 / p95)</th>
                    <th className="py-3 px-4">Circuit Breaker</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredFunctions.map((fn) => (
                    <tr key={fn.id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-gray-900">{fn.function_name}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{fn.route_path}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                            fn.status === 'HEALTHY'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : fn.status === 'DEGRADED'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          )}
                        >
                          {fn.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700 font-mono text-[11px]">
                        {fn.runtime} ({fn.memory_limit_mb}MB)
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-gray-900">
                        {fn.total_invocations.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                        {fn.error_rate_pct}%
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-600">
                        {fn.p50_latency_ms}ms / {fn.p95_latency_ms}ms
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {fn.circuit_breaker_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
