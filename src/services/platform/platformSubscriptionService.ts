// src/services/platform/platformSubscriptionService.ts
// ============================================================
// Joy PeopleHR — Tenant Subscription & Customer Contracts Lifecycle Service
// ============================================================

import { platformAuditService } from './platformAuditService';
import { billingCalculationEngine } from '../billing/billingCalculationEngine';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';

export type SubscriptionStatus = 'Active' | 'Trial' | 'Past Due' | 'Suspended' | 'Cancelled' | 'Renewing Soon';

export interface SubscriptionHistoryEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}

export interface SubscriptionContractItem {
  id: string; // e.g. 'sub-joy-01'
  tenant_id: string; // e.g. 'org-joy-01'
  tenant_name: string;
  plan: 'Starter' | 'Professional' | 'Business' | 'Enterprise';
  plan_id: string;
  billing_cycle: 'Monthly' | 'Annual';
  seats: number;
  used_seats: number;
  price_per_seat: number;
  total_amount: number; // in INR
  currency: string;
  status: SubscriptionStatus;
  start_date: string;
  renewal_date: string;
  auto_renew: boolean;
  trial_ends_at?: string;
  linked_invoices_count: number;
  last_invoice_id: string;
  last_invoice_status: 'Paid' | 'Issued' | 'Overdue';
  storage_used_gb: number;
  storage_limit_gb: number;
  api_used_calls: number;
  api_limit_calls: number;
  biometric_devices_used: number;
  biometric_devices_limit: number;
  history: SubscriptionHistoryEntry[];
}

import { platformTenantService } from './platformTenantService';

let initialSubscriptions: SubscriptionContractItem[] = [];

