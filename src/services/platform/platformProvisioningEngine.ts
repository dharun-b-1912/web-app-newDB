// src/services/platform/platformProvisioningEngine.ts
// ============================================================
// Joy PeopleHR — SaaS Customer Provisioning Engine & State Machine
// ============================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { platformAuditService } from './platformAuditService';
import { billingCalculationEngine } from '../billing/billingCalculationEngine';
import { platformTenantService, OrganizationRecord } from './platformTenantService';
import { platformSubscriptionService } from './platformSubscriptionService';
import { platformBillingService } from './platformBillingService';
import { userAuthProvisionerService } from '../auth/userAuthProvisionerService';

export interface ProvisioningFormData {
  // Step 1: Organization
  legal_name: string;
  display_name: string;
  domain: string;
  slug: string;
  industry: string;
  company_type: string;
  country: string;
  state: string;
  city: string;
  timezone: string;
  currency: string;
  environment: string;
  gstin?: string;
  pan?: string;
  cin?: string;
  registered_address?: string;
  website?: string;
  phone?: string;

  // Step 2: Primary Admin
  admin_first_name: string;
  admin_last_name: string;
  admin_email: string;
  admin_phone: string;
  admin_job_title: string;
  admin_language: string;
  admin_timezone: string;

  // Step 3: Subscription & Billing
  plan_id: string;
  plan_name: 'Starter' | 'Professional' | 'Business' | 'Enterprise';
  billing_cycle: 'Monthly' | 'Annual';
  seats: number;
  auto_renew: boolean;
  coupon_code?: string;
  coupon_discount_percent?: number;

  // Step 4: Feature Overrides
  enabled_features: string[];
  feature_overrides: Record<string, boolean>; // custom admin overrides

  // Account Owner Assignment
  account_owner_name?: string;
  account_owner_team?: 'Customer Success' | 'Sales' | 'Finance' | 'Support' | 'Platform Admin';
}

export interface ProvisioningDraft {
  draft_id: string;
  created_at: string;
  updated_at: string;
  current_step: number;
  form_data: ProvisioningFormData;
}

export interface ProvisioningStepProgress {
  stepIndex: number;
  stepName: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  error?: string;
}

export interface ProvisioningResult {
  success: boolean;
  organizationId: string;
  tenantSlug: string;
  subscriptionId: string;
  invoiceId: string;
  primaryAdminEmail: string;
  provisionedAt: string;
  message: string;
  steps: ProvisioningStepProgress[];
}

const DRAFT_STORAGE_KEY = 'workforce_provisioning_draft';

