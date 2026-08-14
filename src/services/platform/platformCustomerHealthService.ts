// src/services/platform/platformCustomerHealthService.ts
// ============================================================
// WorkForceOS — Tenant Health, Churn Risk & Customer Intervention Engine
// ============================================================

import { platformAuditService } from './platformAuditService';
import { platformSubscriptionService } from './platformSubscriptionService';

export type HealthGrade = 'Healthy' | 'Watch' | 'At Risk' | 'Critical';
export type HealthPillar = 'Engagement' | 'Usage' | 'Billing' | 'Support';

export interface PillarSignal {
  id: string;
  pillar: HealthPillar;
  signal_name: string;
  status: 'Good' | 'Watch' | 'Warning' | 'Critical';
  detail: string;
  score_impact: number;
}

export interface CustomerHealthRecord {
  tenant_id: string;
  tenant_name: string;
  legal_name: string;
  domain: string;
  industry: string;
  country: string;
  plan: 'Starter' | 'Professional' | 'Business' | 'Enterprise';
  mrr: number;
  mrr_formatted: string;
  active_seats: number;
  max_seats: number;
  seat_utilization_pct: number;
  status: 'Active' | 'Trial' | 'Payment Pending' | 'Suspended' | 'Past Due';

  // 4 Pillars (Each 0 - 25 pts, total 100)
  engagement_score: number;
  usage_score: number;
  billing_score: number;
  support_score: number;
  health_score: number; // 0 - 100
  previous_score_30d: number;
  score_change_30d: number; // e.g. -18 or +4
  health_grade: HealthGrade;

  // Commercial & Priority
  risk_priority: number; // Calculated sort score
  primary_risk: string;
  key_signals: string[];
  last_activity: string;
  renewal_date: string;
  days_to_renewal: number;

  // Deep Explanations
  why_at_risk: string[];
  recommended_action: {
    title: string;
    reason: string;
    action_type: 'BILLING' | 'PLAYBOOK' | 'SUPPORT' | 'REVIEW' | 'EXPANSION';
    playbook_id?: string;
    target_tab?: string;
  };

  // Detailed Signals per Pillar
  signals: PillarSignal[];

  // Metadata
  primary_contact_name: string;
  primary_contact_email: string;
  gstin: string;
  onboarding_date: string;
  storage_used_gb: number;
  storage_quota_gb: number;
  api_calls_this_month: number;
}

export interface HealthInterventionItem {
  id: string;
  tenant_id: string;
  tenant_name: string;
  playbook_id: string;
  playbook_title: string;
  owner_team: 'Finance' | 'Customer Success' | 'Technical Support' | 'Account Executive' | 'Platform Admin';
  owner_name: string;
  status: 'In Progress' | 'Completed' | 'Scheduled' | 'Failed';
  started_at: string;
  next_action_date: string;
  notes: string;
  steps: {
    id: string;
    label: string;
    completed: boolean;
    completed_at?: string;
  }[];
}

export interface PlaybookTemplate {
  id: string;
  title: string;
  category: 'Billing & Dunning' | 'Product Adoption' | 'Executive Renewal' | 'Technical Health';
  description: string;
  recommended_for_grade: HealthGrade[];
  default_owner_team: 'Finance' | 'Customer Success' | 'Technical Support' | 'Account Executive';
  steps: string[];
}

export interface HealthScoreWeights {
  engagement: number; // default 25
  usage: number; // default 25
  billing: number; // default 25
  support: number; // default 25
}

