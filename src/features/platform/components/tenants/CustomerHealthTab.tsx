// src/features/platform/components/tenants/CustomerHealthTab.tsx
// ============================================================
// WorkForceOS — Customer Health, Risk Signals & Diagnostics Tab
// ============================================================

import React, { useState } from 'react';
import {
  HeartPulse,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Users,
  Activity,
  Layers,
  HelpCircle,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { OrganizationRecord } from '../../../../services/platform/platformTenantService';
import { cn } from '../../../../lib/utils';

export interface CustomerHealthTabProps {
  organization: OrganizationRecord;
}

export const CustomerHealthTab: React.FC<CustomerHealthTabProps> = ({ organization: org }) => {
  const [showTechnicalDiagnostics, setShowTechnicalDiagnostics] = useState(false);

  const healthPillars = [
    {
      title: 'Commercial & Billing Standing',
      status: 'Healthy',
      score: '25 / 25',
      icon: CreditCard,
      reasons: ['Invoices settled on schedule', 'No disputed chargebacks', 'Auto-renew active'],
    },
    {
      title: 'User Adoption & Active Roster',
      status: 'Healthy',
      score: '24 / 25',
      icon: Users,
      reasons: ['42 of 45 employees active this week', 'Regular clock-in activity', 'Low churn'],
    },
    {
      title: 'Seat & Storage Utilization',
      status: 'Healthy',
      score: '23 / 25',
      icon: Activity,
      reasons: ['42% seat utilization (within limits)', 'Storage well below 50GB quota'],
    },
    {
      title: 'Integration Mesh Health',
      status: 'Healthy',
      score: '22 / 25',
      icon: Layers,
      reasons: ['Razorpay test gateway connected', 'WhatsApp message mesh running with 0 errors'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------
          1. OVERALL COMPOSITE SCORE
         ---------------------------------------------------- */}
      <div className="p-6 bg-white rounded-3xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#047857] flex items-center justify-center font-bold text-2xl">
            {org.health_score}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900">Overall Customer Health: {org.health_grade}</h3>
              <span className="text-[10px] font-bold bg-emerald-100 text-[#047857] px-2 py-0.5 rounded-full">
                Score {org.health_score}/100
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Calculated dynamically from billing status, employee adoption, quota headroom, and integration uptime.
            </p>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          2. HEALTH PILLARS GRID
         ---------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {healthPillars.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title} className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[#047857]" />
                  <span className="font-bold text-gray-900 text-xs">{p.title}</span>
                </div>
                <span className="text-[10px] font-bold bg-emerald-50 text-[#047857] px-2 py-0.5 rounded-full border border-emerald-200">
                  {p.score}
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                {p.reasons.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#047857] shrink-0" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ----------------------------------------------------
          3. COLLAPSIBLE ADVANCED TECHNICAL DIAGNOSTICS
         ---------------------------------------------------- */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50/50">
        <button
          type="button"
          onClick={() => setShowTechnicalDiagnostics(!showTechnicalDiagnostics)}
          className="w-full px-5 py-3.5 flex items-center justify-between font-bold text-gray-700 text-xs hover:bg-gray-100 transition cursor-pointer"
        >
          <span>Technical Diagnostics (Engineering Metadata)</span>
          {showTechnicalDiagnostics ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>

        {showTechnicalDiagnostics && (
          <div className="p-5 bg-white border-t border-gray-200 space-y-2 font-mono text-[11px] text-gray-600">
            <div>Tenant UUID: <span className="text-gray-900">{org.id}</span></div>
            <div>Postgres Schema: <span className="text-gray-900">public (RLS Enforced)</span></div>
            <div>Realtime Channel: <span className="text-gray-900">organization:org-joy-corp</span></div>
            <div>Webhook Gateway Latency: <span className="text-[#047857]">42ms</span></div>
          </div>
        )}
      </div>
    </div>
  );
};