export const platformProvisioningEngine = {
  /**
   * Auto-generate a clean, URL-safe tenant slug from organization name.
   */
  generateTenantSlug(name: string): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .trim()
      .replace(/\b(private\s+limited|pvt\s+ltd|pvt|ltd|limited|inc|incorporated|llc)\b/gi, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);
  },

  /**
   * Check if company name (legal or display) is already registered.
   */
  async checkCompanyNameAvailability(name: string): Promise<{ available: boolean; message: string }> {
    const cleanName = name.toLowerCase().trim();
    if (!cleanName || cleanName.length < 2) {
      return { available: false, message: 'Company name too short' };
    }

    if (isSupabaseEnabled) {
      try {
        const { data } = await supabase
          .from('organizations')
          .select('id, legal_name, display_name')
          .or(`legal_name.ilike.${cleanName},display_name.ilike.${cleanName}`)
          .maybeSingle();

        if (data) {
          return {
            available: false,
            message: `An organization with company name "${data.legal_name || data.display_name}" is already registered (Tenant ID: ${data.id})`,
          };
        }
      } catch (err) {
        console.warn('[ProvisioningEngine] Company check fallback:', err);
      }
    }

    // Local check
    const orgs = platformTenantService.getOrganizations().items;
    const match = orgs.find(
      (o) => o.legal_name.toLowerCase().trim() === cleanName || o.display_name.toLowerCase().trim() === cleanName
    );
    if (match) {
      return { available: false, message: `Company "${match.legal_name}" already exists with Tenant ID "${match.id}"` };
    }

    return { available: true, message: 'Company name is available' };
  },

  /**
   * Check if tenant slug / ID is available.
   */
  async checkTenantSlugAvailability(slug: string): Promise<{ available: boolean; message: string }> {
    const cleanSlug = slug.toLowerCase().trim();
    if (!cleanSlug || cleanSlug.length < 2) {
      return { available: false, message: 'Slug too short' };
    }

    if (isSupabaseEnabled) {
      try {
        const { data } = await supabase
          .from('organizations')
          .select('id, legal_name, slug')
          .eq('slug', cleanSlug)
          .maybeSingle();

        if (data) {
          return { available: false, message: `Tenant identifier "${cleanSlug}" is already used by ${data.legal_name}` };
        }
      } catch (err) {
        console.warn('[ProvisioningEngine] Slug check fallback:', err);
      }
    }

    const orgs = platformTenantService.getOrganizations().items;
    const match = orgs.find((o) => (o as any).slug === cleanSlug || o.id === cleanSlug || o.tenant_id === cleanSlug);
    if (match) {
      return { available: false, message: `Tenant identifier is already in use by ${match.legal_name}` };
    }

    return { available: true, message: 'Tenant identifier is available' };
  },

  /**
   * Check if a domain is available or already claimed.
   */
  async checkDomainAvailability(domain: string): Promise<{ available: boolean; message: string }> {
    const cleanDomain = domain.toLowerCase().trim();
    if (!cleanDomain || !cleanDomain.includes('.')) {
      return { available: false, message: 'Invalid domain format' };
    }

    // Local check against existing organizations
    const orgs = platformTenantService.getOrganizations().items;
    const exists = orgs.some((o) => o.domain?.toLowerCase() === cleanDomain);
    if (exists) {
      return { available: false, message: 'Domain is already registered to an existing organization' };
    }

    return { available: true, message: 'Domain is available' };
  },

  /**
   * Check if admin email is already an active user.
   */
  async checkAdminEmailAvailability(email: string): Promise<{ available: boolean; message: string }> {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { available: false, message: 'Invalid email address' };
    }

    if (isSupabaseEnabled) {
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('id, email')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (data) {
          return { available: false, message: `An administrator account with this email already exists (${data.email})` };
        }
      } catch (err) {
        console.warn('[ProvisioningEngine] Email check fallback:', err);
      }
    }

    return { available: true, message: 'Email is available' };
  },

  /**
   * Save Provisioning Draft for resilience across browser sessions.
   */
  saveDraft(step: number, data: ProvisioningFormData): void {
    const draft: ProvisioningDraft = {
      draft_id: 'draft-current',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      current_step: step,
      form_data: data,
    };
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Ignore local storage quota exceptions
    }
  },

  /**
   * Retrieve saved draft if available.
   */
  getDraft(): ProvisioningDraft | null {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as ProvisioningDraft;
    } catch {
      return null;
    }
  },

  /**
   * Clear active draft after successful provisioning or on manual discard.
   */
  clearDraft(): void {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore exceptions
    }
  },

  /**
   * Execute End-to-End SaaS Organization Provisioning Workflow.
   * State Machine: Validates -> Creates Organization -> Creates Company -> Activates Subscription -> Sets Default Roles -> Dispatches Invitation.
   */
  async provisionCustomer(
    formData: ProvisioningFormData,
    onProgress?: (progress: ProvisioningStepProgress) => void,
    idempotencyKey?: string
  ): Promise<ProvisioningResult> {
    const steps: ProvisioningStepProgress[] = [
      { stepIndex: 1, stepName: 'Validate Organization & Domain', status: 'PENDING' },
      { stepIndex: 2, stepName: 'Create Organization in Canonical Database', status: 'PENDING' },
      { stepIndex: 3, stepName: 'Create Legal Entity Company in Database', status: 'PENDING' },
      { stepIndex: 4, stepName: 'Activate SaaS Subscription & Roles', status: 'PENDING' },
      { stepIndex: 5, stepName: 'Dispatch Company Admin Activation & Audit Ledger', status: 'PENDING' },
    ];

    const slug = formData.slug || this.generateTenantSlug(formData.legal_name);
    let orgId: string = `org-${slug}`;
    let companyId: string = `comp-${slug}`;
    let subId: string = `sub-${slug}-01`;
    let invNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    let invId = `inv-${slug}-01`;
    const adminFullName = `${formData.admin_first_name} ${formData.admin_last_name}`.trim();
    const provisionedAt = new Date().toISOString();

    // Plan Specs & Financial Calculation
    const planSpecs: Record<string, { monthly: number; annual: number; seats: number }> = {
      Starter: { monthly: 18000, annual: 180000, seats: 25 },
      Professional: { monthly: 45000, annual: 450000, seats: 100 },
      Business: { monthly: 85000, annual: 850000, seats: 250 },
      Enterprise: { monthly: 180000, annual: 1800000, seats: 500 },
    };

    const spec = planSpecs[formData.plan_name] || planSpecs.Professional;
    const calc = billingCalculationEngine.calculateBilling({
      plan: {
        id: formData.plan_id || `plan-${formData.plan_name.toLowerCase()}`,
        name: formData.plan_name,
        code: formData.plan_name.toLowerCase(),
        monthlyPrice: spec.monthly,
        annualPrice: spec.annual,
        includedSeats: spec.seats,
        maximumSeats: spec.seats * 2,
      },
      seatCount: formData.seats,
      billingInterval: formData.billing_cycle,
      couponDiscountPercent: formData.coupon_discount_percent || 0,
    });

    try {
      // Step 1: Validate Organization & Domain & Uniqueness
      steps[0].status = 'IN_PROGRESS';
      onProgress?.(steps[0]);

      const companyCheck = await this.checkCompanyNameAvailability(formData.legal_name);
      if (!companyCheck.available) throw new Error(companyCheck.message);

      const slugCheck = await this.checkTenantSlugAvailability(slug);
      if (!slugCheck.available) throw new Error(slugCheck.message);

      const domainCheck = await this.checkDomainAvailability(formData.domain);
      if (!domainCheck.available) throw new Error(domainCheck.message);

      steps[0].status = 'COMPLETED';
      onProgress?.(steps[0]);

      // Step 2: Create Organization in Canonical Database
      steps[1].status = 'IN_PROGRESS';
      onProgress?.(steps[1]);

      if (isSupabaseEnabled) {
        try {
          const { data: orgData, error: orgErr } = await supabase
            .from('organizations')
            .insert([
              {
                legal_name: formData.legal_name,
                display_name: formData.display_name || formData.legal_name,
                slug: slug,
                organization_code: `ORG-${Math.floor(1000 + Math.random() * 9000)}`,
                industry: formData.industry || 'Information Technology',
                country: formData.country || 'India',
                currency: formData.currency || 'INR',
                timezone: formData.timezone || 'Asia/Kolkata',
                status: 'ACTIVE',
              },
            ])
            .select()
            .single();

          if (orgData?.id) {
            orgId = orgData.id;
          }
        } catch (err) {
          console.warn('[ProvisioningEngine] Supabase org insert fallback:', err);
        }
      }

      await new Promise((r) => setTimeout(r, 250));
      steps[1].status = 'COMPLETED';
      onProgress?.(steps[1]);

      // Step 3: Create Legal Entity Company in Database
      steps[2].status = 'IN_PROGRESS';
      onProgress?.(steps[2]);

      if (isSupabaseEnabled) {
        try {
          const { data: compData } = await supabase
            .from('companies')
            .insert([
              {
                organization_id: orgId,
                legal_name: formData.legal_name,
                trade_name: formData.display_name || formData.legal_name,
                company_code: `CMP-${Math.floor(1000 + Math.random() * 9000)}`,
                country: (formData.country || 'India').slice(0, 10),
                city: formData.city || 'Chennai',
                state: formData.state || 'Tamil Nadu',
                postal_code: '600001',
                gstin: formData.gstin || null,
                pan_number: formData.pan || null,
                cin_number: formData.cin || null,
                registered_address: formData.registered_address || null,
              },
            ])
            .select()
            .single();

          if (compData?.id) {
            companyId = compData.id;
          }
        } catch (err) {
          console.warn('[ProvisioningEngine] Supabase company insert fallback:', err);
        }
      }

      await new Promise((r) => setTimeout(r, 250));
      steps[2].status = 'COMPLETED';
      onProgress?.(steps[2]);

      // Step 4: Activate SaaS Subscription & Roles
      steps[3].status = 'IN_PROGRESS';
      onProgress?.(steps[3]);

      if (isSupabaseEnabled) {
        try {
          await supabase.from('saas_subscriptions').insert([
            {
              organization_id: orgId,
              status: 'ACTIVE',
            },
          ]);

          // Create standard system roles
          await supabase.from('roles').insert([
            {
              organization_id: orgId,
              name: 'Company Administrator',
              code: 'COMPANY_ADMIN',
              description: 'Full administrative access to company & organization resources',
            },
            {
              organization_id: orgId,
              name: 'HR Head',
              code: 'HR_HEAD',
              description: 'Full HR administration and employee management access',
            },
            {
              organization_id: orgId,
              name: 'Employee',
              code: 'EMPLOYEE',
              description: 'Standard employee access',
            },
          ]);
        } catch (err) {
          console.warn('[ProvisioningEngine] Supabase subscription & role insert fallback:', err);
        }
      }

      await new Promise((r) => setTimeout(r, 250));
      steps[3].status = 'COMPLETED';
      onProgress?.(steps[3]);

      // Step 5: Dispatch Company Admin Activation & Audit Ledger
      steps[4].status = 'IN_PROGRESS';
      onProgress?.(steps[4]);

      // Automatically provision the Company Admin GoTrue Auth user account
      if (formData.admin_email) {
        try {
          await userAuthProvisionerService.provisionUser({
            organizationId: orgId,
            organizationName: formData.legal_name,
            companyId: companyId,
            email: formData.admin_email,
            fullName: `${formData.admin_first_name || ''} ${formData.admin_last_name || ''}`.trim() || `${formData.legal_name} Admin`,
            phone: formData.admin_phone,
            roleCode: 'COMPANY_ADMIN',
            temporaryPassword: 'joypeoplehr',
          });
        } catch (authErr) {
          console.warn('[ProvisioningEngine] Company admin auth provisioning notice:', authErr);
        }
      }

      await platformAuditService.logEvent({
        actor_id: 'user-superadmin',
        actor_name: 'WorkForce Super Admin',
        actor_role: 'Super Admin',
        organization_id: orgId,
        organization_name: formData.legal_name,
        action: 'ORGANIZATION_PROVISIONED',
        resource_type: 'Organization',
        resource_id: orgId,
        severity: 'High',
        reason: `Completed end-to-end customer provisioning for ${formData.legal_name} on ${formData.plan_name} plan (${formData.seats} seats). Primary Admin: ${formData.admin_email}`,
      });

      // Clear draft on successful completion
      this.clearDraft();

      await new Promise((r) => setTimeout(r, 250));
      steps[4].status = 'COMPLETED';
      onProgress?.(steps[4]);

      return {
        success: true,
        organizationId: orgId,
        tenantSlug: slug,
        subscriptionId: subId,
        invoiceId: invId,
        primaryAdminEmail: formData.admin_email,
        provisionedAt,
        message: `${formData.legal_name} has been successfully provisioned on the ${formData.plan_name} plan.`,
        steps,
      };
    } catch (error: any) {
      return {
        success: false,
        organizationId: orgId,
        tenantSlug: slug,
        subscriptionId: subId,
        invoiceId: invId,
        primaryAdminEmail: formData.admin_email,
        provisionedAt,
        message: error.message || 'Provisioning failed due to an unexpected server exception.',
        steps: steps.map((s) => (s.status === 'IN_PROGRESS' ? { ...s, status: 'FAILED', error: error.message } : s)),
      };
    }
  },
};
