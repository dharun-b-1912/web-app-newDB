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
          .from('employee_requests')
          .select('*, employees:employee_id(id, employee_number, first_name, last_name, department)')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const mapped: HelpdeskTicket[] = data.map((r: any) => {
            const emp = r.employees;
            const empName = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee' : 'Employee';
            return {
              id: r.id,
              tenant_id: r.organization_id,
              ticket_number: `REQ-${r.id.length >= 8 ? r.id.substring(0, 8).toUpperCase() : r.id}`,
              employee_id: r.employee_id,
              employee_name: empName,
              department: emp?.department || 'General',
              category: r.request_type || 'General HR',
              subject: r.subject || 'Employee Request',
              description: r.description || '',
              priority: (r.priority as TicketPriority) || 'MEDIUM',
              status: (r.status as TicketStatus) || 'OPEN',
              assigned_to: r.assigned_to,
              created_at: r.created_at,
              updated_at: r.updated_at,
              resolved_at: (r.status === 'RESOLVED' || r.status === 'CLOSED') ? r.updated_at : undefined,
              messages: r.resolution_notes ? [
                {
                  id: `res-${r.id}`,
                  ticket_id: r.id,
                  sender_id: 'hr-rep',
                  sender_name: 'HR Operations',
                  sender_role: 'HR',
                  message: r.resolution_notes,
                  created_at: r.updated_at || r.created_at,
                  visibility: 'EMPLOYEE',
                }
              ] : [],
            };
          });

          this.memoryCache = mapped;
          this.saveLocalStore(mapped, tenantId);
          return mapped;
        }
        if (error) {
          console.warn('[HelpdeskService] employee_requests fetch error:', error);
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
    const ticket = this.memoryCache.find((t) => t.id === ticketId);
    return ticket?.messages || [];
  }

  public async addMessage(
    ticketId: string,
    message: string,
    visibility: 'EMPLOYEE' | 'INTERNAL',
    senderName = 'HR Operations',
    senderRole = 'HR'
  ): Promise<HelpdeskMessage | null> {
    const newMsg: HelpdeskMessage = {
      id: `msg-${Date.now()}`,
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
        await supabase
          .from('employee_requests')
          .update({
            resolution_notes: message,
            status: 'IN_PROGRESS',
            updated_at: new Date().toISOString(),
          })
          .eq('id', ticketId);
      } catch (err) {
        console.warn('[HelpdeskService] addMessage update error:', err);
      }
    }

    const ticket = this.memoryCache.find((t) => t.id === ticketId);
    if (ticket) {
      if (!ticket.messages) ticket.messages = [];
      ticket.messages.push(newMsg);
      ticket.status = 'IN_PROGRESS';
      this.saveLocalStore(this.memoryCache);
    }

    return newMsg;
  }

  public async updateTicketStatus(
    ticketId: string,
    status: TicketStatus,
    resolutionSummary?: string
  ): Promise<boolean> {
    // Canonical employee_requests status must be one of: 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
    let dbStatus = 'OPEN';
    if (status === 'IN_PROGRESS' || status === 'ASSIGNED' || status === 'WAITING_FOR_EMPLOYEE') {
      dbStatus = 'IN_PROGRESS';
    } else if (status === 'RESOLVED') {
      dbStatus = 'RESOLVED';
    } else if (status === 'CLOSED') {
      dbStatus = 'CLOSED';
    }

    const updatePayload: Record<string, any> = {
      status: dbStatus,
      updated_at: new Date().toISOString(),
    };
    if (resolutionSummary) {
      updatePayload.resolution_notes = resolutionSummary;
    }

    if (isSupabaseEnabled) {
      try {
        const { error } = await supabase
          .from('employee_requests')
          .update(updatePayload)
          .eq('id', ticketId);

        if (!error) {
          const ticket = this.memoryCache.find((t) => t.id === ticketId);
          if (ticket) {
            ticket.status = status;
            if (resolutionSummary) {
              if (!ticket.messages) ticket.messages = [];
              ticket.messages.push({
                id: `res-${Date.now()}`,
                ticket_id: ticketId,
                sender_id: 'hr-admin',
                sender_name: 'HR Operations',
                sender_role: 'HR',
                message: resolutionSummary,
                created_at: new Date().toISOString(),
                visibility: 'EMPLOYEE',
              });
            }
            this.saveLocalStore(this.memoryCache);
          }
          return true;
        }
        console.warn('[HelpdeskService] updateStatus error:', error);
      } catch (err) {
        console.warn('[HelpdeskService] updateStatus exception:', err);
      }
    }

    const ticket = this.memoryCache.find((t) => t.id === ticketId);
    if (ticket) {
      ticket.status = status;
      this.saveLocalStore(this.memoryCache);
      return true;
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
        // If assignedTo is a valid UUID, update assigned_to, else just status
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignedTo);
        const updatePayload: Record<string, any> = {
          status: 'IN_PROGRESS',
          updated_at: new Date().toISOString(),
        };
        if (isUuid) {
          updatePayload.assigned_to = assignedTo;
        }

        const { error } = await supabase
          .from('employee_requests')
          .update(updatePayload)
          .eq('id', ticketId);

        if (!error) {
          const ticket = this.memoryCache.find((t) => t.id === ticketId);
          if (ticket) {
            ticket.assigned_to = assignedTo;
            ticket.assigned_name = assignedToName;
            ticket.status = 'ASSIGNED';
            this.saveLocalStore(this.memoryCache);
          }
          return true;
        }
      } catch (err) {
        console.warn('[HelpdeskService] assign error:', err);
      }
    }
    return false;
  }

  public async updatePriority(ticketId: string, priority: TicketPriority): Promise<boolean> {
    const validPriority = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority) ? priority : 'MEDIUM';
    if (isSupabaseEnabled) {
      try {
        const { error } = await supabase
          .from('employee_requests')
          .update({
            priority: validPriority,
            updated_at: new Date().toISOString(),
          })
          .eq('id', ticketId);

        if (!error) {
          const ticket = this.memoryCache.find((t) => t.id === ticketId);
          if (ticket) {
            ticket.priority = priority;
            this.saveLocalStore(this.memoryCache);
          }
          return true;
        }
      } catch (err) {
        console.warn('[HelpdeskService] priority error:', err);
      }
    }
    return false;
  }
}

export const helpdeskService = HelpdeskService.getInstance();