export const PLAYBOOK_TEMPLATES: PlaybookTemplate[] = [
  {
    id: 'pb-payment-recovery',
    title: 'Payment Recovery & Invoicing Escalation',
    category: 'Billing & Dunning',
    description: 'Automated finance outreach, WhatsApp payment mandate ping, and CFO reminder schedule.',
    recommended_for_grade: ['At Risk', 'Critical'],
    default_owner_team: 'Finance',
    steps: [
      'Send automated formal invoice reminder with Razorpay/UPI mandate link',
      'Notify assigned Account Executive & Finance Lead',
      'Schedule phone call with customer Finance Controller / CFO',
      'Establish 48-hour payment reconciliation deadline before service restriction',
    ],
  },
  {
    id: 'pb-adoption-recovery',
    title: 'Product Adoption & Engagement Resuscitation',
    category: 'Product Adoption',
    description: 'Targeted HRMS training for admin staff, workflow re-activation, and custom report setup.',
    recommended_for_grade: ['Watch', 'At Risk'],
    default_owner_team: 'Customer Success',
    steps: [
      'Review inactivity telemetry (Attendance check-ins & Payroll run drop)',
      'Deliver custom feature spotlight & adoption playbook to HR Head',
      'Schedule 30-minute interactive live walkthrough with Customer Success Manager',
      'Track 14-day post-training daily active user recovery',
    ],
  },
  {
    id: 'pb-executive-renewal',
    title: 'Enterprise High-Value Renewal Shield',
    category: 'Executive Renewal',
    description: 'Executive check-in, SLA performance audit, and long-term enterprise renewal offer.',
    recommended_for_grade: ['Watch', 'At Risk', 'Critical'],
    default_owner_team: 'Account Executive',
    steps: [
      'Compile 12-month platform value & attendance uptime report',
      'Schedule Executive Business Review (EBR) with VP Sales',
      'Address open support complaints and integration latency concerns',
      'Execute multi-year renewal contract with volume entitlement tier',
    ],
  },
  {
    id: 'pb-technical-support',
    title: 'Biometric Gateway & Integration Resolution',
    category: 'Technical Health',
    description: 'Biometric device IP troubleshooting, webhook latency diagnostics, and SSO fix.',
    recommended_for_grade: ['Watch', 'At Risk'],
    default_owner_team: 'Technical Support',
    steps: [
      'Audit device gateway push logs and ping latencies',
      'Assign tier-2 technical solutions engineer to customer IT administrator',
      'Perform live endpoint reconfiguration and SSL certificate verification',
      'Validate real-time sync with 0 dropped punch records over 72 hours',
    ],
  },
];

