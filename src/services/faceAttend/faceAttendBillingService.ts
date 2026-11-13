// src/services/faceAttend/faceAttendBillingService.ts
// Commercial plan presets, tenant subscription management, and immutable billing snapshots.
import { supabase } from '../../lib/supabase';
import { computeFaceAttendBillingAmount } from '../../../supabase/functions/face-attend-verify/policy';
import type {
  FaceAttendBillingSnapshot,
  FaceAttendPlanCode,
  FaceAttendSubscription,
} from '../../types/faceAttend';

export interface FaceAttendPlanPreset {
  code: FaceAttendPlanCode;
  name: string;
  suggestedPricePerEmployee: number;
  description: string;
  features: string[];
}

export const FACEATTEND_PLAN_PRESETS: FaceAttendPlanPreset[] = [
  {
    code: 'BASIC',
    name: 'Basic (Core GPS + 1:1 Face)',
    suggestedPricePerEmployee: 15,
    description: '1:1 face verification + GPS geofence validation + daily attendance commit.',
    features: [
      '1:1 employee face verification',
      'GPS coordinate & radius geofence validation',
      'Consent tracking & self-service deletion',
      'Manual exception review fallback',
    ],
  },
  {
    code: 'PRO',
    name: 'Pro (Liveness + Audit + Analytics)',
    suggestedPricePerEmployee: 25,
    description: 'Adds active liveness / anti-spoof checks, Realtime HR console & immutable billing snapshots.',
    features: [
      'Everything in Basic',
      'Server-verified challenge & PAD liveness adapter',
      'Realtime HR console & Supervisor exception queue',
      'Versioned policy controls & full forensic attempt audit',
    ],
  },
  {
    code: 'TRIAL',
    name: '14-Day Guided Trial',
    suggestedPricePerEmployee: 0,
    description: 'Time-bound sandbox/evaluation plan with capped enrolled employees.',
    features: ['Up to 25 enrolled employees', 'All Pro verification controls'],
  },
  {
    code: 'CUSTOM',
    name: 'Enterprise Custom Contract',
    suggestedPricePerEmployee: 25,
    description: 'Custom per-employee rate, minimum commitment, setup fee, and optional metered verification rate.',
    features: ['Negotiated unit pricing & minimum fee', 'Custom cloud provider residency (AWS/Azure)'],
  },
];

export const faceAttendBillingService = {
  computePreview: computeFaceAttendBillingAmount,

  async getSubscription(organizationId: string): Promise<FaceAttendSubscription | null> {
    const { data, error } = await supabase
      .from('faceattend_subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      console.warn('[FaceAttendBilling] Subscription read error:', error.message);
      return null;
    }
    return (data as FaceAttendSubscription) || null;
  },

  async saveSubscription(
    organizationId: string,
    payload: Partial<FaceAttendSubscription>,
    actorUserId?: string
  ): Promise<{ ok: boolean; error?: string; data?: FaceAttendSubscription }> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('faceattend_subscriptions')
      .upsert(
        {
          organization_id: organizationId,
          plan_code: payload.plan_code || 'PRO',
          billing_cycle: payload.billing_cycle || 'MONTHLY',
          price_per_employee: Number(payload.price_per_employee ?? 25),
          minimum_monthly_fee: Number(payload.minimum_monthly_fee ?? 0),
          setup_fee: Number(payload.setup_fee ?? 0),
          usage_fee_per_call: Number(payload.usage_fee_per_call ?? 0),
          max_enrolled_employees: payload.max_enrolled_employees ?? null,
          currency_code: payload.currency_code || 'INR',
          status: payload.status || 'ACTIVE',
          trial_ends_at: payload.trial_ends_at ?? null,
          grace_ends_at: payload.grace_ends_at ?? null,
          current_period_start:
            payload.current_period_start || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
          current_period_end:
            payload.current_period_end || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
          notes: payload.notes ?? null,
          updated_by: actorUserId || null,
          updated_at: now,
        },
        { onConflict: 'organization_id' }
      )
      .select('*')
      .single();

    if (error) return { ok: false, error: error.message };

    await supabase.from('faceattend_audit_logs').insert({
      organization_id: organizationId,
      actor_user_id: actorUserId || null,
      event_type: 'SUBSCRIPTION_UPDATED',
      target_type: 'faceattend_subscriptions',
      metadata: {
        plan_code: data.plan_code,
        price_per_employee: data.price_per_employee,
        status: data.status,
      },
    });

    return { ok: true, data: data as FaceAttendSubscription };
  },

  async listSnapshots(organizationId: string): Promise<FaceAttendBillingSnapshot[]> {
    const { data, error } = await supabase
      .from('faceattend_billing_snapshots')
      .select('*')
      .eq('organization_id', organizationId)
      .order('billing_period_start', { ascending: false })
      .limit(24);

    if (error) {
      console.warn('[FaceAttendBilling] Snapshots read error:', error.message);
      return [];
    }
    return (data || []) as FaceAttendBillingSnapshot[];
  },

  async generateImmutableSnapshot(
    organizationId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<{ ok: boolean; snapshot?: FaceAttendBillingSnapshot; error?: string }> {
    const { data, error } = await supabase.rpc('fn_generate_faceattend_billing_snapshot', {
      p_organization_id: organizationId,
      p_period_start: periodStart,
      p_period_end: periodEnd,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true, snapshot: data as FaceAttendBillingSnapshot };
  },

  async markSnapshotStatus(
    snapshotId: string,
    status: 'INVOICED' | 'PAID'
  ): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase
      .from('faceattend_billing_snapshots')
      .update({ snapshot_status: status })
      .eq('id', snapshotId);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },
};

