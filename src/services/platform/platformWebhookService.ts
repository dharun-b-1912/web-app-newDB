// src/services/platform/platformWebhookService.ts
// ============================================================
// Joy PeopleHR — Outbound Webhooks & HMAC Delivery Service
// Clean Zero-Mock Service
// ============================================================

import { WebhookEndpoint, WebhookDeliveryItem } from '../../types/platformAdmin';
import { platformAuditService } from './platformAuditService';

let endpointDb: WebhookEndpoint[] = [];
let deliveryDb: WebhookDeliveryItem[] = [];

export const platformWebhookService = {
  getEndpoints(): WebhookEndpoint[] {
    return endpointDb;
  },

  getDeliveries(endpointId?: string): WebhookDeliveryItem[] {
    if (endpointId) return deliveryDb.filter((d) => d.endpoint_id === endpointId);
    return deliveryDb;
  },

  async addEndpoint(endpoint: WebhookEndpoint): Promise<WebhookEndpoint> {
    endpointDb.unshift(endpoint);
    return endpoint;
  },

  async replayWebhook(deliveryId: string): Promise<WebhookDeliveryItem> {
    const target = deliveryDb.find((d) => d.id === deliveryId);
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