export const platformSubscriptionService = {
  /**
   * Fetch live subscriptions directly from Supabase / live organizations.
   */
  async fetchLiveFromSupabase(): Promise<SubscriptionContractItem[]> {
    console.log('[JOY-PLATFORM][SUBSCRIPTION-SYNC] Fetching live contracts from database...');
    
    if (isSupabaseEnabled) {
      try {
        const { data: subRows, error } = await supabase
          .from('platform_subscriptions')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && subRows && subRows.length > 0) {
          const liveContracts: SubscriptionContractItem[] = subRows.map((row: any) => {
            const org = platformTenantService.getOrganizationById(row.tenant_id);
            const planName = (row.plan_name || org?.plan || 'Enterprise') as any;
            const seatsAlloc = Number(row.seats_allocated) || Number(org?.seat_limit) || 50;
            const usedSeats = Number(row.seats_used) || Number(org?.active_employees) || 1;
            const totalAmt = Number(row.total_amount) || Number(org?.mrr) || 180000;

            return {
              id: row.id,
              tenant_id: row.tenant_id,
              tenant_name: org?.legal_name || row.tenant_name || 'Customer Organization',
              plan: planName,
              plan_id: row.plan_id || `plan-${planName.toLowerCase()}`,
              billing_cycle: row.billing_cycle || org?.billing_cycle || 'Monthly',
              seats: seatsAlloc,
              used_seats: usedSeats,
              price_per_seat: Number(row.unit_price) || (seatsAlloc > 0 ? Math.round(totalAmt / seatsAlloc) : 450),
              total_amount: totalAmt,
              currency: 'INR',
              status: (row.status as any) || 'Active',
              start_date: row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
              renewal_date: org?.renewal_date || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
              auto_renew: true,
              linked_invoices_count: 1,
              last_invoice_id: `INV-${row.tenant_id?.slice(-6) || '2026'}`,
              last_invoice_status: 'Paid',
              storage_used_gb: org?.storage_used_gb || 0.1,
              storage_limit_gb: org?.storage_quota_gb || 50,
              api_used_calls: org?.api_calls_this_month || 0,
              api_limit_calls: 100000,
              biometric_devices_used: 0,
              biometric_devices_limit: 10,
              history: [
                {
                  id: `h-${row.id}`,
                  timestamp: row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
                  actor: 'Super Admin',
                  action: 'CONTRACT_SYNCHRONIZED',
                  details: `Live database contract synchronized for ${org?.legal_name || row.tenant_id}`,
                },
              ],
            };
          });

          initialSubscriptions = liveContracts;
          console.log(`[JOY-PLATFORM][SUBSCRIPTION-SYNC] Loaded ${liveContracts.length} live contracts from Supabase.`);
          return initialSubscriptions;
        }
      } catch (err) {
        console.warn('[JOY-PLATFORM][SUBSCRIPTION-SYNC] Supabase fetch fallback:', err);
      }
    }

    // Fallback: Synthesize contracts from live organizations
    const orgs = platformTenantService.getOrganizations().items;
    initialSubscriptions = orgs.map((org) => {
      const seatsAlloc = org.seat_limit || 50;
      const usedSeats = org.active_employees || 1;
      const totalAmt = org.mrr || 180000;

      return {
        id: `sub-${org.tenant_id}`,
        tenant_id: org.tenant_id,
        tenant_name: org.legal_name,
        plan: org.plan as any,
        plan_id: `plan-${org.plan.toLowerCase()}`,
        billing_cycle: org.billing_cycle as any,
        seats: seatsAlloc,
        used_seats: usedSeats,
        price_per_seat: seatsAlloc > 0 ? Math.round(totalAmt / seatsAlloc) : 450,
        total_amount: totalAmt,
        currency: 'INR',
        status: org.status === 'Active' ? 'Active' : org.status === 'Trial' ? 'Trial' : 'Suspended',
        start_date: org.created_at || new Date().toISOString().slice(0, 10),
        renewal_date: org.renewal_date || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        auto_renew: org.auto_renew,
        linked_invoices_count: 1,
        last_invoice_id: `INV-${org.tenant_id.slice(-6)}`,
        last_invoice_status: org.billing_status === 'Paid' ? 'Paid' : 'Issued',
        storage_used_gb: org.storage_used_gb || 0.1,
        storage_limit_gb: org.storage_quota_gb || 50,
        api_used_calls: org.api_calls_this_month || 0,
        api_limit_calls: 100000,
        biometric_devices_used: 0,
        biometric_devices_limit: 10,
        history: [
          {
            id: `h-${org.id}`,
            timestamp: org.created_at || new Date().toISOString().slice(0, 10),
            actor: 'Super Admin',
            action: 'CONTRACT_SYNCHRONIZED',
            details: `Active subscription linked to organization ${org.legal_name}`,
          },
        ],
      };
    });

    console.log(`[JOY-PLATFORM][SUBSCRIPTION-SYNC] Synchronized ${initialSubscriptions.length} subscriptions from active organizations.`);
    return initialSubscriptions;
  },

  getSubscriptions(filters?: {
    plan?: string;
    status?: string;
    search?: string;
  }): SubscriptionContractItem[] {
    // If empty, auto-sync from organizations
    if (initialSubscriptions.length === 0) {
      const orgs = platformTenantService.getOrganizations().items;
      if (orgs.length > 0) {
        this.fetchLiveFromSupabase().catch(() => {});
      }
    }

    let result = [...initialSubscriptions];

    if (filters?.plan && filters.plan !== 'All') {
      result = result.filter(
        (s) => s.plan.toLowerCase() === filters.plan?.toLowerCase() || s.plan_id === filters.plan
      );
    }
    if (filters?.status && filters.status !== 'All') {
      result = result.filter((s) => s.status.toLowerCase() === filters.status?.toLowerCase());
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.tenant_name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.tenant_id.toLowerCase().includes(q) ||
          s.plan.toLowerCase().includes(q)
      );
    }

    return result;
  },

  getSubscriptionById(id: string): SubscriptionContractItem | undefined {
    return initialSubscriptions.find((s) => s.id === id || s.tenant_id === id);
  },

  getMetrics() {
    const subs = this.getSubscriptions();
    return {
      active: subs.filter((s) => s.status === 'Active').length,
      trial: subs.filter((s) => s.status === 'Trial').length,
      past_due: subs.filter((s) => s.status === 'Past Due').length,
      renewing_soon: subs.filter((s) => s.status === 'Renewing Soon').length,
      cancelled: subs.filter((s) => s.status === 'Cancelled').length,
    };
  },

  async createSubscription(data: {
    tenant_id: string;
    tenant_name: string;
    plan: 'Starter' | 'Professional' | 'Business' | 'Enterprise';
    plan_id: string;
    seats: number;
    billing_cycle: 'Monthly' | 'Annual';
    auto_renew: boolean;
  }): Promise<SubscriptionContractItem> {
    const planSpecs: Record<string, { monthly: number; annual: number; seats: number }> = {
      Starter: { monthly: 18000, annual: 180000, seats: 25 },
      Professional: { monthly: 45000, annual: 450000, seats: 100 },
      Business: { monthly: 85000, annual: 850000, seats: 250 },
      Enterprise: { monthly: 180000, annual: 1800000, seats: 500 },
    };

    const spec = planSpecs[data.plan];
    const calc = billingCalculationEngine.calculateBilling({
      plan: {
        id: data.plan_id,
        name: data.plan,
        code: data.plan.toLowerCase(),
        monthlyPrice: spec.monthly,
        annualPrice: spec.annual,
        includedSeats: spec.seats,
        maximumSeats: spec.seats * 2,
      },
      seatCount: data.seats,
      billingInterval: data.billing_cycle,
    });

    const newSub: SubscriptionContractItem = {
      id: `sub-${data.tenant_id}-${Date.now().toString().slice(-4)}`,
      tenant_id: data.tenant_id,
      tenant_name: data.tenant_name,
      plan: data.plan,
      plan_id: data.plan_id,
      billing_cycle: data.billing_cycle,
      seats: data.seats,
      used_seats: 1,
      price_per_seat: Math.round(calc.subtotal / data.seats),
      total_amount: calc.subtotal,
      currency: 'INR',
      status: 'Active',
      start_date: new Date().toISOString().slice(0, 10),
      renewal_date: new Date(Date.now() + (data.billing_cycle === 'Annual' ? 365 : 30) * 86400000).toISOString().slice(0, 10),
      auto_renew: data.auto_renew,
      linked_invoices_count: 1,
      last_invoice_id: `INV-${Date.now().toString().slice(-6)}`,
      last_invoice_status: 'Paid',
      storage_used_gb: 0.5,
      storage_limit_gb: 50,
      api_used_calls: 0,
      api_limit_calls: 100000,
      biometric_devices_used: 0,
      biometric_devices_limit: 5,
      history: [
        {
          id: `h-${Date.now()}`,
          timestamp: new Date().toISOString().slice(0, 10),
          actor: 'Super Admin',
          action: 'SUBSCRIPTION_CREATED',
          details: `Provisioned ${data.plan} contract with ${data.seats} seats (Total: ₹${calc.subtotal.toLocaleString('en-IN')})`,
        },
      ],
    };

    initialSubscriptions.unshift(newSub);

    if (isSupabaseEnabled) {
      try {
        await supabase.from('platform_subscriptions').insert([{
          id: newSub.id,
          tenant_id: newSub.tenant_id,
          plan_id: newSub.plan_id,
          plan_name: newSub.plan,
          billing_cycle: newSub.billing_cycle,
          seats_allocated: newSub.seats,
          seats_used: 1,
          unit_price: newSub.price_per_seat,
          subtotal: calc.subtotal,
          tax: calc.taxAmount,
          total_amount: calc.totalAmount,
          status: 'Active',
        }]);
      } catch (err) {
        console.warn('[PlatformSubscriptionService] Supabase insert fallback:', err);
      }
    }

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      organization_id: newSub.tenant_id,
      organization_name: newSub.tenant_name,
      action: 'SUBSCRIPTION_CREATED',
      resource_type: 'Subscription',
      resource_id: newSub.id,
      severity: 'Normal',
      reason: `Created subscription for ${newSub.tenant_name} (${newSub.plan})`,
    });

    return newSub;
  },

  async changePlan(
    id: string,
    newPlan: 'Starter' | 'Professional' | 'Business' | 'Enterprise',
    newPlanId: string,
    reason?: string
  ): Promise<SubscriptionContractItem> {
    const sub = initialSubscriptions.find((s) => s.id === id);
    if (!sub) throw new Error('Subscription not found');

    const previousPlan = sub.plan;
    sub.plan = newPlan;
    sub.plan_id = newPlanId;

    const priceMap = { Starter: 18000, Professional: 45000, Business: 85000, Enterprise: 180000 };
    sub.total_amount = priceMap[newPlan];
    sub.price_per_seat = Math.round(sub.total_amount / sub.seats);

    sub.history.unshift({
      id: `h-${Date.now()}`,
      timestamp: new Date().toISOString().slice(0, 10),
      actor: 'Super Admin',
      action: 'SUBSCRIPTION_PLAN_CHANGED',
      details: `Plan upgraded from ${previousPlan} to ${newPlan}. ${reason || ''}`,
    });

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      organization_id: sub.tenant_id,
      organization_name: sub.tenant_name,
      action: 'SUBSCRIPTION_PLAN_CHANGED',
      resource_type: 'Subscription',
      resource_id: sub.id,
      severity: 'High',
      reason: `Changed plan from ${previousPlan} to ${newPlan}: ${reason || 'Customer request'}`,
    });

    return sub;
  },

  async updateSubscription(
    id: string,
    newPlan: 'Starter' | 'Professional' | 'Business' | 'Enterprise',
    newSeats?: number,
    billingCycle?: 'Monthly' | 'Annual'
  ): Promise<SubscriptionContractItem> {
    const sub = await this.changePlan(id, newPlan, `plan-${newPlan.toLowerCase()}`);
    if (newSeats) {
      await this.updateSeats(id, newSeats);
    }
    if (billingCycle) {
      sub.billing_cycle = billingCycle;
    }
    return sub;
  },

  async updateSeats(id: string, newSeats: number): Promise<SubscriptionContractItem> {
    const target = initialSubscriptions.find((s) => s.id === id);
    if (!target) throw new Error('Subscription not found');

    const previousSeats = target.seats;
    target.seats = newSeats;

    target.history.unshift({
      id: `h-${Date.now()}`,
      timestamp: new Date().toISOString().slice(0, 10),
      actor: 'Super Admin',
      action: 'SUBSCRIPTION_SEATS_CHANGED',
      details: `Seat capacity modified from ${previousSeats} to ${newSeats}`,
    });

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      organization_id: target.tenant_id,
      organization_name: target.tenant_name,
      action: 'SUBSCRIPTION_SEATS_CHANGED',
      resource_type: 'Subscription',
      resource_id: target.id,
      severity: 'Normal',
      reason: `Modified seat allocation from ${previousSeats} to ${newSeats}`,
    });

    return target;
  },

  async toggleAutoRenew(id: string): Promise<SubscriptionContractItem> {
    const target = initialSubscriptions.find((s) => s.id === id);
    if (!target) throw new Error('Subscription not found');
    target.auto_renew = !target.auto_renew;
    return target;
  },

  async resumeSubscription(id: string, reason?: string): Promise<SubscriptionContractItem> {
    const target = initialSubscriptions.find((s) => s.id === id);
    if (!target) throw new Error('Subscription not found');
    target.status = 'Active';
    return target;
  },

  async pauseSubscription(id: string, reason?: string): Promise<SubscriptionContractItem> {
    const target = initialSubscriptions.find((s) => s.id === id);
    if (!target) throw new Error('Subscription not found');
    target.status = 'Past Due';
    return target;
  },

  async cancelSubscription(id: string, reason?: string): Promise<SubscriptionContractItem> {
    const target = initialSubscriptions.find((s) => s.id === id);
    if (!target) throw new Error('Subscription not found');
    target.status = 'Cancelled';
    return target;
  },
};
