// src/features/dashboard/CommandCenterView.tsx
// ============================================================
// Joy PeopleHR — Enterprise Command Center (Consolidated Single Workspace)
// Tabs: [ Overview ] [ Workforce ] [ Operations ] [ Financial ]
// Includes: First-Time Company Admin 7-Step Setup Journey
// ============================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import {
  LayoutDashboard,
  UsersRound,
  Activity,
  WalletCards,
  AlertTriangle,
  TrendingUp,
  Clock3,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  CheckCircle2,
  CircleDot,
  Circle,
  X,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ExecutiveOverviewView } from './ExecutiveOverviewView';
import { WorkforceOverviewView } from './WorkforceOverviewView';
import { DashboardView } from './DashboardView';
import { PayrollMasterModule } from '../payroll/PayrollMasterModule';
import { cn } from '../../lib/utils';

interface CommandCenterViewProps {
  onNavigate?: (route: string) => void;
  initialTab?: 'overview' | 'workforce' | 'operations' | 'financial';
}

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({
  onNavigate,
  initialTab = 'overview',
}) => {
  const { user } = useAuth();
  const { activeLegalEntity } = useTenant();
  const [activeTab, setActiveTab] = useState<'overview' | 'workforce' | 'operations' | 'financial'>(initialTab);
  const [showSetupJourney, setShowSetupJourney] = useState<boolean>(() => {
    try {
      return localStorage.getItem('joy_dismiss_setup_journey') !== 'true';
    } catch {
      return true;
    }
  });

  const [attentionMetrics, setAttentionMetrics] = useState({
    longAbsences: 0,
    pendingOt: 0,
    expiringLicenses: 0,
    pendingDocs: 0,
  });

  useEffect(() => {
    const fetchAttentionMetrics = async () => {
      try {
        const [laRes, otRes, licRes, docRes] = await Promise.all([
          supabase.from('attendance_long_absences').select('id', { count: 'exact', head: true }).eq('status', 'OPEN'),
          supabase.from('overtime_requests').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
          supabase.from('vendor_commercial_agreements').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
          supabase.from('employee_documents_master').select('id', { count: 'exact', head: true }).eq('verification_status', 'PENDING'),
        ]);

        setAttentionMetrics({
          longAbsences: laRes.count || 0,
          pendingOt: otRes.count || 0,
          expiringLicenses: licRes.count || 0,
          pendingDocs: docRes.count || 0,
        });
      } catch {
        // Safe empty state
      }
    };

    fetchAttentionMetrics();

    // ⚡ Realtime WebSocket listener for instantaneous Command Center telemetry
    const realtimeChannel = supabase
      .channel('command-center-live-telemetry')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_long_absences' }, () => fetchAttentionMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'overtime_requests' }, () => fetchAttentionMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_commercial_agreements' }, () => fetchAttentionMetrics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_documents_master' }, () => fetchAttentionMetrics())
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [activeLegalEntity?.id]);

  const navigate = onNavigate || ((_r: string) => {});
  const firstName = user?.name?.split(' ')[0] || 'Administrator';
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const dismissSetupJourney = () => {
    setShowSetupJourney(false);
    try {
      localStorage.setItem('joy_dismiss_setup_journey', 'true');
    } catch {}
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 pb-24">
      {/* 1. Intelligent Executive Header */}
      <div className="bg-gradient-to-r from-[#064E3B] via-[#07563D] to-[#043629] p-6 sm:p-8 rounded-3xl text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>{activeLegalEntity?.legal_name || 'Joy Corporate Solutions'}</span>
              <span>•</span>
              <span>Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Good Morning, {firstName} 👋
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
              {currentDate} — Real-time enterprise telemetry across workforce demographics, operational attendance, and financial payroll status.
            </p>
          </div>

          {/* Quick Critical Attention Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate('attendance')}
              className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 px-3 py-2 rounded-xl text-left transition-all cursor-pointer"
              title="View Continuous Long Absences"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
              <div>
                <div className="text-[10px] font-bold text-red-200 uppercase">Long Absence</div>
                <div className="text-xs font-black text-white">
                  {attentionMetrics.longAbsences > 0 ? `${attentionMetrics.longAbsences} >2 Days` : '0 Active'}
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('overtime')}
              className="flex items-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 px-3 py-2 rounded-xl text-left transition-all cursor-pointer"
              title="View Pending OT Approvals"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div>
                <div className="text-[10px] font-bold text-amber-200 uppercase">Pending OT</div>
                <div className="text-xs font-black text-white">
                  {attentionMetrics.pendingOt > 0 ? `${attentionMetrics.pendingOt} Requests` : '0 Pending'}
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('vendor-compliance')}
              className="flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 px-3 py-2 rounded-xl text-left transition-all cursor-pointer"
              title="View Expiring Vendor Licenses"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
              <div>
                <div className="text-[10px] font-bold text-emerald-200 uppercase">Vendor Expiry</div>
                <div className="text-xs font-black text-white">
                  {attentionMetrics.expiringLicenses > 0 ? `${attentionMetrics.expiringLicenses} Licenses` : '0 Expiring'}
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('people')}
              className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 px-3 py-2 rounded-xl text-left transition-all cursor-pointer"
              title="View Pending Document Verifications"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-blue-300" />
              <div>
                <div className="text-[10px] font-bold text-blue-200 uppercase">Doc Review</div>
                <div className="text-xs font-black text-white">
                  {attentionMetrics.pendingDocs > 0 ? `${attentionMetrics.pendingDocs} Pending` : '0 Pending'}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Workspace Tabs Navigation */}
        <div className="mt-8 pt-4 border-t border-white/15 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'overview'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Executive Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('workforce')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'workforce'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <UsersRound className="w-4 h-4" />
            <span>Workforce Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('operations')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'operations'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <Activity className="w-4 h-4" />
            <span>Operations & Attendance</span>
          </button>

          <button
            onClick={() => setActiveTab('financial')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'financial'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <WalletCards className="w-4 h-4" />
            <span>Financial & Payroll</span>
          </button>
        </div>
      </div>

      {/* 2. First-Time Company Admin Setup Journey (Day 1 → Day 7) */}
      {showSetupJourney && (
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  First-Time Admin Setup
                </span>
                <span className="text-xs font-bold text-gray-500">• 3 / 7 Completed</span>
              </div>
              <h3 className="text-base font-black text-gray-900">
                Welcome to Joy PeopleHR! Complete Your Organization Setup
              </h3>
              <p className="text-xs text-gray-500">
                Follow this quick 7-step guided journey to configure your legal entities, departments, attendance devices, and invite your HR team.
              </p>
            </div>
            <button
              onClick={dismissSetupJourney}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              title="Dismiss Setup Guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-5">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-500 h-2 rounded-full transition-all duration-500" style={{ width: '43%' }} />
          </div>

          {/* 7-Step List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-2.5 text-emerald-950 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>1. Create Org Profile</span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-2.5 text-emerald-950 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>2. Add Legal Entity</span>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center gap-2.5 text-amber-950 font-bold">
              <CircleDot className="w-4 h-4 text-amber-600 shrink-0" />
              <span>3. Setup Departments</span>
            </div>
            <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 flex items-center gap-2.5 text-gray-600">
              <Circle className="w-4 h-4 text-gray-400 shrink-0" />
              <span>4. Enroll Workforce</span>
            </div>
            <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 flex items-center gap-2.5 text-gray-600">
              <Circle className="w-4 h-4 text-gray-400 shrink-0" />
              <span>5. Configure Attendance</span>
            </div>
            <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 flex items-center gap-2.5 text-gray-600">
              <Circle className="w-4 h-4 text-gray-400 shrink-0" />
              <span>6. Statutory Slabs</span>
            </div>
            <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 flex items-center gap-2.5 text-gray-600">
              <Circle className="w-4 h-4 text-gray-400 shrink-0" />
              <span>7. Invite Team & Roles</span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-800 text-white flex items-center justify-between font-bold cursor-pointer hover:bg-emerald-900 transition" onClick={() => navigate('organization')}>
              <span>Continue Setup</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* 3. Render Selected Tab Workspace View */}
      <div className="transition-all duration-200">
        {activeTab === 'overview' && (
          <ExecutiveOverviewView onNavigate={navigate} />
        )}

        {activeTab === 'workforce' && (
          <WorkforceOverviewView onNavigate={navigate} />
        )}

        {activeTab === 'operations' && (
          <DashboardView onNavigate={navigate} />
        )}

        {activeTab === 'financial' && (
          <div className="space-y-6">
            <PayrollMasterModule initialTab="payroll-dashboard" />
          </div>
        )}
      </div>
    </div>
  );
};
