import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { getActiveOrgId } from '../attendance/biometricCommandService';
import { hrEventBus } from '../hrEventBus';

export interface DigitalLetter {
  id: string;
  letter_number: string;
  tenant_id: string;
  organization_id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  letter_type: string; // OFFER, APPOINTMENT, PROMOTION, INCREMENT, EXPERIENCE, RELIEVING, WARNING
  title: string;
  description?: string;
  document_url?: string;
  file_size_bytes?: number;
  issued_date: string;
  effective_date?: string;
  requires_signature: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ACKNOWLEDGED' | 'SIGNED' | 'REVOKED';
  acknowledged_at?: string;
  signature_data?: string;
  signed_at?: string;
  issued_by_id?: string;
  issued_by_name?: string;
}

const STORAGE_KEY_LETTERS = 'workforceos_digital_letters_v1';

class DigitalLetterService {
  private memoryCache: DigitalLetter[] = [];

  private getStorageKey(tenantId = getActiveOrgId()): string {
    return `${STORAGE_KEY_LETTERS}_${tenantId}`;
  }

  private loadLocalStore(tenantId = getActiveOrgId()): DigitalLetter[] {
    try {
      const raw = localStorage.getItem(this.getStorageKey(tenantId));
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [];
  }

  private saveLocalStore(items: DigitalLetter[], tenantId = getActiveOrgId()): void {
    try {
      localStorage.setItem(this.getStorageKey(tenantId), JSON.stringify(items));
    } catch (_) {}
  }

  public async fetchLetters(tenantId = getActiveOrgId()): Promise<DigitalLetter[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('digital_letters')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('issued_date', { ascending: false });

        if (!error && data !== null) {
          this.memoryCache = data;
          this.saveLocalStore(data, tenantId);
          return data;
        }
      } catch (err) {
        console.warn('[DigitalLetterService] DB query notice:', err);
      }
    }
    const local = this.loadLocalStore(tenantId);
    this.memoryCache = local;
    return local;
  }

  public async acknowledgeLetter(
    letterId: string,
    signatureData?: string,
    tenantId = getActiveOrgId()
  ): Promise<void> {
    const list = this.memoryCache.length > 0 ? this.memoryCache : this.loadLocalStore(tenantId);
    const targetStatus = signatureData ? ('SIGNED' as const) : ('ACKNOWLEDGED' as const);
    const updated = list.map((l) =>
      l.id === letterId
        ? {
            ...l,
            status: targetStatus,
            acknowledged_at: new Date().toISOString(),
            signature_data: signatureData,
            signed_at: signatureData ? new Date().toISOString() : undefined,
          }
        : l
    );
    this.memoryCache = updated;
    this.saveLocalStore(updated, tenantId);

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('digital_letters')
          .update({
            status: signatureData ? 'SIGNED' : 'ACKNOWLEDGED',
            acknowledged_at: new Date().toISOString(),
            signature_data: signatureData,
            signed_at: signatureData ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', letterId);

        await supabase.from('realtime_outbox').insert({
          tenant_id: tenantId,
          entity_type: 'digital_letters',
          entity_id: letterId,
          action: 'UPDATE',
          payload: { id: letterId, status: signatureData ? 'SIGNED' : 'ACKNOWLEDGED' },
        });
      } catch (err) {
        console.warn('[DigitalLetterService] acknowledge DB notice:', err);
      }
    }

    hrEventBus.publish('letter.acknowledged' as any, { letterId });
  }
}

export const digitalLetterService = new DigitalLetterService();
