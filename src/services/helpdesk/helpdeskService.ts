import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { getActiveOrgId } from '../attendance/biometricCommandService';
import { HelpdeskTicket, HelpdeskMessage, TicketStatus, TicketPriority } from '../../types/employeeRelations';

class HelpdeskService {
  private static instance: HelpdeskService;
  private memoryCache: HelpdeskTicket[] = [];

  private constructor() {}

  public static getInstance(): HelpdeskService {
    if (!HelpdeskService.instance) {
      HelpdeskService.instance = new HelpdeskService();
    }
    return HelpdeskService.instance;
  }

  private getStorageKey(tenantId = getActiveOrgId()): string {
    return `joy_helpdesk_tickets_${tenantId}`;
  }

  private loadLocalStore(tenantId = getActiveOrgId()): HelpdeskTicket[] {
    try {
      const raw = localStorage.getItem(this.getStorageKey(tenantId));
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [];
  }

  private saveLocalStore(items: HelpdeskTicket[], tenantId = getActiveOrgId()): void {
    try {
      localStorage.setItem(this.getStorageKey(tenantId), JSON.stringify(items));
    } catch (_) {}
  }

  public async fetchTickets(tenantId = getActiveOrgId()): Promise<HelpdeskTicket[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('helpdesk_tickets')
          .select('*')
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          this.memoryCache = data;
          this.saveLocalStore(data, tenantId);
          return data;
        }
        if (error) {
          console.warn('[HelpdeskService] fetch error:', error);
        }
      } catch (err) {
        console.warn('[HelpdeskService] Supabase query notice:', err);
      }
    }
    const local = this.loadLocalStore(tenantId);
    this.memoryCache = local;
    return local;
  }

  public async fetchTicketMessages(ticketId: string): Promise<HelpdeskMessage[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('helpdesk_messages')
          .select('*')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true });

        if (data) return data;
        if (error) console.warn('[HelpdeskService] fetchMessages error:', error);
      } catch (err) {
        console.warn('[HelpdeskService] Messages fetch notice:', err);
      }
    }
    return [];
  }

  public async addMessage(
    ticketId: string,
    message: string,
    visibility: 'EMPLOYEE' | 'INTERNAL',
    senderName = 'HR Operations',
    senderRole = 'HR'
  ): Promise<HelpdeskMessage | null> {
    const newMsg: Partial<HelpdeskMessage> = {
      ticket_id: ticketId,
      sender_id: 'hr-rep-01',
      sender_name: senderName,
      sender_role: senderRole as any,
      message,
      visibility,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('helpdesk_messages')
          .insert([newMsg])
          .select()
          .single();

        if (data) {
          // If public message, update first_response_at or ticket status
          if (visibility === 'EMPLOYEE') {
            await supabase
              .from('helpdesk_tickets')
              .update({
                status: 'IN_PROGRESS',
                first_response_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', ticketId);
          }
          return data;
        }
        if (error) console.warn('[HelpdeskService] insert message error:', error);
      } catch (err) {
        console.warn('[HelpdeskService] addMessage error:', err);
      }
    }
    return null;
  }

  public async updateTicketStatus(
    ticketId: string,
    status: TicketStatus,
    resolutionSummary?: string
  ): Promise<boolean> {
    const updatePayload: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'RESOLVED') {
      updatePayload.resolved_at = new Date().toISOString();
      if (resolutionSummary) updatePayload.resolution_summary = resolutionSummary;
    } else if (status === 'CLOSED') {
      updatePayload.closed_at = new Date().toISOString();
    }

    if (isSupabaseEnabled) {
      try {
        const { error } = await supabase
          .from('helpdesk_tickets')
          .update(updatePayload)
          .eq('id', ticketId);

        if (!error) return true;
        console.warn('[HelpdeskService] updateStatus error:', error);
      } catch (err) {
        console.warn('[HelpdeskService] updateStatus exception:', err);
      }
    }
    return false;
  }

  public async assignTicket(
    ticketId: string,
    assignedTo: string,
    assignedToName: string
  ): Promise<boolean> {
    if (isSupabaseEnabled) {
      try {
        const { error } = await supabase
          .from('helpdesk_tickets')
          .update({
            assigned_to: assignedTo,
            assigned_to_name: assignedToName,
            status: 'ASSIGNED',
            updated_at: new Date().toISOString(),
          })
          .eq('id', ticketId);

        if (!error) return true;
      } catch (err) {
        console.warn('[HelpdeskService] assign error:', err);
      }
    }
    return false;
  }

  public async updatePriority(ticketId: string, priority: TicketPriority): Promise<boolean> {
    if (isSupabaseEnabled) {
      try {
        const { error } = await supabase
          .from('helpdesk_tickets')
          .update({
            priority,
            updated_at: new Date().toISOString(),
          })
          .eq('id', ticketId);

        if (!error) return true;
      } catch (err) {
        console.warn('[HelpdeskService] priority error:', err);
      }
    }
    return false;
  }
}

export const helpdeskService = HelpdeskService.getInstance();
