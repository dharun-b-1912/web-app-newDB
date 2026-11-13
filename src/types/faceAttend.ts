// src/types/faceAttend.ts
import type {
  FaceAttendDecision,
  FaceAttendPolicyConfig,
  GeofenceMode,
  ProviderPreference,
} from '../../supabase/functions/face-attend-verify/policy';

export type {
  FaceAttendDecision,
  FaceAttendPolicyConfig,
  GeofenceMode,
  ProviderPreference,
};

export type FaceAttendPlanCode = 'BASIC' | 'PRO' | 'ENTERPRISE' | 'CUSTOM' | 'TRIAL';
export type FaceAttendBillingCycle = 'MONTHLY' | 'ANNUAL';
export type FaceAttendSubscriptionStatus =
  | 'ACTIVE'
  | 'TRIAL'
  | 'GRACE'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'EXPIRED';

export type FaceAttendEnrolmentStatus =
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'REJECTED'
  | 'REVOKED'
  | 'DELETED';

export interface FaceAttendEntitlement {
  id: string;
  organization_id: string;
  addon_key: 'face_attend';
  is_enabled: boolean;
  plan_tier: string;
  max_units?: number | null;
  max_workers?: number | null;
  config_json: Record<string, any>;
  enabled_at?: string | null;
  disabled_at?: string | null;
  updated_at: string;
}

export interface FaceAttendOrgSettings extends FaceAttendPolicyConfig {
  organization_id: string;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FaceAttendSubscription {
  organization_id: string;
  plan_code: FaceAttendPlanCode;
  billing_cycle: FaceAttendBillingCycle;
  price_per_employee: number;
  minimum_monthly_fee: number;
  setup_fee: number;
  usage_fee_per_call: number;
  max_enrolled_employees: number | null;
  currency_code: string;
  status: FaceAttendSubscriptionStatus;
  trial_ends_at?: string | null;
  grace_ends_at?: string | null;
  current_period_start: string;
  current_period_end: string;
  notes?: string | null;
  updated_at?: string;
}

export interface FaceAttendBillingSnapshot {
  id: string;
  organization_id: string;
  billing_period_start: string;
  billing_period_end: string;
  snapshot_status: 'FINALIZED' | 'INVOICED' | 'PAID';
  plan_code_snapshot: string;
  billing_cycle_snapshot: string;
  active_enrolled_count: number;
  verified_checks_count: number;
  failed_checks_count: number;
  unit_price_snapshot: number;
  minimum_fee_snapshot: number;
  setup_fee_snapshot: number;
  usage_charges_snapshot: number;
  subtotal_amount: number;
  currency_code: string;
  pricing_rule_snapshot: Record<string, any>;
  finalized_at: string;
}

export interface FaceAttendTemplateRecord {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  department?: string;
  employee_avatar_url?: string | null;
  primary_image_path?: string | null;
  liveness_audit_paths?: string[];
  enrolment_status: FaceAttendEnrolmentStatus;
  capture_method: 'SELF' | 'SUPERVISOR_ASSISTED' | 'ADMIN';
  template_version: number;
  provider_code: string;
  quality_score: number | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  revocation_reason?: string | null;
  consent_status?: 'GRANTED' | 'WITHDRAWN' | 'NONE';
  consent_version?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FaceAttendAttemptRecord {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  punch_type: 'CHECK_IN' | 'CHECK_OUT';
  decision: FaceAttendDecision;
  face_similarity_score: number | null;
  liveness_score: number | null;
  liveness_passed: boolean;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy_meters: number | null;
  is_mock_location: boolean;
  work_location_id: string | null;
  work_location_name?: string | null;
  distance_meters: number | null;
  geofence_passed: boolean;
  provider_code: string;
  is_production_biometric: boolean;
  policy_version_applied: number;
  correlation_id: string;
  attendance_punch_id: string | null;
  attendance_daily_id: string | null;
  is_offline_sync: boolean;
  failure_reason: string | null;
  created_at: string;
}

export interface FaceAttendExceptionReview {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  attempt_id: string | null;
  requested_punch_type: 'CHECK_IN' | 'CHECK_OUT';
  fallback_reason: string;
  latitude: number | null;
  longitude: number | null;
  work_location_id: string | null;
  distance_meters: number | null;
  review_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  committed_punch_id: string | null;
  created_at: string;
}

export interface FaceAttendAuditLog {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  actor_employee_id: string | null;
  event_type: string;
  target_type: string;
  target_id: string | null;
  correlation_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface FaceAttendEngineDiagnostics {
  endpoint_host: string | null;
  api_key_configured: boolean;
  save_images_to_db_policy: string;
  storage_bucket: string;
  total_active_templates: number;
  total_attempts_24h: number;
}

export interface FaceAttendEngineStatus {
  provider_code: 'COMPREFACE' | 'AWS_REKOGNITION' | 'AZURE_FACE' | 'HTTP_WEBHOOK' | 'SANDBOX_CHALLENGE';
  provider_label: string;
  mode: 'SELF_HOSTED_DOCKER' | 'CLOUD_AI' | 'WEBHOOK' | 'SANDBOX';
  healthy: boolean;
  latency_ms: number | null;
  message: string;
  checked_at: string;
  diagnostics?: FaceAttendEngineDiagnostics;
}


