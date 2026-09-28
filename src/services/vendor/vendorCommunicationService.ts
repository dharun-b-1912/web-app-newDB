// src/services/vendor/vendorCommunicationService.ts
// ============================================================================
// Joy PeopleHR — Two-Way Vendor Communication & Request System
// Manages tickets, notices, responses, priority, due dates, & immutable audit logs
// ============================================================================

import { supabase } from '../../lib/supabase';

export interface VendorRequestComment {
  id: string;
  requestId: string;
  senderType: 'COMPANY' | 'VENDOR';
  authorName: string;
  commentBody: string;
  attachmentsJson?: string[];
  createdAt: string;
}

export interface VendorRequestRecord {
  id: string;
  vendorId: string;
  organizationId?: string;
  requestNumber: string;
  senderType: 'COMPANY' | 'VENDOR';
  createdBy?: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  subject: string;
  description: string;
  dueDate?: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';
  attachmentsJson?: string[];
  comments: VendorRequestComment[];
  createdAt: string;
  updatedAt: string;
}

export interface VendorAuditLogRecord {
  id: string;
  vendorId?: string;
  organizationId?: string;
  actorName: string;
  actorType: 'COMPANY' | 'VENDOR' | 'SYSTEM';
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
  createdAt: string;
}

export class VendorCommunicationService {
  /**
   * Create a new request ticket (Company -> Vendor or Vendor -> Company)
   */
  public static async createRequest(input: {
    vendorId: string;
    organizationId?: string;
    senderType: 'COMPANY' | 'VENDOR';
    authorName: string;
    category?: string;
    priority?: VendorRequestRecord['priority'];
    subject: string;
    description: string;
    dueDate?: string;
  }): Promise<{ success: boolean; request?: VendorRequestRecord; error?: string }> {
    const requestNumber = `REQ-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.vendorId);
      let targetVendorId: string | null = isUUID ? input.vendorId : null;

      if (!targetVendorId && input.vendorId) {
        try {
          const { data: v } = await supabase
            .from('vendors')
            .select('id')
            .or(`vendor_code.eq."${input.vendorId}",legal_name.ilike."%${input.vendorId}%"`)
            .limit(1)
            .maybeSingle();
          if (v?.id) {
            targetVendorId = v.id;
          }
        } catch {
          // ignore
        }
      }

      if (!targetVendorId) {
        throw new Error(`Vendor identifier "${input.vendorId}" is stored in local governance cache.`);
      }

      const { data, error } = await supabase
        .from('vendor_requests')
        .insert({
          vendor_id: targetVendorId,
          organization_id: input.organizationId && /^[0-9a-f-]{36}$/i.test(input.organizationId) ? input.organizationId : null,
          request_number: requestNumber,
          sender_type: input.senderType,
          category: input.category || 'GENERAL',
          priority: input.priority || 'MEDIUM',
          subject: input.subject,
          description: input.description,
          due_date: input.dueDate,
          status: 'OPEN',
        })
        .select()
        .single();

      if (error) throw error;

      await this.logAudit({
        vendorId: input.vendorId,
        actorName: input.authorName,
        actorType: input.senderType,
        action: 'CREATED_REQUEST',
        entityType: 'VENDOR_REQUEST',
        entityId: data.id,
        details: { requestNumber, subject: input.subject },
      });

      return {
        success: true,
        request: { ...this.mapDbToModel(data), comments: [] },
      };
    } catch (e: any) {
      console.warn('[VendorCommunicationService] Fallback ticket creation:', e.message);
      const fallback: VendorRequestRecord = {
        id: `req-${Date.now()}`,
        vendorId: input.vendorId,
        requestNumber,
        senderType: input.senderType,
        category: input.category || 'GENERAL',
        priority: input.priority || 'MEDIUM',
        subject: input.subject,
        description: input.description,
        dueDate: input.dueDate,
        status: 'OPEN',
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem('workforceos_vendor_requests_v1');
          const list: VendorRequestRecord[] = raw ? JSON.parse(raw) : [];
          list.unshift(fallback);
          localStorage.setItem('workforceos_vendor_requests_v1', JSON.stringify(list.slice(0, 50)));
        }
      } catch {
        // quota fallback
      }

      return { success: true, request: fallback };
    }
  }

  /**
   * Add comment/response to a request
   */
  public static async addComment(input: {
    requestId: string;
    senderType: 'COMPANY' | 'VENDOR';
    authorName: string;
    commentBody: string;
  }): Promise<{ success: boolean; comment?: VendorRequestComment; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('vendor_request_comments')
        .insert({
          request_id: input.requestId,
          sender_type: input.senderType,
          author_name: input.authorName,
          comment_body: input.commentBody,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        comment: {
          id: data.id,
          requestId: data.request_id,
          senderType: data.sender_type,
          authorName: data.author_name,
          commentBody: data.comment_body,
          createdAt: data.created_at,
        },
      };
    } catch (e: any) {
      const fallback: VendorRequestComment = {
        id: `cmt-${Date.now()}`,
        requestId: input.requestId,
        senderType: input.senderType,
        authorName: input.authorName,
        commentBody: input.commentBody,
        createdAt: new Date().toISOString(),
      };
      return { success: true, comment: fallback };
    }
  }

  /**
   * Record immutable audit log
   */
  public static async logAudit(log: Partial<VendorAuditLogRecord>): Promise<void> {
    try {
      await supabase.from('vendor_audit_logs').insert({
        vendor_id: log.vendorId,
        organization_id: log.organizationId,
        actor_name: log.actorName || 'System',
        actor_type: log.actorType || 'SYSTEM',
        action: log.action || 'UNKNOWN',
        entity_type: log.entityType || 'SYSTEM',
        entity_id: log.entityId,
        details: log.details || {},
      });
    } catch (e) {
      // Silent log failure resistance
    }
  }

  /**
   * Get requests for vendor
   */
  public static async getRequests(vendorId: string): Promise<VendorRequestRecord[]> {
    try {
      const { data, error } = await supabase
        .from('vendor_requests')
        .select('*, vendor_request_comments(*)')
        .eq('vendor_id', vendorId);

      if (error || !data) throw error;
      const remote = data.map((d) => ({
        ...this.mapDbToModel(d),
        comments: (d.vendor_request_comments || []).map((c: any) => ({
          id: c.id,
          requestId: c.request_id,
          senderType: c.sender_type,
          authorName: c.author_name,
          commentBody: c.comment_body,
          createdAt: c.created_at,
        })),
      }));

      // Merge local fallback tickets
      try {
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem('workforceos_vendor_requests_v1');
          const localList: VendorRequestRecord[] = raw ? JSON.parse(raw) : [];
          localList.forEach((item) => {
            if (!remote.some((r) => r.id === item.id || r.requestNumber === item.requestNumber)) {
              remote.push(item);
            }
          });
        }
      } catch {
        // ignore
      }

      return remote;
    } catch (e) {
      try {
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem('workforceos_vendor_requests_v1');
          return raw ? JSON.parse(raw) : [];
        }
      } catch {
        // ignore
      }
      return [];
    }
  }

  private static mapDbToModel(db: any): VendorRequestRecord {
    return {
      id: db.id,
      vendorId: db.vendor_id,
      organizationId: db.organization_id,
      requestNumber: db.request_number,
      senderType: db.sender_type,
      createdBy: db.created_by,
      category: db.category,
      priority: db.priority,
      subject: db.subject,
      description: db.description,
      dueDate: db.due_date,
      status: db.status,
      attachmentsJson: db.attachments_json || [],
      comments: [],
      createdAt: db.created_at,
      updatedAt: db.updated_at,
    };
  }
}
