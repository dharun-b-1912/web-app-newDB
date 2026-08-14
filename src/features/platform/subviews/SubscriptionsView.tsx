import React from 'react';
import { Package, Check, Shield, Layers, CreditCard, Sparkles, Sliders } from 'lucide-react';
import { platformAdminApi } from '../../../services/platformAdminApi';

export const SubscriptionsView: React.FC = () => {
  const plans = platformAdminApi.getPlans();
  const subscriptions = platformAdminApi.getSubscriptions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <h1 className="text-2xl font-black text-gray-900">Subscriptions & Tier Plans</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Configure SaaS subscription tiers, employee seat thresholds, and feature entitlement policies across WorkForceOS.
        </p>
      </div>

      {/* Tier Plans Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map(plan => (
          <div key={plan.id} className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 bg-emerald-50 text-[#07563D] font-bold text-xs rounded-lg border border-emerald-200">
                  {plan.name}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Max {plan.max_employees} Seats</span>
              </div>

              <div className="mt-4">
                <div className="text-2xl font-black text-gray-900">₹{(plan.price_monthly / 1000).toFixed(0)}k</div>
                <div className="text-[10px] text-gray-400">per month / billed annually (₹{(plan.price_annual / 100000).toFixed(1)}L)</div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Entitled Capabilities:</div>
                {plan.features.map(feat => (
                  <div key={feat} className="flex items-center gap-2 text-xs text-gray-600">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => alert(`Configuring entitlements for plan ${plan.name}`)}
              className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Configure Entitlements
            </button>
          </div>
        ))}
      </div>

      {/* Active Customer Subscriptions Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-4">
        <h3 className="text-base font-extrabold text-gray-900">Active Tenant Subscriptions</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Tenant Organization</th>
                <th className="py-3 px-4">Plan & Billing Cycle</th>
                <th className="py-3 px-4">Seat Consumption</th>
                <th className="py-3 px-4">Monthly Amount</th>
                <th className="py-3 px-4">Renewal Date</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {subscriptions.map(sub => (
                <tr key={sub.id} className="hover:bg-gray-50/60">
                  <td className="py-3 px-4 font-bold text-gray-900">{sub.tenant_name}</td>
                  <td className="py-3 px-4 font-semibold text-gray-700">{sub.plan} ({sub.billing_cycle})</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#07563D] h-full"
                          style={{ width: `${(sub.used_seats / sub.seats) * 100}%` }}
                        />
                      </div>
                      <span className="font-bold text-[11px] text-gray-700">{sub.used_seats} / {sub.seats}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-bold text-gray-900">₹{sub.total_amount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-gray-600 font-mono">{sub.renewal_date}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold text-[10px] rounded-md border border-emerald-200">
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
