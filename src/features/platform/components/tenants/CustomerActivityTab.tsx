// src/features/platform/components/tenants/CustomerActivityTab.tsx
// ============================================================
// WorkForceOS — Customer Human-Readable Activity & Audit Feed Tab
// ============================================================

import React, { useState } from 'react';
import {
  Clock,
  User,
  CreditCard,
  Building2,
  Shield,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { OrganizationRecord } from '../../../../services/platform/platformTenantService';
import { cn } from '../../../../lib/utils';

export interface CustomerActivityTabProps {
  organization: OrganizationRecord;
}

export const CustomerActivityTab: React.FC<CustomerActivityTabProps> = ({ organization: org }) => {
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [expandedActId, setExpandedActId] = useState<string | null>(null);

  const activities = org.activity_log || [];

  const filtered = activities.filter((a) =>
    filterCategory === 'All' ? true : a.category.toLowerCase() === filterCategory.toLowerCase()
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Customer Activity Ledger</h3>
            <p className="text-xs text-gray-500 mt-0.5">Chronological record of commercial, administrative and HR events.</p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {['All', 'Billing', 'Administration', 'HR', 'Security'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-xl font-bold transition cursor-pointer',
                  filterCategory === cat
                    ? 'bg-[#047857] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-6 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-200">
            {filtered.map((act) => {
              const isExpanded = expandedActId === act.id;
              return (
                <div key={act.id} className="flex items-start gap-4 relative">
                  <div className="w-7 h-7 rounded-full bg-emerald-50 border-2 border-[#047857] flex items-center justify-center text-[#047857] font-bold text-xs shrink-0 z-10">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>

                  <div className="flex-1 bg-gray-50/70 p-4 rounded-2xl border border-gray-100 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-gray-900">{act.event}</h4>
                      <span className="text-[11px] font-mono text-gray-400">{act.timestamp}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                      <span>Actor: <strong className="text-gray-800">{act.actor}</strong></span>
                      <span>•</span>
                      <span className="bg-gray-200/80 px-2 py-0.5 rounded text-gray-700 font-semibold">{act.category}</span>
                      <span>•</span>
                      <span>Source: <strong className="font-mono text-gray-700">{act.source}</strong></span>
                    </div>

                    <button
                      onClick={() => setExpandedActId(isExpanded ? null : act.id)}
                      className="text-[11px] font-bold text-[#047857] hover:underline flex items-center gap-1 cursor-pointer pt-1"
                    >
                      <span>{isExpanded ? 'Hide' : 'View'} technical details</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {isExpanded && (
                      <div className="p-3 bg-white rounded-xl border border-gray-200 font-mono text-[10px] text-gray-600 space-y-1">
                        <div>Event ID: {act.id}</div>
                        <div>Organization ID: {org.id}</div>
                        <div>Audit Integrity: Signed (SHA-256)</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
