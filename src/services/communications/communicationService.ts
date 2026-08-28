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

        if (data && data.length > 0) {
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
