// src/types/notification.ts
// ============================================================
// WorkForceOS — Unified Realtime Notification & Event Contracts
// ============================================================

export type NotificationCategory =
  | 'APPROVAL'
  | 'SECURITY'
  | 'INTEGRATION'
  | 'PLATFORM'
  | 'BILLING'
  | 'SUPPORT'
  | 'ATTENDANCE'
  | 'PAYROLL'
  | 'SYSTEM';

export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'PUSH' | 'WHATSAPP' | 'SMS';

export type DeliveryStatus = 'PENDING' | 'DELIVERED' | 'READ' | 'DISMISSED' | 'FAILED' | 'EXPIRED';

export type ApprovalType =
  | 'Leave'
  | 'Expense'
  | 'Travel'
  | 'Document'
  | 'ShiftChange'
  | 'PayrollSignoff'
  | 'RoleChange'
  | 'AccessRequest';

export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

/**
 * Standard generic business event emitted across all SaaS modules.
 */
export interface WorkForceEvent {
  eventId: string;
  eventType: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  body: string;
  organizationId?: string;
  recipientUserIds?: string[];
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  resourceType?: string;
  resourceId?: string;
  actionUrl?: string;
  timestamp: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

/**
 * Canonical notification event stored in database.
 */
export interface NotificationRecord {
  id: string;
  organization_id?: string;
  event_type: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  body: string;
  actor_id?: string;
  actor_name?: string;
  actor_avatar?: string;
  resource_type?: string;
  resource_id?: string;
  action_url?: string;
  metadata: Record<string, any>;
  idempotency_key?: string;
  created_at: string;
  expires_at?: string;
  resolved_at?: string;
}

/**
 * Recipient delivery record for a notification.
 */
export interface NotificationDeliveryRecord {
  id: string;
  notification_id: string;
  recipient_user_id: string;
  channel: NotificationChannel;
  status: DeliveryStatus;
  delivered_at?: string;
  read_at?: string;
  dismissed_at?: string;
  failed_at?: string;
  failure_reason?: string;
  created_at: string;
}

/**
 * Hydrated UI Notification Card Model.
 */
export interface HydratedNotificationItem {
  id: string;
  deliveryId: string;
  eventType: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  body: string;
  actorName?: string;
  actorAvatar?: string;
  resourceType?: string;
  resourceId?: string;
  actionUrl?: string;
  isRead: boolean;
  status: DeliveryStatus;
  createdAt: string;
  metadata: Record<string, any>;
  // Grouping metadata
  isGrouped?: boolean;
  groupCount?: number;
}

/**
 * Business Approval Request Model.
 */
export interface ApprovalRequestItem {
  id: string;
  organization_id?: string;
  type: ApprovalType;
  title: string;
  details?: string;
  amount_or_duration?: string;
  status: ApprovalStatus;
  requested_by_id: string;
  requested_by_name: string;
  requested_by_email: string;
  requested_by_avatar?: string;
  department?: string;
  assigned_approver_id?: string;
  assigned_approver_role?: string;
  decision_comment?: string;
  decided_at?: string;
  decided_by_id?: string;
  resource_type: string;
  resource_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * User Channel Notification Preference.
 */
export interface NotificationPreferenceItem {
  id: string;
  user_id: string;
  organization_id?: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

/**
 * Push Subscription Record.
 */
export interface PushSubscriptionItem {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  browser?: string;
  os?: string;
  device?: string;
  created_at: string;
}

/**
 * Notification Telemetry & DLQ Metrics.
 */
export interface NotificationTelemetryMetrics {
  total_created: number;
  total_delivered: number;
  total_unread: number;
  total_failed: number;
  dead_letter_queue_depth: number;
  channels_health: {
    in_app: 'HEALTHY' | 'DEGRADED' | 'DOWN';
    email: 'HEALTHY' | 'DEGRADED' | 'DOWN';
    push: 'HEALTHY' | 'DEGRADED' | 'DOWN';
    whatsapp: 'HEALTHY' | 'DEGRADED' | 'DOWN';
    sms: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  };
  avg_delivery_latency_ms: number;
  active_websocket_subscribers: number;
}
