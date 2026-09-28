// ============================================================================
// Service: Statutory Onboarding & Compliance Service
// Real Supabase Database CRUD — Zero LocalStorage, Zero Hardcoded Fallbacks
// ============================================================================

import { supabase } from '../../lib/supabase';
import {
  OnboardingInvitation,
  StatutoryNominee,
  PfDeclarationData,
  AppointmentOrderData,
  StatutoryFormType,
} from '../../types/statutoryForms';
import { Employee } from '../../types';

export class StatutoryOnboardingService {
  /**
   * Fetch all active onboarding invitations for the active organization
   */
  public static async getInvitations(organizationId: string): Promise<OnboardingInvitation[]> {
    if (!organizationId) return [];

    try {
      const { data, error } = await supabase
        .from('onboarding_invitations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[StatutoryOnboardingService] getInvitations error:', error.message);
        return [];
      }

      return (data || []) as OnboardingInvitation[];
    } catch (err) {
      console.error('[StatutoryOnboardingService] getInvitations failed:', err);
      return [];
    }
  }

  /**
   * Fetch all employees in onboarding state or active employees
   */
  public static async getEmployeesForOnboarding(organizationId: string): Promise<Employee[]> {
    if (!organizationId) return [];

    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          first_name,
          last_name,
          employee_code,
          work_email,
          phone,
          department_id,
          designation_id,
          department_name,
          designation_title,
          status,
          date_of_joining,
          employment_type,
          organization_id
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[StatutoryOnboardingService] getEmployees error:', error.message);
        return [];
      }

      return (data || []) as unknown as Employee[];
    } catch (err) {
      console.error('[StatutoryOnboardingService] getEmployees failed:', err);
      return [];
    }
  }

  /**
   * Create a new scoped onboarding invitation in Supabase
   */
  public static async createInvitation(invitation: {
    organization_id: string;
    employee_id: string;
    candidate_name: string;
    phone?: string;
    email?: string;
    establishment_id?: string;
    notes?: string;
  }): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const token = `onb-${invitation.organization_id}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('onboarding_invitations')
        .insert({
          organization_id: invitation.organization_id,
          employee_id: invitation.employee_id,
          candidate_name: invitation.candidate_name,
          token,
          phone: invitation.phone || null,
          email: invitation.email || null,
          establishment_id: invitation.establishment_id || null,
          notes: invitation.notes || null,
          status: 'PENDING',
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, token };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create invitation' };
    }
  }

  /**
   * Fetch PF Declaration (Form 11) for an employee
   */
  public static async getPfDeclaration(employeeId: string): Promise<PfDeclarationData | null> {
    if (!employeeId) return null;

    try {
      const { data, error } = await supabase
        .from('pf_declarations')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (error) {
        console.warn('[StatutoryOnboardingService] getPfDeclaration error:', error.message);
        return null;
      }

      return data as PfDeclarationData | null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Save or Update PF Declaration (Form 11)
   */
  public static async savePfDeclaration(declaration: PfDeclarationData): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('pf_declarations')
        .upsert(
          {
            ...declaration,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'employee_id' }
        );

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetch all statutory nominations for an employee
   */
  public static async getNominations(employeeId: string): Promise<StatutoryNominee[]> {
    if (!employeeId) return [];

    try {
      const { data, error } = await supabase
        .from('employee_kyc_nominations')
        .select('*')
        .eq('employee_id', employeeId);

      if (error) {
        console.warn('[StatutoryOnboardingService] getNominations error:', error.message);
        return [];
      }

      return (data || []) as StatutoryNominee[];
    } catch (err) {
      return [];
    }
  }

  /**
   * Fetch Appointment Order (Form Q)
   */
  public static async getAppointmentOrder(employeeId: string): Promise<AppointmentOrderData | null> {
    if (!employeeId) return null;

    try {
      const { data, error } = await supabase
        .from('appointment_orders')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (error) {
        console.warn('[StatutoryOnboardingService] getAppointmentOrder error:', error.message);
        return null;
      }

      return data as AppointmentOrderData | null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Save Generated Statutory Form Snapshot
   */
  public static async saveGeneratedForm(form: {
    organization_id: string;
    employee_id: string;
    form_type: StatutoryFormType;
    form_name: string;
    form_data_json: any;
    status?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('generated_statutory_forms')
        .insert({
          organization_id: form.organization_id,
          employee_id: form.employee_id,
          form_type: form.form_type,
          form_name: form.form_name,
          form_data_json: form.form_data_json,
          status: form.status || 'GENERATED',
        });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
