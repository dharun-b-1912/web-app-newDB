// src/features/platform/subviews/SubscriptionsView.tsx
// ============================================================
// WorkForceOS — Subscriptions & Plan Catalog Console
// ============================================================

import React, { useState } from 'react';
import { Package, Check, Shield, Layers, CreditCard, Sparkles, Sliders, RefreshCw, Plus, Edit2 } from 'lucide-react';
import { platformSubscriptionService } from '../../../services/platform';
import { SubscriptionPlan, SubscriptionItem } from '../../../types/platformAdmin';

export const SubscriptionsView: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() => platformSubscriptionService.getPlans());
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>(() => platformSubscriptionService.getSubscriptions());
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<SubscriptionPlan | null>(null);

  const handleToggleAutoRenew = async (id: string) => {
    const updated = await platformSubscriptionService.toggleAutoRenew(id);
    setSubscriptions(subscriptions.map(s => (s.id === id ? updated : s)));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-[#07563D] border border-emerald-200 uppercase tracking-wider">
              SaaS Monetization
            </span>
            <span className="text-xs font-semibold text-gray-500 font-mono">
              4 Tier Catalogs • {subscriptions.length} Active Accounts
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">Subscriptions & Tier Plans</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure SaaS subscription tiers, employee seat thresholds, and feature entitlement policies across WorkForceOS.
          </p>
        </div>
      </div>

      {/* Tier Plans Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map(plan => (
          <div key={plan.id} className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-all">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 bg-emerald-50 text-[#07563D] font-black text-xs rounded-xl border border-emerald-200">
                  {plan.name}
                </span>
                <span className="text-[10px] text-gray-500 font-mono font-bold">Max {plan.max_employees} Seats</span>
              </div>

              <div className="mt-4">
                <div className="text-2xl font-black text-gray-900">₹{(plan.price_monthly / 1000).toFixed(0)}k</div>
                <div className="text-[10px] text-gray-400 font-medium">per month / billed annually (₹{(plan.price_annual / 100000).toFixed(1)}L)</div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Included Entitlements:</div>
                {plan.features.map(feat => (
                  <div key={feat} className="flex items-center gap-2 text-xs text-gray-700">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedPlanDetails(plan)}
              className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Inspect Quotas & Rules
            </button>
          </div>
        ))}
      </div>

      {/* Plan Details Modal */}
      {selectedPlanDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Plan Quota Matrix
                </span>
                <h3 className="text-lg font-black text-gray-900 mt-1">{selectedPlanDetails.name} Plan Limits</h3>
              </div>
              <button
                onClick={() => setSelectedPlanDetails(null)}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="divide-y divide-gray-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-500">Max Headcount Capacity</span>
                <span className="font-bold font-mono text-gray-900">{selectedPlanDetails.max_employees} Employees</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-500">Admin Seats</span>
                <span className="font-bold font-mono text-gray-900">{selectedPlanDetails.max_admins} Admins</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-500">Document Vault Storage</span>
                <span className="font-bold font-mono text-gray-900">{selectedPlanDetails.storage_gb} GB</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-500">Monthly REST API Calls</span>
                <span className="font-bold font-mono text-gray-900">{selectedPlanDetails.api_requests_per_month.toLocaleString()} calls/mo</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-500">WhatsApp Notification Quota</span>
                <span className="font-bold font-mono text-gray-900">{selectedPlanDetails.whatsapp_limit.toLocaleString()} msgs/mo</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedPlanDetails(null)}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Customer Subscriptions Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-4">
        <h3 className="text-base font-extrabold text-gray-900">Active Tenant Subscriptions & Contracts</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Tenant Organization</th>
                <th className="py-3 px-4">Plan & Billing Term</th>
                <th className="py-3 px-4">Seat Utilization</th>
                <th className="py-3 px-4">Contract Amount</th>
                <th className="py-3 px-4">Renewal Date</th>
                <th className="py-3 px-4">Auto-Renew</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {subscriptions.map(sub => (
                <tr key={sub.id} className="hover:bg-gray-50/60">
                  <td className="py-3.5 px-4 font-bold text-gray-900">{sub.tenant_name}</td>
                  <td className="py-3.5 px-4 font-semibold text-gray-700">{sub.plan} ({sub.billing_cycle})</td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#07563D] h-full"
                          style={{ width: `${(sub.used_seats / sub.seats) * 100}%` }}
                        />
                      </div>
                      <span className="font-bold text-[11px] text-gray-700 font-mono">{sub.used_seats} / {sub.seats}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-gray-900 font-mono">₹{sub.total_amount.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-gray-600 font-mono">{sub.renewal_date}</td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => handleToggleAutoRenew(sub.id)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                        sub.auto_renew
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-gray-100 text-gray-600 border-gray-300'
                      }`}
                    >
                      {sub.auto_renew ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        sub.status === 'Active'
                          ? 'bg-emerald-100 text-[#07563D]'
                          : sub.status === 'Trial'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