// Initial Authoritative Tenant Population
const initialHealthRecords: CustomerHealthRecord[] = [
  {
    tenant_id: 'org-zenith-04',
    tenant_name: 'Zenith Logistics & Supply Chain',
    legal_name: 'Zenith Logistics & Supply Chain Pvt Ltd',
    domain: 'zenithlogistics.in',
    industry: 'Logistics & Supply Chain',
    country: 'India',
    plan: 'Enterprise',
    mrr: 210000,
    mrr_formatted: '₹2.10L',
    active_seats: 650,
    max_seats: 800,
    seat_utilization_pct: 81.2,
    status: 'Past Due',
    engagement_score: 15,
    usage_score: 14,
    billing_score: 8,
    support_score: 17,
    health_score: 54,
    previous_score_30d: 72,
    score_change_30d: -18,
    health_grade: 'At Risk',
    risk_priority: 96.6, // (100 - 54) * (210000 / 10000) = 46 * 21 = 966 -> High priority!
    primary_risk: 'Billing (Invoice 4d overdue)',
    key_signals: ['Payment overdue 4d', 'No admin login 4d', 'Usage ↓ 22%'],
    last_activity: '4 days ago',
    renewal_date: '2026-08-10',
    days_to_renewal: -4,
    why_at_risk: [
      'August renewal invoice (#INV-2026-0802) of ₹2.47L is 4 days overdue',
      'Tenant Super Admin has not logged in for 4 consecutive business days',
      'Attendance check-in activity dropped by 22% compared to July baseline',
      '2 ZK-Teco biometric device sync timeouts detected in Chennai hub',
    ],
    recommended_action: {
      title: 'Resolve Billing & Launch Payment Recovery',
      reason: 'Billing pillar dropped to 8/25 with ₹2.10L MRR commercial exposure at risk.',
      action_type: 'PLAYBOOK',
      playbook_id: 'pb-payment-recovery',
      target_tab: 'platform-billing',
    },
    signals: [
      { id: 's-1', pillar: 'Billing', signal_name: 'Overdue Renewal Invoice', status: 'Critical', detail: 'Invoice #INV-2026-0802 (₹2,47,800) overdue since Aug 10', score_impact: -17 },
      { id: 's-2', pillar: 'Engagement', signal_name: 'Admin Inactivity', status: 'Warning', detail: 'Primary HR Admin last logged in 4 days ago', score_impact: -10 },
      { id: 's-3', pillar: 'Usage', signal_name: 'Attendance Telemetry Dip', status: 'Warning', detail: 'Daily attendance mark rate reduced from 94% to 72%', score_impact: -11 },
      { id: 's-4', pillar: 'Support', signal_name: 'Open Integration Tickets', status: 'Watch', detail: '1 open ticket regarding biometric gateway latency', score_impact: -8 },
    ],
    primary_contact_name: 'Meera Nair (CFO)',
    primary_contact_email: 'meera@zenithlog.com',
    gstin: '33AAACZ5544M1Z6',
    onboarding_date: '2024-06-10',
    storage_used_gb: 145,
    storage_quota_gb: 500,
    api_calls_this_month: 42000,
  },
  {
    tenant_id: 'org-acme-01',
    tenant_name: 'Acme Technologies Pvt Ltd',
    legal_name: 'Acme Technologies Pvt Ltd',
    domain: 'acme.com',
    industry: 'Software & IT Services',
    country: 'India',
    plan: 'Enterprise',
    mrr: 145000,
    mrr_formatted: '₹1.45L',
    active_seats: 428,
    max_seats: 500,
    seat_utilization_pct: 85.6,
    status: 'Active',
    engagement_score: 25,
    usage_score: 24,
    billing_score: 25,
    support_score: 22,
    health_score: 96,
    previous_score_30d: 92,
    score_change_30d: +4,
    health_grade: 'Healthy',
    risk_priority: 5.8,
    primary_risk: 'None (Healthy Expansion Candidate)',
    key_signals: ['97% DAU rate', 'Upfront paid', 'Seats 85.6% used'],
    last_activity: 'Just now',
    renewal_date: '2027-01-15',
    days_to_renewal: 154,
    why_at_risk: [],
    recommended_action: {
      title: 'Propose Enterprise Seat Expansion',
      reason: 'Tenant has reached 85.6% seat capacity with strong 96/100 health.',
      action_type: 'EXPANSION',
      target_tab: 'platform-subscriptions',
    },
    signals: [
      { id: 's-5', pillar: 'Engagement', signal_name: 'Daily Active Engagement', status: 'Good', detail: '97% daily employee attendance logging', score_impact: 0 },
      { id: 's-6', pillar: 'Billing', signal_name: 'Annual Subscription Settled', status: 'Good', detail: 'Annual upfront cleared via Razorpay Corporate NetBanking', score_impact: 0 },
      { id: 's-7', pillar: 'Usage', signal_name: 'Capacity Utilization', status: 'Good', detail: '428 / 500 seats active (Candidate for +100 seat addon)', score_impact: 0 },
      { id: 's-8', pillar: 'Support', signal_name: 'Zero Open Tickets', status: 'Good', detail: 'All historical support cases resolved with 5-star CSAT', score_impact: 0 },
    ],
    primary_contact_name: 'Dharun Joy (Head of Engineering)',
    primary_contact_email: 'admin@acme.com',
    gstin: '33AAACA1234F1Z8',
    onboarding_date: '2024-01-15',
    storage_used_gb: 74,
    storage_quota_gb: 500,
    api_calls_this_month: 89000,
  },
  {
    tenant_id: 'org-tech-02',
    tenant_name: 'TechCorp Solutions Pvt Ltd',
    legal_name: 'TechCorp Solutions Pvt Ltd',
    domain: 'techcorp.in',
    industry: 'Hardware Manufacturing',
    country: 'India',
    plan: 'Business',
    mrr: 85000,
    mrr_formatted: '₹85k',
    active_seats: 285,
    max_seats: 300,
    seat_utilization_pct: 95.0,
    status: 'Active',
    engagement_score: 23,
    usage_score: 24,
    billing_score: 23,
    support_score: 18,
    health_score: 88,
    previous_score_30d: 87,
    score_change_30d: +1,
    health_grade: 'Healthy',
    risk_priority: 10.2,
    primary_risk: 'None (Seat Capacity Nearing Limit)',
    key_signals: ['95% seat quota', 'Auto-debit active', 'Daily admin check-in'],
    last_activity: '2 hours ago',
    renewal_date: '2026-11-01',
    days_to_renewal: 79,
    why_at_risk: [],
    recommended_action: {
      title: 'Upgrade to Enterprise Tier',
      reason: '285/300 seats used (95%). Upgrading will unlock dedicated SLAs.',
      action_type: 'EXPANSION',
      target_tab: 'platform-plans',
    },
    signals: [
      { id: 's-9', pillar: 'Engagement', signal_name: 'Active Admin Management', status: 'Good', detail: 'Admin checked in today at 09:30 AM', score_impact: 0 },
      { id: 's-10', pillar: 'Usage', signal_name: 'High Capacity', status: 'Good', detail: '95% seats utilized across all branches', score_impact: 0 },
      { id: 's-11', pillar: 'Billing', signal_name: 'Auto-Debit Active', status: 'Good', detail: 'Automated mandate active on Razorpay', score_impact: 0 },
      { id: 's-12', pillar: 'Support', signal_name: '1 Support Inquiry', status: 'Good', detail: 'Payroll tax deduction clarification query answered', score_impact: 0 },
    ],
    primary_contact_name: 'Suresh Raina (HR Director)',
    primary_contact_email: 'suresh@techcorp.in',
    gstin: '29AAACT9988K1Z2',
    onboarding_date: '2024-03-01',
    storage_used_gb: 42,
    storage_quota_gb: 100,
    api_calls_this_month: 24000,
  },
  {
    tenant_id: 'org-byte-07',
    tenant_name: 'ByteForge Systems India',
    legal_name: 'ByteForge Systems India Pvt Ltd',
    domain: 'byteforge.io',
    industry: 'Cloud Infrastructure',
    country: 'India',
    plan: 'Professional',
    mrr: 24000,
    mrr_formatted: '₹24k',
    active_seats: 48,
    max_seats: 50,
    seat_utilization_pct: 96.0,
    status: 'Active',
    engagement_score: 18,
    usage_score: 16,
    billing_score: 17,
    support_score: 11,
    health_score: 62,
    previous_score_30d: 74,
    score_change_30d: -12,
    health_grade: 'Watch',
    risk_priority: 9.1,
    primary_risk: 'Support (2 Unresolved SLA Tickets)',
    key_signals: ['2 open tickets', 'SLA breach 1d', 'Seat cap 96%'],
    last_activity: '1 day ago',
    renewal_date: '2026-08-20',
    days_to_renewal: 6,
    why_at_risk: [
      '2 unresolved support tickets pending on WhatsApp integration',
      'SLA turnaround time breached on ticket #SUP-9912',
      'Renewal is coming up in 6 days',
    ],
    recommended_action: {
      title: 'Expedite Support Ticket Resolution',
      reason: 'Resolve ticket #SUP-9912 prior to renewal date (Aug 20).',
      action_type: 'SUPPORT',
      target_tab: 'platform-support',
    },
    signals: [
      { id: 's-13', pillar: 'Support', signal_name: 'SLA Response Breach', status: 'Warning', detail: 'WhatsApp template webhook sync ticket overdue by 24h', score_impact: -14 },
      { id: 's-14', pillar: 'Billing', signal_name: 'Renewal in 6 Days', status: 'Watch', detail: 'August cycle invoice issued (#INV-2026-0806)', score_impact: -8 },
      { id: 's-15', pillar: 'Engagement', signal_name: 'Moderate ESS Logins', status: 'Good', detail: '80% weekly active users', score_impact: 0 },
      { id: 's-16', pillar: 'Usage', signal_name: 'Payroll Active', status: 'Good', detail: 'July payroll executed on time', score_impact: 0 },
    ],
    primary_contact_name: 'Kiran V (Operations Lead)',
    primary_contact_email: 'kiran@byteforge.io',
    gstin: '36AABCB1199M1Z8',
    onboarding_date: '2025-07-30',
    storage_used_gb: 12,
    storage_quota_gb: 50,
    api_calls_this_month: 15000,
  },
  {
    tenant_id: 'org-apex-06',
    tenant_name: 'Apex Financial Services Ltd',
    legal_name: 'Apex Financial Services Ltd',
    domain: 'apexcap.in',
    industry: 'Banking & Financial Services',
    country: 'India',
    plan: 'Enterprise',
    mrr: 320000,
    mrr_formatted: '₹3.20L',
    active_seats: 920,
    max_seats: 1000,
    seat_utilization_pct: 92.0,
    status: 'Active',
    engagement_score: 25,
    usage_score: 25,
    billing_score: 25,
    support_score: 23,
    health_score: 98,
    previous_score_30d: 96,
    score_change_30d: +2,
    health_grade: 'Healthy',
    risk_priority: 6.4,
    primary_risk: 'None (Top Strategic Enterprise)',
    key_signals: ['920 Enterprise Seats', 'Verified wire payment', 'Zero outages'],
    last_activity: '10 mins ago',
    renewal_date: '2026-11-01',
    days_to_renewal: 79,
    why_at_risk: [],
    recommended_action: {
      title: 'Maintain Strategic Relationship',
      reason: 'Top account with ₹3.20L MRR and 98/100 score.',
      action_type: 'REVIEW',
      target_tab: 'platform-tenants',
    },
    signals: [
      { id: 's-17', pillar: 'Engagement', signal_name: 'SOC2 Compliant Admin Activity', status: 'Good', detail: 'Mandatory session logging and dual admin approval active', score_impact: 0 },
      { id: 's-18', pillar: 'Usage', signal_name: 'Enterprise SAP Integration', status: 'Good', detail: 'Automated payroll GL ledger exports run smoothly', score_impact: 0 },
      { id: 's-19', pillar: 'Billing', signal_name: 'Advance Wire Payment Settled', status: 'Good', detail: 'ICICI Bank wire verified (#INV-2026-0804)', score_impact: 0 },
      { id: 's-20', pillar: 'Support', signal_name: 'Dedicated Technical Account Manager', status: 'Good', detail: 'Weekly sync call with zero escalations', score_impact: 0 },
    ],
    primary_contact_name: 'Pooja Agarwal (CTO)',
    primary_contact_email: 'pooja@apexcap.in',
    gstin: '27AAACA1100P1Z0',
    onboarding_date: '2023-11-01',
    storage_used_gb: 310,
    storage_quota_gb: 500,
    api_calls_this_month: 210000,
  },
  {
    tenant_id: 'org-innovate-05',
    tenant_name: 'Innovate Labs Pvt Ltd',
    legal_name: 'Innovate Labs Pvt Ltd',
    domain: 'innovatelabs.ai',
    industry: 'Artificial Intelligence',
    country: 'India',
    plan: 'Starter',
    mrr: 18000,
    mrr_formatted: '₹18k',
    active_seats: 45,
    max_seats: 50,
    seat_utilization_pct: 90.0,
    status: 'Active',
    engagement_score: 24,
    usage_score: 23,
    billing_score: 25,
    support_score: 20,
    health_score: 92,
    previous_score_30d: 90,
    score_change_30d: +2,
    health_grade: 'Healthy',
    risk_priority: 1.4,
    primary_risk: 'None (Healthy Growth)',
    key_signals: ['100% check-in rate', 'UPI auto-renew active', 'AI Copilot power user'],
    last_activity: '1 hour ago',
    renewal_date: '2027-02-15',
    days_to_renewal: 185,
    why_at_risk: [],
    recommended_action: {
      title: 'Offer Upgrade to Professional Tier',
      reason: '45/50 seats used with AI Copilot feature adoption.',
      action_type: 'EXPANSION',
      target_tab: 'platform-plans',
    },
    signals: [
      { id: 's-21', pillar: 'Engagement', signal_name: 'GPS Geofencing Active', status: 'Good', detail: 'Mobile app check-in usage is 100%', score_impact: 0 },
      { id: 's-22', pillar: 'Billing', signal_name: 'UPI AutoPay Enabled', status: 'Good', detail: 'Recurring payments processed instantly', score_impact: 0 },
      { id: 's-23', pillar: 'Usage', signal_name: 'Copilot Feature Utilization', status: 'Good', detail: 'HR policies queried via AI Copilot 48 times this week', score_impact: 0 },
      { id: 's-24', pillar: 'Support', signal_name: 'No Tickets', status: 'Good', detail: 'Zero support incidents recorded in last 90 days', score_impact: 0 },
    ],
    primary_contact_name: 'Vikram Sethi (Founder)',
    primary_contact_email: 'vikram@innovatelabs.ai',
    gstin: '27AAACI3322N1Z8',
    onboarding_date: '2025-02-15',
    storage_used_gb: 8,
    storage_quota_gb: 20,
    api_calls_this_month: 8200,
  },
  {
    tenant_id: 'org-nimbus-08',
    tenant_name: 'Nimbus Cloud Infra Ltd',
    legal_name: 'Nimbus Cloud Infra Ltd',
    domain: 'nimbusinfra.io',
    industry: 'Infrastructure & DevOps',
    country: 'India',
    plan: 'Business',
    mrr: 72000,
    mrr_formatted: '₹72k',
    active_seats: 180,
    max_seats: 250,
    seat_utilization_pct: 72.0,
    status: 'Past Due',
    engagement_score: 10,
    usage_score: 9,
    billing_score: 7,
    support_score: 12,
    health_score: 38,
    previous_score_30d: 64,
    score_change_30d: -26,
    health_grade: 'Critical',
    risk_priority: 44.6,
    primary_risk: 'Billing & Engagement (Payment 27d Overdue)',
    key_signals: ['Card declined', '27 days overdue', 'Admin inactive 14d'],
    last_activity: '14 days ago',
    renewal_date: '2026-07-18',
    days_to_renewal: -27,
    why_at_risk: [
      'July renewal payment failed (Mandate declined by issuing bank)',
      'No administrator has accessed the platform for 14 days',
      'Employee attendance sync halted on July 28',
      '3 dunning reminder emails remained unread',
    ],
    recommended_action: {
      title: 'Execute Payment Recovery Playbook & Urgent Call',
      reason: 'Critical 38/100 score, 27 days past due with ₹72k MRR exposure.',
      action_type: 'PLAYBOOK',
      playbook_id: 'pb-payment-recovery',
      target_tab: 'platform-billing',
    },
    signals: [
      { id: 's-25', pillar: 'Billing', signal_name: 'Payment Mandate Declined', status: 'Critical', detail: 'Credit card transaction declined by issuer: Insufficient Mandate Limit', score_impact: -18 },
      { id: 's-26', pillar: 'Engagement', signal_name: 'Prolonged Admin Inactivity', status: 'Critical', detail: 'No admin logins in 14 days', score_impact: -15 },
      { id: 's-27', pillar: 'Usage', signal_name: 'Attendance Pipeline Halted', status: 'Critical', detail: 'Zero punch-in events recorded since July 28', score_impact: -16 },
      { id: 's-28', pillar: 'Support', signal_name: 'Unopened Dunning Alerts', status: 'Warning', detail: 'Automated payment alerts bounced / unacknowledged', score_impact: -13 },
    ],
    primary_contact_name: 'Priya Sharma (VP Operations)',
    primary_contact_email: 'accounts@nimbusinfra.io',
    gstin: '29AAACN4433P1Z7',
    onboarding_date: '2024-08-01',
    storage_used_gb: 34,
    storage_quota_gb: 100,
    api_calls_this_month: 1200,
  },
];

