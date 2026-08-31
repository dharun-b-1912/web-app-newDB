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

  public async fetchCommunications(tenantId = getActiveOrgId()): Promise<Communication[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('communications')
          .select('*')
          .order('publish_at', { ascending: false });

        if (!error && data !== null) {
          // Enrich with real recipients analytics
          const enriched = await Promise.all(
            data.map(async (comm) => {
              const { data: recs } = await supabase
                .from('communication_recipients')
                .select('read_at, acknowledged_at')
                .eq('communication_id', comm.id);

              const total = recs?.length || 0;
              const read = recs?.filter((r) => r.read_at).length || 0;
              const ack = recs?.filter((r) => r.acknowledged_at).length || 0;

              return {
                ...comm,
                recipients_count: total,
                delivered_count: total,
                read_count: read,
                acknowledged_count: ack,
              };
            })
          );
          return enriched;
        }
        if (error) console.warn('[CommunicationService] fetch error:', error);
      } catch (err) {
        console.warn('[CommunicationService] notice:', err);
      }
    }
    return [];
  }

  public async createOrUpdateCommunication(
    comm: Partial<Communication>,
    tenantId = getActiveOrgId()
  ): Promise<Communication | null> {
    const payload = {
      tenant_id: tenantId,
      organization_id: tenantId,
      title: comm.title,
      body: comm.body,
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
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled) {
      try {
        let res;
        if (comm.id) {
          res = await supabase
            .from('communications')
            .update(payload)
            .eq('id', comm.id)
            .select()
            .single();
        } else {
          res = await supabase
            .from('communications')
            .insert([payload])
            .select()
            .single();
        }

        // Also sync to company_announcements table (consumed by Flutter Mobile App)
        try {
          await supabase.from('company_announcements').insert([
            {
              title: comm.title || 'Company Announcement',
              summary: (comm.body || '').substring(0, 150),
              body: comm.body || '',
              category: comm.communication_type || 'COMPANY_NEWS',
              priority: comm.priority === 'URGENT' ? 'URGENT' : (comm.priority === 'IMPORTANT' ? 'HIGH' : 'NORMAL'),
              target_scope: comm.audience_type || 'ALL',
              published_by_name: comm.author_name || 'HR Management',
              is_pinned: comm.priority === 'URGENT' || comm.priority === 'IMPORTANT',
              published_at: comm.publish_at || new Date().toISOString(),
              status: comm.status || 'PUBLISHED',
            },
          ]);
        } catch (annErr) {
          console.warn('[CommunicationService] company_announcements sync notice:', annErr);
        }

        // Also dispatch to notification_events for real-time Flutter push banner
        try {
          await supabase.from('notification_events').insert([
            {
              event_type: 'COMPANY_ANNOUNCEMENT',
              category: 'BROADCAST',
              severity: comm.priority === 'URGENT' ? 'CRITICAL' : 'INFO',
              title: `Announcement: ${comm.title}`,
              body: (comm.body || '').substring(0, 120),
              actor_name: comm.author_name || 'HR Management',
              metadata: {
                communication_type: comm.communication_type,
                priority: comm.priority,
              },
            },
          ]);
        } catch (notifErr) {
          console.warn('[CommunicationService] notification_events sync notice:', notifErr);
        }

        if (res.data) return res.data;
      } catch (err) {
        console.warn('[CommunicationService] save error:', err);
      }
    }
    return null;
  }

  public async updateStatus(id: string, status: CommunicationStatus): Promise<boolean> {
    if (isSupabaseEnabled) {
      try {
        const { error } = await supabase
          .from('communications')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', id);

        return !error;
      } catch (_) {}
    }
    return false;
  }
}

export const communicationService = CommunicationService.getInstance();
