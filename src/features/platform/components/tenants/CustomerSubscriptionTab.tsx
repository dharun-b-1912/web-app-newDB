// src/features/platform/components/tenants/CustomerSubscriptionTab.tsx
// ============================================================
// Joy PeopleHR — Customer Subscription & Change Plan Workflow Tab
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  Layers,
  Calendar,
  Check,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { OrganizationRecord } from '../../../../services/platform/platformTenantService';
import { billingCalculationEngine } from '../../../../services/billing/billingCalculationEngine';
import { platformSubscriptionService } from '../../../../services/platform/platformSubscriptionService';
import { Button } from '../../../../components/ui/Button';
import { useToast } from '../../../../components/ui/Toast';
import { cn } from '../../../../lib/utils';

export interface CustomerSubscriptionTabProps {
  organization: OrganizationRecord;
  onChangePlanSuccess?: (newPlan: string, newMrr: number) => void;
}

export const CustomerSubscriptionTab: React.FC<CustomerSubscriptionTabProps> = ({
  organization: org,
  onChangePlanSuccess,
}) => {
  const { showToast } = useToast();
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  const [selectedNewPlan, setSelectedNewPlan] = useState<'Starter' | 'Professional' | 'Business' | 'Enterprise'>('Business');
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'Monthly' | 'Annual'>(org.billing_cycle || 'Monthly');
  const [isUpdating, setIsUpdating] = useState(false);

  const planCatalog = [
    { name: 'Starter', monthly: 18000, annual: 180000, seats: 25, features: 12, desc: 'Essential core HR & attendance.' },
    { name: 'Professional', monthly: 45000, annual: 450000, seats: 100, features: 22, desc: 'GPS geofenced attendance & shift scheduling.' },
    { name: 'Business', monthly: 85000, annual: 850000, seats: 250, features: 36, desc: 'Comprehensive payroll, recruitment ATS & WhatsApp.' },
    { name: 'Enterprise', monthly: 180000, annual: 1800000, seats: 500, features: 48, desc: 'Dedicated VPC, AI Copilot & biometric hardware.' },
  ];

  const currentPlanSpec = planCatalog.find((p) => p.name === org.plan) || planCatalog[1];
  const targetPlanSpec = planCatalog.find((p) => p.name === selectedNewPlan) || planCatalog[2];

  // Price Difference Calculation
  const priceDiffMonthly = targetPlanSpec.monthly - currentPlanSpec.monthly;
  const featuresDiff = targetPlanSpec.features - currentPlanSpec.features;

  const handleConfirmPlanChange = async () => {
    setIsUpdating(true);
    try {
      await platformSubscriptionService.updateSubscription(
        `sub-${org.slug || org.id}-01`,
        selectedNewPlan,
        targetPlanSpec.seats,
        selectedBillingCycle
      );
      showToast(`Subscription plan upgraded to ${selectedNewPlan} (₹${targetPlanSpec.monthly.toLocaleString('en-IN')}/mo)`, 'success');
      onChangePlanSuccess?.(selectedNewPlan, targetPlanSpec.monthly);
      setShowChangePlanModal(false);
    } catch (err: any) {
      showToast(err.message || 'Plan upgrade failed.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------
          1. ACTIVE CONTRACT TERMS CARD
         ---------------------------------------------------- */}
      <div className="p-6 bg-white rounded-3xl border border-gray-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Commercial Contract</span>
            <div className="flex items-center gap-2 mt-0.5">
              <h3 className="text-lg font-bold text-gray-900">{org.plan} Plan</h3>
              <span className="text-xs font-bold text-[#047857] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {org.billing_status}
              </span>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowChangePlanModal(true)}
            className="bg-[#047857] hover:bg-[#036246] text-white font-bold text-xs shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Change Plan
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[11px] font-semibold text-gray-400 block">Contracted Rate</span>
            <strong className="text-base font-bold font-mono text-gray-900">{org.mrr_formatted}</strong>
            <span className="text-[11px] text-gray-400 block">/{org.billing_cycle.toLowerCase()}</span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-gray-400 block">Seat Entitlement</span>
            <strong className="text-base font-bold font-mono text-gray-900">{org.seat_limit} Seats</strong>
            <span className="text-[11px] text-emerald-700 block">{org.active_employees} currently active</span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-gray-400 block">Billing Cadence</span>
            <strong className="text-sm font-bold text-gray-900">{org.billing_cycle} Subscription</strong>
            <span className="text-[11px] text-gray-500 block">Auto-Renew: {org.auto_renew ? 'Enabled' : 'Disabled'}</span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-gray-400 block">Next Renewal</span>
            <strong className="text-sm font-bold text-gray-900">{org.renewal_date || 'In 30 days'}</strong>
            <span className="text-[11px] text-gray-500 block">Payment Method: Razorpay Sandbox</span>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          2. PLAN COMPARISON MATRIX
         ---------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {planCatalog.map((plan) => {
          const isCurrent = org.plan === plan.name;
          return (
            <div
              key={plan.name}
              className={cn(
                'p-5 rounded-2xl border bg-white space-y-4 relative flex flex-col justify-between',
                isCurrent ? 'border-[#047857] shadow-md ring-1 ring-[#047857]' : 'border-gray-200'
              )}
            >
              {isCurrent && (
                <span className="absolute top-3 right-3 text-[10px] font-bold bg-emerald-100 text-[#047857] px-2 py-0.5 rounded-full">
                  Current Plan
                </span>
              )}

              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">{plan.name}</span>
                <div className="text-xl font-bold font-mono text-gray-900">
                  ₹{plan.monthly.toLocaleString('en-IN')}
                  <span className="text-xs font-sans text-gray-400 font-normal">/mo</span>
                </div>
                <p className="text-[11px] text-gray-500">{plan.desc}</p>
              </div>

              <div className="pt-3 border-t border-gray-100 space-y-1 text-[11px] text-gray-600 font-medium">
                <div>Seats: <strong>{plan.seats} Included</strong></div>
                <div>Features: <strong>{plan.features} Capabilities</strong></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ----------------------------------------------------
          CHANGE PLAN WORKFLOW MODAL
         ---------------------------------------------------- */}
      {showChangePlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in text-xs">
            <div className="border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">Change Subscription Plan for {org.legal_name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">Authoritative pricing and feature capabilities will adjust immediately.</p>
            </div>

            {/* Select Target Plan */}
            <div className="space-y-2">
              <label className="block font-bold text-gray-700">Select New Plan Tier</label>
              <div className="grid grid-cols-2 gap-2">
                {planCatalog.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setSelectedNewPlan(p.name as any)}
                    className={cn(
                      'p-3 rounded-xl border text-left cursor-pointer transition',
                      selectedNewPlan === p.name ? 'border-[#047857] bg-emerald-50/50 ring-1 ring-[#047857]' : 'border-gray-200'
                    )}
                  >
                    <div className="font-bold text-gray-900">{p.name} Tier</div>
                    <div className="text-xs font-mono font-bold text-gray-700">₹{p.monthly.toLocaleString('en-IN')}/mo</div>
                    <span className="text-[10px] text-gray-500">{p.seats} Seats • {p.features} Features</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Financial & Feature Impact Comparison */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2.5">
              <span className="font-bold text-gray-900 block">Upgrade Impact Summary</span>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Current Plan:</span>
                <strong className="text-gray-900">{org.plan} (₹{currentPlanSpec.monthly.toLocaleString('en-IN')}/mo)</strong>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">New Plan:</span>
                <strong className="text-[#047857]">{selectedNewPlan} (₹{targetPlanSpec.monthly.toLocaleString('en-IN')}/mo)</strong>
              </div>
              <div className="flex justify-between text-xs border-t pt-2">
                <span className="text-gray-500">Monthly Price Adjustment:</span>
                <strong className={cn('font-mono font-bold', priceDiffMonthly >= 0 ? 'text-[#047857]' : 'text-rose-600')}>
                  {priceDiffMonthly >= 0 ? `+₹${priceDiffMonthly.toLocaleString('en-IN')}` : `-₹${Math.abs(priceDiffMonthly).toLocaleString('en-IN')}`} / month
                </strong>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Capacity Changes:</span>
                <strong className="text-gray-900">
                  {targetPlanSpec.seats} Seats ({targetPlanSpec.seats - org.seat_limit >= 0 ? `+${targetPlanSpec.seats - org.seat_limit}` : `${targetPlanSpec.seats - org.seat_limit}`})
                </strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowChangePlanModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isUpdating || selectedNewPlan === org.plan}
                onClick={handleConfirmPlanChange}
                className="bg-[#047857] hover:bg-[#036246] text-white font-bold"
              >
                {isUpdating ? 'Applying Change...' : 'Confirm Plan Change'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
