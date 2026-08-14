// src/services/platform/platformWebhookService.ts
// ============================================================
// WorkForceOS — Outbound Webhooks & HMAC Delivery Service
// ============================================================

import { WebhookEndpoint, WebhookDeliveryItem } from '../../types/platformAdmin';
import { platformAuditService } from './platformAuditService';

const initialEndpoints: WebhookEndpoint[] = [
  { id: 'whk-01', tenant_id: 'org-acme-01', tenant_name: 'Acme Technologies', url: 'https://api.acme.com/webhooks/workforceos', description: 'Real-time employee lifecycle & attendance stream to SAP', events: ['employee.created', 'employee.exited', 'attendance.punched', 'leave.approved'], status: 'Active', success_rate_pct: 99.8, last_delivery_at: '2 mins ago' },
  { id: 'whk-02', tenant_id: 'org-tech-02', tenant_name: 'TechCorp Solutions', url: 'https://hooks.techcorp.in/hrms-listener', description: 'Automated Slack announcements bot for birthdays and anniversaries', events: ['announcement.published', 'employee.joined'], status: 'Active', success_rate_pct: 100.0, last_delivery_at: '1 hr ago' },
  { id: 'whk-03', tenant_id: 'org-zenith-04', tenant_name: 'Zenith Logistics', url: 'https://logistics-hub.zenith.com/api/biometric-push', description: 'Third-party transport routing integration', events: ['attendance.punched'], status: 'Failing', success_rate_pct: 82.4, last_delivery_at: '4 hours ago' },
];

const initialDeliveries: WebhookDeliveryItem[] = [
  { id: 'whd-101', endpoint_id: 'whk-01', event_type: 'employee.created', http_status: 200, latency_ms: 124, status: 'Delivered', attempt_count: 1, delivered_at: '2026-08-14 10:50 AM' },
  { id: 'whd-102', endpoint_id: 'whk-01', event_type: 'attendance.punched', http_status: 200, latency_ms: 88, status: 'Delivered', attempt_count: 1, delivered_at: '2026-08-14 10:48 AM' },
  { id: 'whd-103', endpoint_id: 'whk-03', event_type: 'attendance.punched', http_status: 504, latency_ms: 5000, status: 'Failed', attempt_count: 3, delivered_at: '2026-08-14 06:40 AM', error_message: 'Gateway Timeout (504) after 5000ms' },
];

export const platformWebhookService = {
  getEndpoints(): WebhookEndpoint[] {
    return initialEndpoints;
  },

  getDeliveries(endpointId?: string): WebhookDeliveryItem[] {
    if (endpointId) return initialDeliveries.filter(d => d.endpoint_id === endpointId);
    return initialDeliveries;
  },

  async replayWebhook(deliveryId: string): Promise<WebhookDeliveryItem> {
    const target = initialDeliveries.find(d => d.id === deliveryId);
    if (!target) throw new Error('Delivery not found');

    target.status = 'Delivered';
    target.http_status = 200;
    target.latency_ms = 142;
    target.attempt_count += 1;
    target.error_message = undefined;

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'WEBHOOK_EVENT_REPLAYED',
      resource_type: 'WebhookDelivery',
      resource_id: deliveryId,
      severity: 'Normal',
      reason: `Replayed webhook delivery for event ${target.event_type}`,
    });

    return target;
  },
};
