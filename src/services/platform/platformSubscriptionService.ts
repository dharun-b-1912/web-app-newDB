// src/services/platform/platformSubscriptionService.ts
// ============================================================
// WorkForceOS — Subscription & Plan Catalog Service
// ============================================================

import { SubscriptionPlan, SubscriptionItem } from '../../types/platformAdmin';
import { platformAuditService } from './platformAuditService';

const initialPlans: SubscriptionPlan[] = [
  {
    id: 'plan-starter',
    name: 'Starter',
    tier_code: 'STARTER',
    max_employees: 50,
    max_admins: 3,
    storage_gb: 20,
    api_requests_per_month: 100000,
    whatsapp_limit: 1000,
    price_monthly: 18000,
    price_annual: 180000,
    features: [
      'Core Employee Directory',
      'Employee Self-Service (ESS)',
      'Basic Check-in / Check-out',
      'Leave Types & Applications',
      'Standard Payroll Run',
      'Email Support (48h SLA)',
    ],
    is_active: true,
  },
  {
    id: 'plan-pro',
    name: 'Professional',
    tier_code: 'PRO',
    max_employees: 200,
    max_admins: 8,
    storage_gb: 50,
    api_requests_per_month: 500000,
    whatsapp_limit: 5000,
    price_monthly: 45000,
    price_annual: 450000,
    features: [
      'Everything in Starter',
      'TL & Supervisor Portal',
      'GPS Geofence Clock-in',
      'Leave Policies & Auto-Accruals',
      'Statutory Compliance (PF/ESI/PT)',
      'Performance Goals & OKRs',
      'Internal HR Helpdesk',
      'Priority Email + Chat Support (12h SLA)',
    ],
    is_active: true,
  },
  {
    id: 'plan-biz',
    name: 'Business',
    tier_code: 'BUSINESS',
    max_employees: 500,
    max_admins: 15,
    storage_gb: 100,
    api_requests_per_month: 1500000,
    whatsapp_limit: 10000,
    price_monthly: 85000,
    price_annual: 850000,
    features: [
      'Full Suite HRMS',
      'Recruitment / ATS Pipeline',
      'LMS Video & SCORM Player',
      'Travel & Expense Desk',
      'POSH & Disciplinary Inquiries',
      'WhatsApp Payslips & Approvals',
      'Advanced BI Analytics & Export',
      'Dedicated Account Manager (4h SLA)',
    ],
    is_active: true,
  },
  {
    id: 'plan-ent',
    name: 'Enterprise',
    tier_code: 'ENTERPRISE',
    max_employees: 5000,
    max_admins: 50,
    storage_gb: 500,
    api_requests_per_month: 10000000,
    whatsapp_limit: 50000,
    price_monthly: 180000,
    price_annual: 1800000,
    features: [
      'Unlimited HR Capabilities',
      'AI Copilot Policy Search',
      'Visual Workflow Engine',
      'Biometric Push Hardware Adapters',
      'Dedicated VPC Database Isolation',
      'Custom Webhooks & HMAC API Keys',
      '7-Year Immutable Audit Logs',
      '99.9% Uptime SLA + 24/7 Phone Support',
    ],
    is_active: true,
  },
];

const initialSubscriptions: SubscriptionItem[] = [
  { id: 'sub-01', tenant_id: 'org-acme-01', tenant_name: 'Acme Technologies Pvt Ltd', plan: 'Enterprise', billing_cycle: 'Annual', seats: 500, used_seats: 428, price_per_seat: 290, total_amount: 145000, currency: 'INR', status: 'Active', start_date: '2026-01-15', renewal_date: '2027-01-15', auto_renew: true },
  { id: 'sub-02', tenant_id: 'org-tech-02', tenant_name: 'TechCorp Solutions Pvt Ltd', plan: 'Business', billing_cycle: 'Monthly', seats: 300, used_seats: 285, price_per_seat: 283, total_amount: 85000, currency: 'INR', status: 'Active', start_date: '2026-07-01', renewal_date: '2026-08-01', auto_renew: true },
  { id: 'sub-03', tenant_id: 'org-cyber-03', tenant_name: 'CyberSoft Global Tech Ltd', plan: 'Professional', billing_cycle: 'Monthly', seats: 120, used_seats: 85, price_per_seat: 375, total_amount: 45000, currency: 'INR', status: 'Trial', start_date: '2026-08-01', renewal_date: '2026-08-25', auto_renew: false, trial_ends_at: '2026-08-25' },
  { id: 'sub-04', tenant_id: 'org-zenith-04', tenant_name: 'Zenith Logistics & Supply Chain', plan: 'Enterprise', billing_cycle: 'Monthly', seats: 800, used_seats: 650, price_per_seat: 262, total_amount: 210000, currency: 'INR', status: 'Past Due', start_date: '2024-06-10', renewal_date: '2026-08-10', auto_renew: true },
  { id: 'sub-05', tenant_id: 'org-innovate-05', tenant_name: 'Innovate Labs Pvt Ltd', plan: 'Starter', billing_cycle: 'Annual', seats: 50, used_seats: 45, price_per_seat: 360, total_amount: 18000, currency: 'INR', status: 'Active', start_date: '2025-02-15', renewal_date: '2027-02-15', auto_renew: true },
  { id: 'sub-06', tenant_id: 'org-apex-06', tenant_name: 'Apex Financial Services Ltd', plan: 'Enterprise', billing_cycle: 'Annual', seats: 1000, used_seats: 920, price_per_seat: 320, total_amount: 320000, currency: 'INR', status: 'Active', start_date: '2023-11-01', renewal_date: '2026-11-01', auto_renew: true },
];

export const platformSubscriptionService = {
  getPlans(): SubscriptionPlan[] {
    return initialPlans;
  },

  getSubscriptions(): SubscriptionItem[] {
    return initialSubscriptions;
  },

  async toggleAutoRenew(id: string): Promise<SubscriptionItem> {
    const target = initialSubscriptions.find(s => s.id === id);
    if (!target) throw new Error('Subscription not found');

    target.auto_renew = !target.auto_renew;

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      organization_id: target.tenant_id,
      organization_name: target.tenant_name,
      action: 'SUBSCRIPTION_AUTORENEW_TOGGLED',
      resource_type: 'Subscription',
      resource_id: id,
      severity: 'Normal',
      reason: `Auto-renewal updated to ${target.auto_renew ? 'ENABLED' : 'DISABLED'}`,
    });

    return target;
  },

  async updateSeats(id: string, newSeats: number): Promise<SubscriptionItem> {
    const target = initialSubscriptions.find(s => s.id === id);
    if (!target) throw new Error('Subscription not found');

    const previousSeats = target.seats;
    target.seats = newSeats;
    target.total_amount = newSeats * target.price_per_seat;

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      organization_id: target.tenant_id,
      organization_name: target.tenant_name,
      action: 'SUBSCRIPTION_SEATS_MODIFIED',
      resource_type: 'Subscription',
      resource_id: id,
      severity: 'Normal',
      reason: `Seats changed from ${previousSeats} to ${newSeats}`,
    });

    return target;
  },
};
