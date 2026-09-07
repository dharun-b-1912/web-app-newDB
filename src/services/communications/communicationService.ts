import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { getActiveOrgId } from '../attendance/biometricCommandService';
import { Communication, CommunicationStatus } from '../../types/employeeRelations';

class CommunicationService {
  private static instance: CommunicationService;

  private constructor() {}

  public static getInstance(): CommunicationService {
    if (!CommunicationService.instance) {
      CommunicationService.instance = new CommunicationService();
    }
    return CommunicationService.instance;
  }

  public async fetchCommunications(_tenantId = getActiveOrgId()): Promise<Communication[]> {
    try {
      const raw = localStorage.getItem('workforce_communications_v2');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // Safe empty state
    }
    return [];
  }

  public async createOrUpdateCommunication(
    comm: Partial<Communication>,
    tenantId = getActiveOrgId()
  ): Promise<Communication | null> {
    const id = comm.id || `comm-${Date.now()}`;
    const payload: Communication = {
      id,
      tenant_id: tenantId,
      title: comm.title || 'Announcement',
      body: comm.body || '',
      communication_type: comm.communication_type || 'ANNOUNCEMENT',
      priority: comm.priority || 'NORMAL',
      status: comm.status || 'PUBLISHED',
      audience_type: comm.audience_type || 'ALL',
      target_departments: comm.target_departments || [],
      target_locations: comm.target_locations || [],
      target_designations: comm.target_designations || [],
      requires_acknowledgement: comm.requires_acknowledgement ?? false,
      author_name: comm.author_name || 'HR Management',
      publish_at: comm.publish_at || new Date().toISOString(),
      expires_at: comm.expires_at,
      attachments: comm.attachments || [],
      created_at: comm.created_at || new Date().toISOString(),
    };

    try {
      const existing = await this.fetchCommunications(tenantId);
      const idx = existing.findIndex(c => c.id === id);
      if (idx >= 0) {
        existing[idx] = payload;
      } else {
        existing.unshift(payload);
      }
      localStorage.setItem('workforce_communications_v2', JSON.stringify(existing));
    } catch {}

    if (isSupabaseEnabled) {
      // Dispatch to canonical notification_events table for real-time in-app broadcast banner
      try {
        await supabase.from('notification_events').insert([
          {
            organization_id: (tenantId && tenantId.length === 36 && tenantId !== '00000000-0000-0000-0000-000000000000') ? tenantId : '0c621892-e938-4707-9957-13534ea32c19',
            recipient_user_id: null,
            channel: 'IN_APP',
            title: `Announcement: ${comm.title}`,
            message: (comm.body || '').substring(0, 200),
            action_url: '/announcements',
            is_read: false,
          },
        ]);
      } catch (notifErr) {
        console.warn('[CommunicationService] notification_events sync notice:', notifErr);
      }
    }

    return payload;
  }

  public async updateStatus(id: string, status: CommunicationStatus): Promise<boolean> {
    try {
      const existing = await this.fetchCommunications();
      const item = existing.find(c => c.id === id);
      if (item) {
        item.status = status;
        localStorage.setItem('workforce_communications_v2', JSON.stringify(existing));
        return true;
      }
    } catch {}
    return false;
  }
}

export const communicationService = CommunicationService.getInstance();
