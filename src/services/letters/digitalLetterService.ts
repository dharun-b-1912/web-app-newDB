import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { getActiveOrgId } from '../attendance/biometricCommandService';
import { hrEventBus } from '../hrEventBus';
import { supabaseStorageEngine } from '../document/supabaseStorageEngine';
import { notificationService } from '../notification/notificationService';

export interface DigitalLetter {
  id: string;
  letter_number?: string;
  tenant_id: string;
  organization_id: string;
  company_id?: string;
  employee_id: string;
  employee_code?: string;
  employee_name?: string;
  letter_type: string; // OFFER, APPOINTMENT, PROMOTION, INCREMENT, EXPERIENCE, RELIEVING, WARNING
  title: string;
  description?: string;
  storage_bucket: string;
  storage_path: string;
  document_url?: string;
  file_name?: string;
  file_size_bytes?: number;
  issued_date: string;
  effective_date?: string;
  requires_signature?: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ACKNOWLEDGED' | 'SIGNED' | 'REVOKED' | 'ACTIVE';
  acknowledged_at?: string;
  signature_data?: string;
  signed_at?: string;
  issued_by_id?: string;
  issued_by_name?: string;
}

class DigitalLetterService {
  private memoryCache: DigitalLetter[] = [];

  /**
   * Fetch digital letters from canonical public.employee_documents table
   */
  public async fetchLetters(orgId = getActiveOrgId(), employeeId?: string): Promise<DigitalLetter[]> {
    if (isSupabaseEnabled) {
      try {
        let query = supabase
          .from('employee_documents')
          .select(`
            id,
            tenant_id,
            organization_id,
            company_id,
            employee_id,
            letter_type,
            title,
            name,
            file_name,
            storage_bucket,
            storage_path,
            file_size_bytes,
            status,
            verification_status,
            issued_by_id,
            issued_date,
            created_at,
            employees (
              id,
              employee_code,
              first_name,
              last_name
            )
          `)
          .eq('is_digital_letter', true)
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false });

        if (employeeId) {
          query = query.eq('employee_id', employeeId);
        }

        const { data, error } = await query;

        if (!error && data !== null) {
          const mapped: DigitalLetter[] = data.map((doc: any) => {
            const emp = doc.employees;
            const empName = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : '';
            return {
              id: doc.id,
              tenant_id: doc.tenant_id || orgId,
              organization_id: doc.organization_id,
              company_id: doc.company_id,
              employee_id: doc.employee_id,
              employee_code: emp?.employee_code || '',
              employee_name: empName,
              letter_type: doc.letter_type || 'OFFER',
              title: doc.title || doc.name || doc.file_name || 'Official Letter',
              storage_bucket: doc.storage_bucket || 'employee-letters',
              storage_path: doc.storage_path,
              file_name: doc.file_name,
              file_size_bytes: doc.file_size_bytes,
              issued_date: doc.issued_date || doc.created_at,
              status: doc.status === 'SIGNED' ? 'SIGNED' : 'ACTIVE',
              issued_by_id: doc.issued_by_id,
            };
          });

          this.memoryCache = mapped;
          return mapped;
        }
      } catch (err) {
        console.warn('[DigitalLetterService] DB query notice:', err);
      }
    }
    return this.memoryCache;
  }

  /**
   * Issue a new official HR digital letter
   */
  public async issueLetter(params: {
    organizationId: string;
    employeeId: string;
    letterType: string;
    title: string;
    file: Blob | File;
    fileName: string;
    issuedById?: string;
  }): Promise<DigitalLetter> {
    const uploadRes = await supabaseStorageEngine.uploadFile({
      organizationId: params.organizationId,
      employeeId: params.employeeId,
      category: 'letters',
      fileName: params.fileName,
      file: params.file,
    });

    const docInsert = {
      organization_id: params.organizationId,
      employee_id: params.employeeId,
      is_digital_letter: true,
      letter_type: params.letterType,
      title: params.title,
      name: params.title,
      file_name: params.fileName,
      storage_bucket: uploadRes.storageBucket,
      storage_path: uploadRes.storagePath,
      file_size_bytes: uploadRes.fileSizeBytes,
      mime_type: 'application/pdf',
      status: 'ACTIVE',
      verification_status: 'VERIFIED',
      issued_by_id: params.issuedById,
      issued_date: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('employee_documents')
      .insert(docInsert)
      .select()
      .single();

    if (error) {
      // Rollback uploaded storage object on DB error
      await supabaseStorageEngine.deleteFile(uploadRes.storageBucket, uploadRes.storagePath);
      throw new Error(`Failed to record letter metadata: ${error.message}`);
    }

    hrEventBus.publish('letter.issued' as any, { letterId: data.id });

    // Emit in-app notification to employee
    notificationService.emitEmployeeNotification({
      employeeId: params.employeeId,
      organizationId: params.organizationId,
      title: `Official Letter Issued: ${params.title}`,
      message: `An official HR letter (${params.letterType}) has been issued to your profile.`,
      actionUrl: '/letters',
    }).catch(() => {});

    return {
      id: data.id,
      tenant_id: params.organizationId,
      organization_id: params.organizationId,
      employee_id: params.employeeId,
      letter_type: params.letterType,
      title: params.title,
      storage_bucket: uploadRes.storageBucket,
      storage_path: uploadRes.storagePath,
      file_size_bytes: uploadRes.fileSizeBytes,
      issued_date: docInsert.issued_date,
      status: 'ACTIVE',
      issued_by_id: params.issuedById,
    };
  }

  /**
   * Generate short-lived signed URL for letter viewing
   */
  public async getLetterSignedUrl(storageBucket: string, storagePath: string): Promise<string> {
    const res = await supabaseStorageEngine.createSignedUrl(storageBucket, storagePath, 3600);
    return res.signedUrl;
  }

  /**
   * Acknowledge/Sign an issued letter
   */
  public async acknowledgeLetter(
    letterId: string,
    signatureData?: string,
    orgId = getActiveOrgId()
  ): Promise<void> {
    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('employee_documents')
          .update({
            status: signatureData ? 'SIGNED' : 'ACKNOWLEDGED',
            updated_at: new Date().toISOString(),
          })
          .eq('id', letterId);
      } catch (err) {
        console.warn('[DigitalLetterService] acknowledge DB notice:', err);
      }
    }

    hrEventBus.publish('letter.acknowledged' as any, { letterId });
  }
}

export const digitalLetterService = new DigitalLetterService();
