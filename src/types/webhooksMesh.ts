// src/types/webhooksMesh.ts
// ============================================================
// WorkForceOS — Webhooks & Event Mesh Type Definitions
// ============================================================

export type WebhookEnvironment = 'Production' | 'Staging';

export type WebhookEndpointStatus =
  | 'Active'
  | 'Paused'
  | 'Disabled'
  | 'Failing'
  | 'Rate Limited'
  | 'Pending Verification';

export type DeliveryStatus =
  | 'Queued'
  | 'Processing'
  | 'Delivered'
  | 'Retrying'
  | 'Failed'
  | 'Dead Letter'
  | 'Cancelled';

export type EventStatus = 'Current' | 'Deprecated' | 'Sunset';

export type AuthType =
  | 'HMAC-SHA256'
  | 'Bearer Token'
  | 'API Key'
  | 'Basic Auth'
  | 'OAuth2'
  | 'None';

export type BackoffStrategy = 'exponential' | 'linear' | 'fixed';

export interface EventTypeSchema {
  id: string;
  name: string;
  version: string;
  category:
    | 'Employee'
    | 'Attendance'
    | 'Leave'
    | 'Payroll'
    | 'Organization'
    | 'User'
    | 'Subscription'
    | 'Billing'
    | 'Security'
    | 'Workflow'
    | 'Document'
    | 'AI'
    | 'Integration'
    | 'System';
  description: string;
  payload_schema: Record<string, any>;
  sample_payload: Record<string, any>;
  producer_service: string;
  status: EventStatus;
  is_system: boolean;
  consumers_count: number;
  subscribers_count: number;
  created_at: string;
  deprecated_at?: string;
}

export interface WebhookEndpoint {
  id: string;
  organization_id?: string;
  tenant_name?: string;
  name: string;
  description: string;
  environment: WebhookEnvironment;
  url: string;
  http_method: 'POST' | 'PUT' | 'PATCH';
  status: WebhookEndpointStatus;
  auth_type: AuthType;
  secret_id?: string;
  secret_masked?: string;
  secret_last_rotated?: string;
  timeout_ms: number;
  max_attempts: number;
  backoff_strategy: BackoffStrategy;
  initial_retry_delay_seconds: number;
  max_retry_delay_seconds: number;
  retry_status_codes: number[];
  health_score: number;
  success_rate: number;
  failure_rate: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  last_success_at?: string;
  last_failure_at?: string;
  consecutive_failures: number;
  events: string[];
  ip_allowlist?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  paused_at?: string;
  tls_verified: boolean;
}

export interface WebhookDeliveryAttempt {
  id: string;
  delivery_id: string;
  attempt_number: number;
  request_timestamp: string;
  http_status: number;
  response_time_ms: number;
  request_headers: Record<string, string>;
  response_headers: Record<string, string>;
  response_body?: string;
  error_code?: string;
  error_message?: string;
}

export interface WebhookDelivery {
  id: string;
  event_id: string;
  event_uuid: string;
  event_type: string;
  endpoint_id: string;
  endpoint_name: string;
  tenant_name: string;
  organization_id?: string;
  environment: WebhookEnvironment;
  status: DeliveryStatus;
  attempt_count: number;
  max_attempts: number;
  http_status: number;
  response_time_ms: number;
  last_error_code?: string;
  last_error_message?: string;
  next_retry_at?: string;
  queued_at: string;
  delivered_at?: string;
  failed_at?: string;
  request_headers: Record<string, string>;
  response_headers: Record<string, string>;
  payload: Record<string, any>;
  response_body?: string;
  attempts: WebhookDeliveryAttempt[];
}

export interface DeadLetterEvent {
  id: string;
  event_id: string;
  event_type: string;
  endpoint_id: string;
  endpoint_name: string;
  tenant_name: string;
  organization_id?: string;
  environment: WebhookEnvironment;
  attempt_count: number;
  max_attempts: number;
  last_error: string;
  error_code: string;
  payload: Record<string, any>;
  created_at: string;
  dead_lettered_at: string;
  reason: string;
  status: 'Pending Review' | 'Requeued' | 'Discarded';
}

export interface EventRoute {
  id: string;
  event_type: string;
  source_service: string;
  destination_type: 'internal_consumer' | 'webhook_endpoint' | 'queue' | 'service';
  destination_name: string;
  route_key: string;
  status: 'Active' | 'Degraded' | 'Paused';
  priority: number;
  queue_name: string;
  queue_depth: number;
  lag_ms: number;
  failure_rate_pct: number;
  last_processed_at: string;
}

export interface EventConsumer {
  id: string;
  name: string;
  service_name: string;
  environment: WebhookEnvironment;
  status: 'Healthy' | 'Degraded' | 'Stalled' | 'Offline';
  queue_name: string;
  last_heartbeat_at: string;
  queue_depth: number;
  processing_rate_per_min: number;
  lag_ms: number;
  failure_rate_pct: number;
}

export interface EventMeshMetrics {
  events_per_min: number;
  events_per_min_trend: number;
  delivery_success_pct: number;
  delivery_success_trend: number;
  failed_deliveries_count: number;
  failed_deliveries_trend: number;
  pending_queue_depth: number;
  queue_status: 'Healthy' | 'Backlogged' | 'Stalled';
  active_endpoints_count: number;
  healthy_endpoints_count: number;
  at_risk_endpoints_count: number;
  dead_letter_count: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  last_checked_sec: number;
  mesh_status: 'Operational' | 'Degraded' | 'Critical';
  mesh_status_message: string;
}

export interface FailureGroup {
  id: string;
  endpoint_id: string;
  endpoint_name: string;
  tenant_name: string;
  http_status: number;
  error_type: string;
  count: number;
  first_seen: string;
  last_seen: string;
  sample_delivery_id: string;
}

export interface WebhookAuditLog {
  id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  resource_name?: string;
  tenant_name?: string;
  timestamp: string;
  ip_address: string;
  reason: string;
  changes?: Record<string, { before: any; after: any }>;
}

export interface LiveActivityItem {
  id: string;
  type: 'success' | 'failure' | 'warning' | 'info';
  event_type: string;
  subscribers_count: number;
  tenant_name?: string;
  endpoint_name?: string;
  time_ago: string;
  message: string;
}