import { platformTenantService } from './platformTenantService';

const initialInterventions: HealthInterventionItem[] = [];

let globalWeights: HealthScoreWeights = {
  engagement: 25,
  usage: 25,
  billing: 25,
  support: 25,
};

export const platformCustomerHealthService = {
  getTenantsHealth(): CustomerHealthRecord[] {
    const orgs = platformTenantService.getOrganizations().items;
    return orgs.map((o) => ({
      tenant_id: o.id,
      tenant_name: o.display_name || o.legal_name,
      legal_name: o.legal_name,
      domain: o.domain,
      industry: o.industry,
      country: o.country,
      plan: o.plan as any,
      mrr: o.mrr,
      mrr_formatted: o.mrr_formatted,
      active_seats: o.active_employees,
      max_seats: o.seat_limit,
      seat_utilization_pct: o.seat_utilization_pct,
      status: o.status as any,
      engagement_score: o.engagement_score || 25,
      usage_score: o.usage_score || 25,
      billing_score: o.billing_score || 25,
      support_score: o.support_score || 25,
      health_score: o.health_score || 100,
      previous_score_30d: (o.health_score || 100) - (o.health_trend || 0),
      score_change_30d: o.health_trend || 0,
      health_grade: o.health_grade || 'Healthy',
      risk_priority: o.health_grade === 'Critical' ? 40 : o.health_grade === 'At Risk' ? 25 : 5,
      primary_risk: o.primary_risk || 'None',
      key_signals: [`${o.seat_utilization_pct}% seat quota`, `${o.billing_status} status`],
      last_activity: o.last_activity_time || 'Just now',
      renewal_date: o.renewal_date,
      days_to_renewal: 30,
      why_at_risk: o.health_grade === 'Critical' || o.health_grade === 'At Risk' ? [o.primary_risk] : [],
      recommended_action: {
        title: o.seat_utilization_pct > 80 ? 'Propose Seat Expansion' : 'Maintain Engagement',
        reason: `${o.seat_utilization_pct}% capacity utilization`,
        action_type: 'EXPANSION',
        target_tab: 'platform-subscriptions',
      },
      signals: [
        { id: `s-${o.id}-1`, pillar: 'Engagement', signal_name: 'Activity Pulse', status: 'Good', detail: o.last_activity_event || 'Nominal check-in', score_impact: 0 },
        { id: `s-${o.id}-2`, pillar: 'Billing', signal_name: 'Invoice Status', status: o.billing_status === 'Paid' ? 'Good' : 'Warning', detail: `${o.billing_status} billing status`, score_impact: o.billing_status === 'Paid' ? 0 : -10 },
      ],
      primary_contact_name: o.primary_admin_name,
      primary_contact_email: o.primary_admin_email,
      gstin: o.gstin,
      onboarding_date: o.created_at,
      storage_used_gb: o.storage_used_gb,
      storage_quota_gb: o.storage_quota_gb,
      api_calls_this_month: o.api_calls_this_month,
    }));
  },

  getTenantHealthById(id: string): CustomerHealthRecord | undefined {
    return this.getTenantsHealth().find(t => t.tenant_id === id);
  },

  getInterventions(tenantId?: string): HealthInterventionItem[] {
    if (tenantId) {
      return initialInterventions.filter(i => i.tenant_id === tenantId);
    }
    return initialInterventions;
  },

  getWeights(): HealthScoreWeights {
    return globalWeights;
  },

  async updateWeights(newWeights: HealthScoreWeights): Promise<void> {
    globalWeights = { ...newWeights };
    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'HEALTH_RULE_CHANGED',
      resource_type: 'HealthScoreRules',
      resource_id: 'health-weights',
      severity: 'High',
      reason: `Updated 4-pillar weights: Engagement=${newWeights.engagement}%, Usage=${newWeights.usage}%, Billing=${newWeights.billing}%, Support=${newWeights.support}%`,
    });
  },

  async launchPlaybook(tenantId: string, playbookId: string, ownerTeam: any, ownerName: string, notes: string): Promise<HealthInterventionItem> {
    const tenant = this.getTenantHealthById(tenantId);
    const template = PLAYBOOK_TEMPLATES.find(p => p.id === playbookId);
    if (!tenant || !template) throw new Error('Tenant or playbook not found');

    const newIntervention: HealthInterventionItem = {
      id: `int-${Date.now()}`,
      tenant_id: tenant.tenant_id,
      tenant_name: tenant.tenant_name,
      playbook_id: template.id,
      playbook_title: template.title,
      owner_team: ownerTeam || template.default_owner_team,
      owner_name: ownerName || 'WorkForce Super Admin',
      status: 'In Progress',
      started_at: new Date().toLocaleString(),
      next_action_date: new Date(Date.now() + 48 * 3600 * 1000).toISOString().split('T')[0],
      notes: notes || 'Playbook intervention launched from Customer Health Control Center.',
      steps: template.steps.map((s, idx) => ({
        id: `step-${idx + 1}`,
        label: s,
        completed: idx === 0,
        completed_at: idx === 0 ? new Date().toLocaleTimeString() : undefined,
      })),
    };

    initialInterventions.unshift(newIntervention);

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      organization_id: tenant.tenant_id,
      organization_name: tenant.tenant_name,
      action: 'INTERVENTION_CREATED',
      resource_type: 'HealthPlaybook',
      resource_id: newIntervention.id,
      severity: 'Normal',
      reason: `Launched playbook '${template.title}' for ${tenant.tenant_name}`,
    });

    return newIntervention;
  },

  async toggleStep(interventionId: string, stepId: string): Promise<void> {
    const intervention = initialInterventions.find(i => i.id === interventionId);
    if (!intervention) return;
    const step = intervention.steps.find(s => s.id === stepId);
    if (!step) return;

    step.completed = !step.completed;
    step.completed_at = step.completed ? new Date().toLocaleTimeString() : undefined;

    const allCompleted = intervention.steps.every(s => s.completed);
    if (allCompleted) {
      intervention.status = 'Completed';
    }
  },

  getPortfolioMetrics() {
    const records = this.getTenantsHealth();
    const totalTenants = records.length;
    const healthyTenants = records.filter(r => r.health_grade === 'Healthy').length;
    const watchTenants = records.filter(r => r.health_grade === 'Watch').length;
    const atRiskTenants = records.filter(r => r.health_grade === 'At Risk').length;
    const criticalTenants = records.filter(r => r.health_grade === 'Critical').length;
    const portfolioScore = totalTenants > 0 ? Math.round(records.reduce((sum, r) => sum + r.health_score, 0) / totalTenants) : 100;
    const portfolioChange = 0;
    const mrrAtRisk = records.filter(r => r.health_grade === 'At Risk' || r.health_grade === 'Critical').reduce((sum, r) => sum + r.mrr, 0);
    const renewalsAtRisk = records.filter(r => r.health_grade === 'At Risk' || r.health_grade === 'Critical').length;
    const expansionOpportunities = records.filter(r => r.seat_utilization_pct > 80).length;

    return {
      totalTenants,
      healthyTenants,
      watchTenants,
      atRiskTenants,
      criticalTenants,
      portfolioScore,
      portfolioChange,
      mrrAtRisk,
      renewalsAtRisk,
      expansionOpportunities,
      healthyPct: totalTenants > 0 ? ((healthyTenants / totalTenants) * 100).toFixed(1) : '0',
      watchPct: totalTenants > 0 ? ((watchTenants / totalTenants) * 100).toFixed(1) : '0',
      atRiskPct: totalTenants > 0 ? ((atRiskTenants / totalTenants) * 100).toFixed(1) : '0',
      criticalPct: totalTenants > 0 ? ((criticalTenants / totalTenants) * 100).toFixed(1) : '0',
    };
  },
};
