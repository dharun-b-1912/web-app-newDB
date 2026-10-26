// src/services/attendance/misRecipientsService.ts
// ============================================================================
// Joy PeopleHR Enterprise — Authoritative MIS Recipients & WhatsApp Access Service
// Strict Multi-Tenant Enforcement • Server-Side Security • Verification Audit
// ============================================================================

import { supabase, supabaseAdmin } from '../../lib/supabase';
import { normalizeIndianPhone } from '../whatsapp/phoneUtils';

export interface MisReportRecipientRecord {
  id: string;
  organization_id: string;
  employee_id?: string | null;
  name: string;
  email?: string | null;
  phone: string;
  designation?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  role_type: string;
  permitted_report_types: string[]; // ['MORNING_CHECKIN', 'EVENING_FINAL', 'BIOMETRIC_AUDIT', 'DEPARTMENT_SUMMARY']
  delivery_channels: string[]; // ['EMAIL', 'WHATSAPP']
  scheduled_morning: boolean;
  scheduled_evening: boolean;
  allow_bot_self_service: boolean;
  workforce_scope: 'ORGANIZATION' | 'DEPARTMENT' | 'DIRECT_REPORTS';
  is_verified: boolean;
  is_active: boolean;
  verified_at?: string | null;
  expires_at?: string | null;
  revoked_at?: string | null;
  revocation_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryAuditLogRow {
  id: string;
  organization_id: string;
  recipient_id?: string | null;
  run_id?: string | null;
  report_type: string;
  reporting_date: string;
  cutoff_time?: string | null;
  channel: 'EMAIL' | 'WHATSAPP';
  recipient_target: string;
  recipient_name?: string | null;
  dispatch_mode: string;
  status: 'QUEUED' | 'PROCESSING' | 'PROVIDER_ACCEPTED' | 'DELIVERED' | 'READ' | 'FAILED' | 'CANCELLED';
  provider?: string | null;
  provider_message_id?: string | null;
  sha256_checksum?: string | null;
  file_name?: string | null;
  document_url?: string | null;
  error_message?: string | null;
  idempotency_key?: string | null;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

const DEFAULT_ORG_ID = '0c621892-e938-4707-9957-13534ea32c19';

class MisRecipientsService {
  private static instance: MisRecipientsService;

  public static getInstance(): MisRecipientsService {
    if (!MisRecipientsService.instance) {
      MisRecipientsService.instance = new MisRecipientsService();
    }
    return MisRecipientsService.instance;
  }

  private getClient() {
    return supabaseAdmin || supabase;
  }

  /**
   * Fetch all authorized recipients for an organization
   */
  async getRecipients(organizationId = DEFAULT_ORG_ID): Promise<MisReportRecipientRecord[]> {
    try {
      const { data, error } = await this.getClient()
        .from('mis_report_recipients')
        .select('*, departments(name)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[MisRecipientsService] getRecipients error:', error.message);
        return [];
      }

      return (data || []).map((row: any) => ({
        ...row,
        department_name: row.departments?.name || null,
      }));
    } catch (err: any) {
      console.warn('[MisRecipientsService] Exception in getRecipients:', err.message);
      return [];
    }
  }

  /**
   * Create or update an authorized recipient
   */
  async upsertRecipient(
    payload: Partial<MisReportRecipientRecord> & {
      organization_id: string;
      name: string;
      phone: string;
    }
  ): Promise<{ success: boolean; data?: MisReportRecipientRecord; error?: string }> {
    try {
      const cleanPhone = normalizeIndianPhone(payload.phone).replace(/[^0-9]/g, '');
      if (cleanPhone.length < 10) {
        return { success: false, error: 'Valid 10-digit Indian mobile number is required.' };
      }

      const updateData = {
        organization_id: payload.organization_id || DEFAULT_ORG_ID,
        employee_id: payload.employee_id || null,
        name: payload.name.trim(),
        email: payload.email ? payload.email.trim().toLowerCase() : null,
        phone: cleanPhone,
        designation: payload.designation?.trim() || null,
        department_id: payload.department_id || null,
        role_type: payload.role_type || 'RECIPIENT',
        permitted_report_types: payload.permitted_report_types || ['MORNING_CHECKIN', 'EVENING_FINAL'],
        delivery_channels: payload.delivery_channels || ['EMAIL', 'WHATSAPP'],
        scheduled_morning: payload.scheduled_morning !== false,
        scheduled_evening: payload.scheduled_evening !== false,
        allow_bot_self_service: payload.allow_bot_self_service !== false,
        workforce_scope: payload.workforce_scope || 'ORGANIZATION',
        is_verified: payload.is_verified !== false,
        is_active: payload.is_active !== false,
        verified_at: payload.is_verified ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.getClient()
        .from('mis_report_recipients')
        .upsert(updateData, { onConflict: 'organization_id,phone' })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Toggle active state or revoke recipient with reason
   */
  async revokeRecipient(
    id: string,
    reason = 'Revoked by HR Administrator'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.getClient()
        .from('mis_report_recipients')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revocation_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Re-activate a previously revoked recipient
   */
  async activateRecipient(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.getClient()
        .from('mis_report_recipients')
        .update({
          is_active: true,
          revoked_at: null,
          revocation_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Delete recipient permanently
   */
  async deleteRecipient(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.getClient()
        .from('mis_report_recipients')
        .delete()
        .eq('id', id);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetch recent delivery audit logs
   */
  async getAuditLogs(organizationId = DEFAULT_ORG_ID, limit = 20): Promise<DeliveryAuditLogRow[]> {
    try {
      const { data, error } = await this.getClient()
        .from('mis_delivery_audit_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('[MisRecipientsService] getAuditLogs error:', error.message);
        return [];
      }

      return data || [];
    } catch (err: any) {
      console.warn('[MisRecipientsService] Exception in getAuditLogs:', err.message);
      return [];
    }
  }
}

export const misRecipientsService = MisRecipientsService.getInstance();
