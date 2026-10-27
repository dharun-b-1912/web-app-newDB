// src/services/platform/saasCommercialService.ts
// ============================================================================
// Joy PeopleHR — Master SaaS Commercial Lifecycle Service
// Unifies Quotation Maker, Immutable Pricing Snapshots, Invoices & Payments
// ============================================================================

import {
  CommercialClient,
  CommercialQuotation,
  QuotationLineItem,
  OneTimeServiceItem,
  QuotationVersion,
  QuotationStatus,
  SaaSInvoice,
  InvoiceLineItem,
  InvoicePaymentRecord,
  InvoiceType,
  InvoiceStatus,
  CrmLead,
  CrmOpportunity,
  CommercialSalesOwner,
  LeadStage,
  OpportunityStage,
  QuotationOriginType,
  QuotationPurpose,
} from '../../types/saasCommercial';
import { PlanTierCode, BillingCycle } from '../../types/saasCatalogue';
import { saasPricingEngine } from './saasPricingEngine';
import { saasCatalogueService } from './saasCatalogueService';
import { platformTenantService } from './platformTenantService';
import { platformStaffService } from './platformStaffService';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { formatTenantDisplayId, formatSubscriptionDisplayId, formatTenantDomain } from '../../utils/saasMasking';

const STORAGE_KEY_LEADS = 'joy_saas_crm_leads_v2';
const STORAGE_KEY_OPPORTUNITIES = 'joy_saas_crm_opportunities_v2';
const STORAGE_KEY_CLIENTS = 'joy_saas_crm_clients_v2';
const STORAGE_KEY_QUOTES = 'joy_saas_quotations_v2';
const STORAGE_KEY_INVOICES = 'joy_saas_invoices_v2';
const STORAGE_KEY_SALES_OWNERS = 'joy_saas_sales_owners_v1';
export const STORAGE_KEY_SUPPLIER_DETAILS = 'joy_saas_supplier_company_details_v2';

export const INITIAL_SALES_OWNERS: CommercialSalesOwner[] = [];

export interface SupplierCompanyDetails {
  legalName: string;
  tradeName: string;
  tagline?: string;
  gstin: string;
  pan: string;
  state: string;
  stateCode: string;
  address: string;
  email: string;
  phone: string;
  website?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  bankDetails: {
    accountName: string;
    bankName: string;
    accountNumber: string;
    ifsc: string;
    branch: string;
    upiId: string;
  };
}

export const SUPPLIER_COMPANY_DETAILS: SupplierCompanyDetails = {
  legalName: 'JOY CORPORATE SOLUTIONS PRIVATE LIMITED',
  tradeName: 'Joy PeopleHR',
  tagline: 'Enterprise Workforce Cloud',
  gstin: '33AABCJ1928K1Z5',
  pan: 'AABCJ1928K',
  state: 'Tamil Nadu',
  stateCode: '33',
  address: 'Level 6, Joy Tech Park, OMR IT Highway, Chennai, Tamil Nadu 600096, India',
  email: 'billing@joypeoplehr.com',
  phone: '+91 (044) 6912-8800',
  website: 'https://joypeoplehr.com',
  signatoryName: 'Arun K',
  signatoryDesignation: 'Commercial Lead & Enterprise Solutions',
  bankDetails: {
    accountName: 'JOY CORPORATE SOLUTIONS PRIVATE LIMITED',
    bankName: 'HDFC Bank Ltd',
    accountNumber: '50200088921822',
    ifsc: 'HDFC0000128',
    branch: 'OMR Sholinganallur Branch, Chennai',
    upiId: 'joypeoplehr@hdfcbank',
  },
};

export const INITIAL_LEADS: CrmLead[] = [];
export const INITIAL_OPPORTUNITIES: CrmOpportunity[] = [];
export const INITIAL_CLIENTS: CommercialClient[] = [];

export const DEFAULT_ONE_TIME_SERVICES: OneTimeServiceItem[] = [
  { key: 'impl_setup', name: 'Enterprise Deployment & Account Setup', description: 'Multi-entity org structure, branches, roles & permission mapping.', rate: 30000, selected: true },
  { key: 'data_migration', name: 'Legacy HR & Employee Data Migration', description: 'Sanitization, historical leave ledger balance, and employee master migration.', rate: 25000, selected: true },
  { key: 'biometric_config', name: 'Biometric Turnstile Push Gateway Setup', description: 'Daemon setup on-premise, ADMS port forwarding, and gate mapping.', rate: 20000, selected: false },
  { key: 'payroll_config', name: 'Custom Salary Structures & Statutory Compliance Setup', description: 'CTC rule builder, PF/ESI/PT slab verification, and bank payout advice formats.', rate: 25000, selected: true },
  { key: 'admin_training', name: 'HR Staff & Supervisor Training Program', description: 'Comprehensive video webinars and live training for HR admins and site managers.', rate: 15000, selected: true },
];

export const INITIAL_QUOTATIONS: CommercialQuotation[] = [];

export const INITIAL_INVOICES: SaaSInvoice[] = [];

class SaasCommercialService {
  private leads: CrmLead[];
  private opportunities: CrmOpportunity[];
  private clients: CommercialClient[];
  private quotations: CommercialQuotation[];
  private invoices: SaaSInvoice[];
  private salesOwners: CommercialSalesOwner[];
  private supplierDetails: SupplierCompanyDetails;

  constructor() {
    this.purgeLegacyMockStorage();
    this.leads = this.loadLeads();
    this.opportunities = this.loadOpportunities();
    this.clients = this.loadClients();
    this.quotations = this.loadQuotations();
    this.invoices = this.loadInvoices();
    this.salesOwners = this.loadSalesOwners();
    this.supplierDetails = this.loadSupplierDetails();
    this.syncRemoteData();
    this.setupRealtimeChannel();
  }

  private purgeLegacyMockStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const keys = [
        STORAGE_KEY_LEADS,
        STORAGE_KEY_OPPORTUNITIES,
        STORAGE_KEY_CLIENTS,
        STORAGE_KEY_QUOTES,
        STORAGE_KEY_INVOICES,
        STORAGE_KEY_SALES_OWNERS,
      ];
      keys.forEach((key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((item: any) => {
              if (!item) return false;
              const id = String(item.id || '').toLowerCase();
              const name = String(item.name || item.companyName || item.legalName || item.clientName || item.dealName || '').toLowerCase();
              const email = String(item.email || '').toLowerCase();

              // Purge fake mock sales reps
              if (
                id === 'so-01' ||
                id === 'so-02' ||
                id.startsWith('so-0') ||
                name.includes('priya sharma') ||
                name.includes('arun k') ||
                email.includes('joymanpower')
              ) {
                return false;
              }

              // Purge mock quotations, invoices, clients, leads, opps
              if (
                id.startsWith('qt-0') ||
                id.startsWith('inv-0') ||
                id.startsWith('cli-0') ||
                id.startsWith('lead-0') ||
                id.startsWith('opp-0') ||
                id.startsWith('opp-seed') ||
                id.startsWith('lead-seed') ||
                name.includes('abc industries') ||
                name.includes('xyz logistics') ||
                name.includes('techflow') ||
                name.includes('apex retail') ||
                name.includes('nexus logistics') ||
                name.includes('joy manpower') ||
                name.includes('test company')
              ) {
                return false;
              }
              return true;
            });
            localStorage.setItem(key, JSON.stringify(cleaned));
          }
        } catch {}
      });
    } catch {}
  }

  private async syncRemoteData(): Promise<void> {
    if (!isSupabaseEnabled) return;
    try {
      // 1. Leads
      const { data: remoteLeads, error: leadsErr } = await supabase
        .from('crm_leads')
        .select('*')
        .limit(100);
      if (!leadsErr && Array.isArray(remoteLeads)) {
        this.leads = remoteLeads.map((rl: any) => ({
          id: rl.id,
          leadNumber: rl.lead_number,
          companyName: rl.company_name,
          contactPerson: rl.contact_person,
          designation: rl.designation,
          email: rl.email,
          phone: rl.phone,
          website: rl.website,
          industry: rl.industry,
          estimatedEmployees: rl.estimated_employees,
          locationsCount: rl.locations_count,
          source: rl.source,
          salesOwner: rl.sales_owner,
          stage: rl.stage,
          requirements: rl.requirements || [],
          notes: rl.notes,
          opportunityId: rl.opportunity_id,
          convertedClientId: rl.converted_client_id,
          createdAt: rl.created_at,
          updatedAt: rl.updated_at,
        }));
        this.setItem(STORAGE_KEY_LEADS, JSON.stringify(this.leads));
      }

      // 2. Opportunities
      const { data: remoteOpps, error: oppsErr } = await supabase
        .from('crm_opportunities')
        .select('*')
        .limit(100);
      if (!oppsErr && Array.isArray(remoteOpps)) {
        this.opportunities = remoteOpps.map((ro: any) => ({
          id: ro.id,
          opportunityNumber: ro.opportunity_number,
          dealName: ro.deal_name,
          leadId: ro.lead_id,
          leadNumber: ro.lead_number,
          clientId: ro.client_id,
          clientName: ro.client_name,
          companyName: ro.company_name,
          contactPerson: ro.contact_person,
          designation: ro.designation,
          email: ro.email,
          phone: ro.phone,
          industry: ro.industry,
          estimatedEmployees: ro.estimated_employees,
          locationsCount: ro.locations_count,
          legalEntitiesCount: ro.legal_entities_count,
          estimatedArr: Number(ro.estimated_arr || 0),
          probability: ro.probability,
          expectedCloseDate: ro.expected_close_date,
          salesOwner: ro.sales_owner,
          stage: (ro.stage || 'DISCOVERY') as OpportunityStage,
          capturedRequirements: ro.captured_requirements || [],
          quotationIds: ro.quotation_ids || [],
          activeQuotationId: ro.active_quotation_id,
          originType: (ro.origin_type || 'NEW_CUSTOMER') as QuotationOriginType,
          notes: ro.notes,
          createdAt: ro.created_at,
          updatedAt: ro.updated_at,
        }));
        this.setItem(STORAGE_KEY_OPPORTUNITIES, JSON.stringify(this.opportunities));
      }

      // 3. Quotations
      const { data: remoteQuotes, error: quotesErr } = await supabase
        .from('commercial_quotations')
        .select('*')
        .limit(100);
      if (!quotesErr && Array.isArray(remoteQuotes)) {
        this.quotations = remoteQuotes.map((rq: any) => ({
          id: rq.id,
          quotationNumber: rq.quotation_number,
          version: rq.version,
          originType: rq.origin_type,
          purpose: rq.purpose,
          opportunityId: rq.opportunity_id,
          opportunityNumber: rq.opportunity_number,
          leadId: rq.lead_id,
          leadNumber: rq.lead_number,
          clientId: rq.client_id,
          clientName: rq.client_name,
          clientGstin: rq.client_gstin,
          clientEmail: rq.client_email,
          clientPhone: rq.client_phone,
          clientState: rq.client_state,
          salesOwner: rq.sales_owner,
          planCode: rq.plan_code,
          planName: rq.plan_name,
          billingCycle: rq.billing_cycle,
          employeeCount: rq.employee_count,
          includedEmployees: rq.included_employees,
          additionalEmployeesCount: rq.additional_employees_count,
          pepmRate: Number(rq.pepm_rate),
          selectedAddonKeys: rq.selected_addon_keys || [],
          requirements: rq.requirements || {},
          lineItems: rq.line_items || [],
          oneTimeServices: rq.one_time_services || [],
          pricingSnapshot: rq.pricing_snapshot || {},
          approval: rq.approval || { required: false, tier: 'Sales' },
          solutionConfig: rq.solution_config,
          terms: rq.terms,
          status: rq.status,
          validUntil: rq.valid_until,
          convertedClientId: rq.converted_client_id,
          convertedOrgId: rq.converted_org_id,
          convertedSubscriptionId: rq.converted_subscription_id,
          createdAt: rq.created_at,
          updatedAt: rq.updated_at,
          versions: [],
        }));
        this.setItem(STORAGE_KEY_QUOTES, JSON.stringify(this.quotations));
      }

      // 4. Commercial Clients
      const { data: remoteClients, error: clientsErr } = await supabase
        .from('commercial_clients')
        .select('*')
        .limit(100);
      if (!clientsErr && Array.isArray(remoteClients)) {
        this.clients = remoteClients
          .filter((rc: any) => {
            const name = (rc.legal_name || '').toLowerCase();
            return !name.includes('abc industries') && !name.includes('xyz logistics') && rc.id !== 'cli-02';
          })
          .map((rc: any) => ({
            id: rc.id,
            clientCode: rc.client_code,
            legalName: rc.legal_name,
            tradeName: rc.trade_name || rc.legal_name,
            organizationId: rc.organization_id,
            industry: rc.industry || 'Technology',
            employeeCount: rc.employee_count || 1,
            gstin: rc.gstin || '',
            pan: rc.pan || '',
            cin: rc.cin,
            contactPerson: rc.primary_contact?.name || 'Authorized Admin',
            designation: rc.primary_contact?.designation || 'Director',
            email: rc.primary_contact?.email || 'billing@company.com',
            phone: rc.primary_contact?.phone || '+91 98401 00000',
            billingAddress: rc.billing_address || {
              line1: 'Corporate Campus',
              city: 'Chennai',
              state: 'Tamil Nadu',
              country: 'India',
              pinCode: '600096',
            },
            customerType: (rc.employee_count > 500 ? 'Enterprise' : 'Mid-Market') as any,
            status: (rc.commercial_status === 'ACTIVE' ? 'Active' : 'Lead') as any,
            createdAt: rc.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          }));
        this.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(this.clients));
      }

      this.notifyDataUpdated('ALL');
    } catch (err) {
      console.warn('Supabase commercial sync skipped:', err);
    }
  }

  private realtimeChannel: any = null;

  private setupRealtimeChannel(): void {
    if (!isSupabaseEnabled || typeof window === 'undefined') return;
    if (this.realtimeChannel) return;

    try {
      const existing = supabase.getChannels().find((c) => c.topic === 'realtime:joy_saas_commercial_realtime_mesh');
      if (existing) {
        supabase.removeChannel(existing);
      }

      this.realtimeChannel = supabase
        .channel('joy_saas_commercial_realtime_mesh')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'crm_leads' },
          (payload) => {
            this.handleRemoteLeadChange(payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'crm_opportunities' },
          (payload) => {
            this.handleRemoteOpportunityChange(payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'commercial_quotations' },
          (payload) => {
            this.handleRemoteQuotationChange(payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'commercial_clients' },
          (payload) => {
            this.handleRemoteClientChange(payload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Supabase Realtime] CRM & Commercial channel active');
          }
        });
    } catch (err) {
      console.warn('[Supabase Realtime] Could not connect commercial channel:', err);
    }
  }

  private handleRemoteLeadChange(payload: any): void {
    const { eventType, new: newRec, old: oldRec } = payload;
    if (eventType === 'DELETE') {
      this.leads = this.leads.filter((l) => l.id !== oldRec.id);
    } else if (newRec) {
      const mappedLead: CrmLead = {
        id: newRec.id,
        leadNumber: newRec.lead_number,
        companyName: newRec.company_name,
        contactPerson: newRec.contact_person,
        designation: newRec.designation,
        email: newRec.email,
        phone: newRec.phone,
        website: newRec.website,
        industry: newRec.industry,
        estimatedEmployees: newRec.estimated_employees,
        locationsCount: newRec.locations_count,
        source: newRec.source,
        salesOwner: newRec.sales_owner,
        stage: newRec.stage,
        requirements: newRec.requirements || [],
        notes: newRec.notes,
        opportunityId: newRec.opportunity_id,
        convertedClientId: newRec.converted_client_id,
        createdAt: newRec.created_at,
        updatedAt: newRec.updated_at,
      };
      const idx = this.leads.findIndex((l) => l.id === newRec.id);
      if (idx >= 0) {
        this.leads[idx] = mappedLead;
      } else {
        this.leads.unshift(mappedLead);
      }
    }
    this.setItem(STORAGE_KEY_LEADS, JSON.stringify(this.leads));
    this.notifyDataUpdated('crm_leads');
  }

  private handleRemoteOpportunityChange(payload: any): void {
    const { eventType, new: newRec, old: oldRec } = payload;
    if (eventType === 'DELETE') {
      this.opportunities = this.opportunities.filter((o) => o.id !== oldRec.id);
    } else if (newRec) {
      const mappedOpp: CrmOpportunity = {
        id: newRec.id,
        opportunityNumber: newRec.opportunity_number,
        dealName: newRec.deal_name,
        leadId: newRec.lead_id,
        leadNumber: newRec.lead_number,
        clientId: newRec.client_id,
        clientName: newRec.client_name,
        companyName: newRec.company_name,
        contactPerson: newRec.contact_person,
        designation: newRec.designation,
        email: newRec.email,
        phone: newRec.phone,
        industry: newRec.industry,
        estimatedEmployees: newRec.estimated_employees,
        locationsCount: newRec.locations_count,
        legalEntitiesCount: newRec.legal_entities_count,
        estimatedArr: Number(newRec.estimated_arr || 0),
        probability: newRec.probability,
        expectedCloseDate: newRec.expected_close_date,
        salesOwner: newRec.sales_owner,
        stage: (newRec.stage || 'DISCOVERY') as OpportunityStage,
        capturedRequirements: newRec.captured_requirements || [],
        quotationIds: newRec.quotation_ids || [],
        activeQuotationId: newRec.active_quotation_id,
        originType: (newRec.origin_type || 'NEW_CUSTOMER') as QuotationOriginType,
        notes: newRec.notes,
        createdAt: newRec.created_at,
        updatedAt: newRec.updated_at,
      };
      const idx = this.opportunities.findIndex((o) => o.id === newRec.id);
      if (idx >= 0) {
        this.opportunities[idx] = mappedOpp;
      } else {
        this.opportunities.unshift(mappedOpp);
      }
    }
    this.setItem(STORAGE_KEY_OPPORTUNITIES, JSON.stringify(this.opportunities));
    this.notifyDataUpdated('crm_opportunities');
  }

  private handleRemoteQuotationChange(payload: any): void {
    const { eventType, new: newRec, old: oldRec } = payload;
    if (eventType === 'DELETE') {
      this.quotations = this.quotations.filter((q) => q.id !== oldRec.id);
    } else if (newRec) {
      const mappedQuote: CommercialQuotation = {
        id: newRec.id,
        quotationNumber: newRec.quotation_number,
        version: newRec.version,
        originType: newRec.origin_type,
        purpose: newRec.purpose,
        opportunityId: newRec.opportunity_id,
        opportunityNumber: newRec.opportunity_number,
        leadId: newRec.lead_id,
        leadNumber: newRec.lead_number,
        clientId: newRec.client_id,
        clientName: newRec.client_name,
        clientGstin: newRec.client_gstin,
        clientEmail: newRec.client_email,
        clientPhone: newRec.client_phone,
        clientState: newRec.client_state,
        salesOwner: newRec.sales_owner,
        planCode: newRec.plan_code,
        planName: newRec.plan_name,
        billingCycle: newRec.billing_cycle,
        employeeCount: newRec.employee_count,
        includedEmployees: newRec.included_employees,
        additionalEmployeesCount: newRec.additional_employees_count,
        pepmRate: Number(newRec.pepm_rate),
        selectedAddonKeys: newRec.selected_addon_keys || [],
        requirements: newRec.requirements || {},
        lineItems: newRec.line_items || [],
        oneTimeServices: newRec.one_time_services || [],
        pricingSnapshot: newRec.pricing_snapshot || {},
        approval: newRec.approval || { required: false, tier: 'Sales' },
        solutionConfig: newRec.solution_config,
        terms: newRec.terms,
        status: newRec.status,
        validUntil: newRec.valid_until,
        convertedClientId: newRec.converted_client_id,
        convertedOrgId: newRec.converted_org_id,
        convertedSubscriptionId: newRec.converted_subscription_id,
        createdAt: newRec.created_at,
        updatedAt: newRec.updated_at,
        versions: [],
      };
      const idx = this.quotations.findIndex((q) => q.id === newRec.id);
      if (idx >= 0) {
        this.quotations[idx] = mappedQuote;
      } else {
        this.quotations.unshift(mappedQuote);
      }
    }
    this.setItem(STORAGE_KEY_QUOTES, JSON.stringify(this.quotations));
    this.notifyDataUpdated('commercial_quotations');
  }

  private handleRemoteClientChange(payload: any): void {
    const { eventType, new: newRec, old: oldRec } = payload;
    if (eventType === 'DELETE') {
      this.clients = this.clients.filter((c) => c.id !== oldRec.id);
    } else if (newRec) {
      const mappedClient: CommercialClient = {
        id: newRec.id,
        clientCode: newRec.client_code,
        legalName: newRec.legal_name,
        tradeName: newRec.trade_name || newRec.legal_name,
        organizationId: newRec.organization_id,
        industry: newRec.industry || 'Technology',
        employeeCount: newRec.employee_count || 1,
        gstin: newRec.gstin || '',
        pan: newRec.pan || '',
        cin: newRec.cin,
        contactPerson: newRec.primary_contact?.name || 'Authorized Admin',
        designation: newRec.primary_contact?.designation || 'Director',
        email: newRec.primary_contact?.email || 'billing@company.com',
        phone: newRec.primary_contact?.phone || '+91 98401 00000',
        billingAddress: newRec.billing_address || {
          line1: 'Corporate Campus',
          city: 'Chennai',
          state: 'Tamil Nadu',
          country: 'India',
          pinCode: '600096',
        },
        customerType: (newRec.employee_count > 500 ? 'Enterprise' : 'Mid-Market') as any,
        status: (newRec.commercial_status === 'ACTIVE' ? 'Active' : 'Lead') as any,
        createdAt: newRec.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      };
      const idx = this.clients.findIndex((c) => c.id === newRec.id);
      if (idx >= 0) {
        this.clients[idx] = mappedClient;
      } else {
        this.clients.unshift(mappedClient);
      }
    }
    this.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(this.clients));
    this.notifyDataUpdated('commercial_clients');
  }

  public notifyDataUpdated(table?: string): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('commercial:data_updated', { detail: { table } }));
    }
  }

  public async refreshFromSupabase(): Promise<void> {
    this.purgeLegacyMockStorage();
    await this.syncRemoteData();
  }

  private getItem(key: string): string | null {
    if (typeof localStorage !== 'undefined') {
      try {
        return localStorage.getItem(key);
      } catch {}
    }
    return null;
  }

  private setItem(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value);
      } catch {}
    }
  }

  private loadLeads(): CrmLead[] {
    try {
      const saved = this.getItem(STORAGE_KEY_LEADS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (l: any) =>
              l &&
              !String(l.id || '').startsWith('lead-0') &&
              !String(l.id || '').startsWith('lead-seed') &&
              !String(l.companyName || '').toLowerCase().includes('abc industries') &&
              !String(l.companyName || '').toLowerCase().includes('xyz logistics') &&
              !String(l.companyName || '').toLowerCase().includes('techflow') &&
              !String(l.companyName || '').toLowerCase().includes('apex retail') &&
              !String(l.companyName || '').toLowerCase().includes('nexus logistics') &&
              !String(l.companyName || '').toLowerCase().includes('joy manpower') &&
              !String(l.companyName || '').toLowerCase().includes('test company')
          );
        }
      }
    } catch {}
    return [];
  }

  private loadOpportunities(): CrmOpportunity[] {
    try {
      const saved = this.getItem(STORAGE_KEY_OPPORTUNITIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (o: any) =>
              o &&
              !String(o.id || '').startsWith('opp-0') &&
              !String(o.id || '').startsWith('opp-seed') &&
              !String(o.companyName || '').toLowerCase().includes('abc industries') &&
              !String(o.companyName || '').toLowerCase().includes('xyz logistics') &&
              !String(o.companyName || '').toLowerCase().includes('techflow') &&
              !String(o.companyName || '').toLowerCase().includes('apex retail') &&
              !String(o.companyName || '').toLowerCase().includes('nexus logistics') &&
              !String(o.companyName || '').toLowerCase().includes('joy manpower') &&
              !String(o.companyName || '').toLowerCase().includes('test company')
          );
        }
      }
    } catch {}
    return [];
  }

  private loadClients(): CommercialClient[] {
    try {
      const saved = this.getItem(STORAGE_KEY_CLIENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (c: any) =>
              c &&
              !String(c.id || '').startsWith('cli-0') &&
              !String(c.legalName || '').toLowerCase().includes('abc industries') &&
              !String(c.legalName || '').toLowerCase().includes('xyz logistics')
          );
        }
      }
    } catch {}
    return [];
  }

  private loadQuotations(): CommercialQuotation[] {
    try {
      const saved = this.getItem(STORAGE_KEY_QUOTES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (q: any) =>
              q &&
              !String(q.id || '').startsWith('qt-0') &&
              !String(q.quotationNumber || '').includes('QT-2026-00123') &&
              !String(q.quotationNumber || '').includes('QT-2026-00124') &&
              !String(q.clientName || '').toLowerCase().includes('abc industries') &&
              !String(q.clientName || '').toLowerCase().includes('xyz logistics')
          );
        }
      }
    } catch {}
    return [];
  }

  private loadInvoices(): SaaSInvoice[] {
    try {
      const saved = this.getItem(STORAGE_KEY_INVOICES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (i: any) =>
              i &&
              !String(i.id || '').startsWith('inv-0') &&
              !String(i.clientName || '').toLowerCase().includes('abc industries') &&
              !String(i.clientName || '').toLowerCase().includes('xyz logistics')
          );
        }
      }
    } catch {}
    return [];
  }

  private loadSalesOwners(): CommercialSalesOwner[] {
    try {
      const saved = this.getItem(STORAGE_KEY_SALES_OWNERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((so: any) => {
            if (!so) return false;
            const id = String(so.id || '').toLowerCase();
            const name = String(so.name || '').toLowerCase();
            const email = String(so.email || '').toLowerCase();
            if (
              id === 'so-01' ||
              id === 'so-02' ||
              id.startsWith('so-0') ||
              name.includes('priya sharma') ||
              name.includes('arun k') ||
              email.includes('joymanpower')
            ) {
              return false;
            }
            return true;
          });
        }
      }
    } catch {}
    return [];
  }

  // ── Commercial Sales Owners & Reps ─────────────────────────────────────────
  public getSalesOwners(): CommercialSalesOwner[] {
    const list = [...this.salesOwners];
    try {
      // Dynamically enrich from Platform Staff IAM if staff has commercial or super admin role
      const staffList = platformStaffService.getStaffList();
      staffList.forEach((staff) => {
        const alreadyExists = list.some(
          (so) => so.email.toLowerCase() === staff.email.toLowerCase() || so.staffId === staff.id
        );
        if (!alreadyExists && (staff.job_title?.toLowerCase().includes('sales') || staff.job_title?.toLowerCase().includes('commercial') || staff.is_root_superadmin)) {
          list.push({
            id: `so-staff-${staff.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5)}`,
            staffId: staff.id,
            name: staff.name,
            email: staff.email,
            phone: staff.phone || '+91 98401 00000',
            designation: staff.job_title || 'Enterprise Commercial Lead',
            territory: 'National / Enterprise Accounts',
            annualQuotaArr: 10000000,
            closedWonArr: 0,
            activeDealsCount: 0,
            totalPipelineValue: 0,
            winRatePct: 75,
            status: staff.status === 'Active' ? 'Active' : 'Inactive',
            createdAt: staff.created_at || new Date().toISOString().slice(0, 10),
            updatedAt: new Date().toISOString().slice(0, 10),
          });
        }
      });
    } catch {}
    return list;
  }

  public getSalesOwnerById(id: string): CommercialSalesOwner | undefined {
    return this.getSalesOwners().find((so) => so.id === id);
  }

  public saveSalesOwner(owner: CommercialSalesOwner): void {
    const idx = this.salesOwners.findIndex((so) => so.id === owner.id);
    if (idx >= 0) {
      this.salesOwners[idx] = { ...owner, updatedAt: new Date().toISOString().slice(0, 10) };
    } else {
      this.salesOwners.unshift(owner);
    }
    this.setItem(STORAGE_KEY_SALES_OWNERS, JSON.stringify(this.salesOwners));
  }

  public deleteSalesOwner(id: string): void {
    this.salesOwners = this.salesOwners.filter((so) => so.id !== id);
    this.setItem(STORAGE_KEY_SALES_OWNERS, JSON.stringify(this.salesOwners));
  }

  public getSalesPipelineMetrics() {
    const opps = this.opportunities;
    const quotes = this.quotations;
    const owners = this.getSalesOwners();

    let openPipeline = 0;
    let weightedPipeline = 0;
    let closedWonCount = 0;
    let closedWonArr = 0;

    for (const opp of opps) {
      const arr = opp.estimatedArr || 0;
      if (['DISCOVERY', 'REQUIREMENT', 'PRICING', 'PROPOSAL', 'NEGOTIATION'].includes(opp.stage)) {
        openPipeline += arr;
        weightedPipeline += Math.round((arr * (opp.probability || 50)) / 100);
      } else if (opp.stage === 'WON') {
        closedWonCount++;
        closedWonArr += arr;
      }
    }

    for (const q of quotes) {
      const qVal = q.pricingSnapshot?.totalFirstYearValue || 0;
      if (['SENT', 'INTERNAL_REVIEW', 'APPROVED'].includes(q.status)) {
        openPipeline += qVal;
        weightedPipeline += Math.round(qVal * 0.7);
      } else if (['ACCEPTED', 'CONVERTED'].includes(q.status)) {
        closedWonArr += qVal;
        closedWonCount++;
      }
    }

    const conversionRate = (opps.length + quotes.length) > 0
      ? Math.round((closedWonCount / (opps.length + quotes.length)) * 100)
      : 0;

    return {
      openPipeline,
      weightedPipeline,
      closedWonCount,
      closedWonArr,
      conversionRate,
      activeRepsCount: owners.filter((o) => o.status === 'Active').length,
      topRepName: owners[0]?.name || 'Commercial Desk',
    };
  }

  private loadSupplierDetails(): SupplierCompanyDetails {
    try {
      const saved = this.getItem(STORAGE_KEY_SUPPLIER_DETAILS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...SUPPLIER_COMPANY_DETAILS,
          ...parsed,
          bankDetails: {
            ...SUPPLIER_COMPANY_DETAILS.bankDetails,
            ...(parsed.bankDetails || {}),
          },
        };
      }
    } catch {}
    return SUPPLIER_COMPANY_DETAILS;
  }

  public getSupplierDetails(): SupplierCompanyDetails {
    return this.supplierDetails;
  }

  public updateSupplierDetails(updates: Partial<SupplierCompanyDetails>): SupplierCompanyDetails {
    this.supplierDetails = {
      ...this.supplierDetails,
      ...updates,
      bankDetails: {
        ...this.supplierDetails.bankDetails,
        ...(updates.bankDetails || {}),
      },
    };
    this.setItem(STORAGE_KEY_SUPPLIER_DETAILS, JSON.stringify(this.supplierDetails));
    return this.supplierDetails;
  }

  // ── CRM Leads ────────────────────────────────────────────────────────────
  public getLeads(): CrmLead[] {
    return this.leads;
  }

  public getLeadById(id: string): CrmLead | undefined {
    return this.leads.find((l) => l.id === id);
  }

  public saveLead(lead: CrmLead): void {
    const idx = this.leads.findIndex((l) => l.id === lead.id);
    if (idx >= 0) {
      this.leads[idx] = { ...lead, updatedAt: new Date().toISOString().slice(0, 10) };
    } else {
      this.leads.unshift(lead);
    }
    this.notifyDataUpdated('crm_leads');

    if (isSupabaseEnabled) {
      supabase
        .from('crm_leads')
        .upsert({
          id: lead.id,
          lead_number: lead.leadNumber,
          company_name: lead.companyName,
          contact_person: lead.contactPerson,
          designation: lead.designation,
          email: lead.email,
          phone: lead.phone,
          website: lead.website,
          industry: lead.industry,
          estimated_employees: lead.estimatedEmployees,
          locations_count: lead.locationsCount,
          source: lead.source,
          sales_owner: lead.salesOwner,
          stage: lead.stage,
          requirements: lead.requirements,
          notes: lead.notes,
          opportunity_id: lead.opportunityId,
          converted_client_id: lead.convertedClientId,
          updated_at: new Date().toISOString(),
        })
        .then(() => {}, () => {});
    }
  }

  public async deleteLead(id: string): Promise<void> {
    this.leads = this.leads.filter((l) => l.id !== id);
    this.setItem(STORAGE_KEY_LEADS, JSON.stringify(this.leads));
    this.notifyDataUpdated('crm_leads');

    if (isSupabaseEnabled) {
      try {
        await supabase.from('crm_leads').delete().eq('id', id);
      } catch (err) {
        console.warn('Failed to delete remote lead:', err);
      }
    }
  }

  // ── CRM Opportunities ────────────────────────────────────────────────────
  public getOpportunities(): CrmOpportunity[] {
    return this.opportunities;
  }

  public getOpportunityById(id: string): CrmOpportunity | undefined {
    return this.opportunities.find((o) => o.id === id);
  }

  public saveOpportunity(opp: CrmOpportunity): void {
    const idx = this.opportunities.findIndex((o) => o.id === opp.id);
    if (idx >= 0) {
      this.opportunities[idx] = { ...opp, updatedAt: new Date().toISOString().slice(0, 10) };
    } else {
      this.opportunities.unshift(opp);
    }
    this.setItem(STORAGE_KEY_OPPORTUNITIES, JSON.stringify(this.opportunities));
    this.notifyDataUpdated('crm_opportunities');

    if (isSupabaseEnabled) {
      supabase
        .from('crm_opportunities')
        .upsert({
          id: opp.id,
          opportunity_number: opp.opportunityNumber,
          deal_name: opp.dealName,
          lead_id: opp.leadId,
          lead_number: opp.leadNumber,
          client_id: opp.clientId,
          client_name: opp.clientName,
          company_name: opp.companyName,
          contact_person: opp.contactPerson,
          designation: opp.designation,
          email: opp.email,
          phone: opp.phone,
          industry: opp.industry,
          estimated_employees: opp.estimatedEmployees,
          locations_count: opp.locationsCount,
          legal_entities_count: opp.legalEntitiesCount,
          estimated_arr: opp.estimatedArr,
          probability: opp.probability,
          expected_close_date: opp.expectedCloseDate,
          sales_owner: opp.salesOwner,
          stage: opp.stage,
          captured_requirements: opp.capturedRequirements,
          active_quotation_id: opp.activeQuotationId,
          origin_type: opp.originType,
          notes: opp.notes,
          updated_at: new Date().toISOString(),
        })
        .then(() => {}, () => {});
    }
  }

  public updateOpportunityStage(id: string, stage: OpportunityStage): void {
    const opp = this.getOpportunityById(id);
    if (!opp) return;
    opp.stage = stage;
    opp.updatedAt = new Date().toISOString().slice(0, 10);
    this.saveOpportunity(opp);
  }

  public async deleteOpportunity(id: string): Promise<void> {
    this.opportunities = this.opportunities.filter((o) => o.id !== id);
    this.setItem(STORAGE_KEY_OPPORTUNITIES, JSON.stringify(this.opportunities));
    this.notifyDataUpdated('crm_opportunities');

    if (isSupabaseEnabled) {
      try {
        await supabase.from('crm_opportunities').delete().eq('id', id);
      } catch (err) {
        console.warn('Failed to delete remote opportunity:', err);
      }
    }
  }

  public createOpportunityFromLead(leadId: string, dealOverrides?: Partial<CrmOpportunity>): CrmOpportunity {
    const lead = this.getLeadById(leadId);
    if (!lead) throw new Error('Lead not found');

    const oppNumber = `OPP-2026-00${this.opportunities.length + 32}`;
    const newOpp: CrmOpportunity = {
      id: `opp-${Date.now()}`,
      opportunityNumber: oppNumber,
      dealName: `${lead.companyName} — SaaS Proposal`,
      leadId: lead.id,
      leadNumber: lead.leadNumber,
      companyName: lead.companyName,
      contactPerson: lead.contactPerson,
      designation: lead.designation,
      email: lead.email,
      phone: lead.phone,
      industry: lead.industry,
      estimatedEmployees: lead.estimatedEmployees,
      locationsCount: lead.locationsCount || 1,
      legalEntitiesCount: 1,
      estimatedArr: lead.estimatedEmployees * 1000,
      probability: 60,
      expectedCloseDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      salesOwner: lead.salesOwner || (this.getSalesOwners()[0]?.name || 'Commercial Desk'),
      stage: 'REQUIREMENT',
      originType: 'NEW_CUSTOMER',
      capturedRequirements: lead.requirements || ['core_hr', 'ess', 'attendance', 'leave', 'payroll'],
      quotationIds: [],
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
      ...dealOverrides,
    };

    this.saveOpportunity(newOpp);
    lead.opportunityId = newOpp.id;
    lead.stage = 'QUALIFIED';
    this.saveLead(lead);

    return newOpp;
  }

  public getClients(): CommercialClient[] {
    const orgs = platformTenantService.getOrganizations().items;
    const clientMap = new Map<string, CommercialClient>();

    // Canonical real organizations from Supabase / platform tenant service
    orgs.forEach((org) => {
      const lowerName = (org.legal_name || '').toLowerCase();
      const orgId = String(org.id || '').toLowerCase();
      if (
        orgId === 'org-joy-corp' ||
        orgId.includes('joy-corp') ||
        lowerName.includes('joy corporate solutions') ||
        lowerName === SUPPLIER_COMPANY_DETAILS.legalName.toLowerCase()
      ) {
        return; // Platform provider is the vendor, not a client!
      }

      const tenantDisplay = formatTenantDisplayId(org.id);
      const clientCode = `CLI-2026-${tenantDisplay.replace(/^TEN-/, '')}`;
      const domain = formatTenantDomain(org.domain, org.legal_name, org.id);

      clientMap.set(org.id, {
        id: org.id,
        organizationId: org.id,
        clientCode,
        legalName: org.legal_name,
        tradeName: org.display_name || org.legal_name,
        gstin: org.gstin || '33AABCT9981K1Z9',
        pan: org.pan || 'AABCT9981K',
        contactPerson: org.primary_admin_name || 'Admin',
        designation: 'Account Administrator',
        email: org.primary_admin_email || `admin@${domain}`,
        phone: '+91 98401 00000',
        website: `https://${domain}`,
        billingAddress: {
          line1: org.city || 'Chennai',
          city: org.city || 'Chennai',
          state: org.state || 'Tamil Nadu',
          country: org.country || 'India',
          pinCode: '600001',
        },
        industry: org.industry || 'Technology & Enterprise Services',
        employeeCount: org.active_employees || 1,
        customerType: org.plan === 'Enterprise' ? 'Enterprise' : 'Mid-Market',
        status: 'Active',
        createdAt: org.created_at ? org.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
      });
    });

    // Also include any user-created clients saved in this.clients (excluding legacy mock entries & provider self)
    this.clients.forEach((c) => {
      const lowerName = (c.legalName || '').toLowerCase();
      const isMock = c.id.startsWith('cli-0') || lowerName.includes('abc industries') || lowerName.includes('xyz logistics');
      const isProvider =
        c.id === 'org-joy-corp' ||
        c.id.includes('joy-corp') ||
        lowerName.includes('joy corporate solutions') ||
        lowerName === SUPPLIER_COMPANY_DETAILS.legalName.toLowerCase();

      if (
        !isMock &&
        !isProvider &&
        !clientMap.has(c.id) &&
        !clientMap.has(c.organizationId || '') &&
        !Array.from(clientMap.values()).some((existing) => existing.legalName.toLowerCase() === lowerName)
      ) {
        clientMap.set(c.id, c);
      }
    });

    return Array.from(clientMap.values());
  }

  public getClientById(id: string): CommercialClient | undefined {
    return this.clients.find((c) => c.id === id);
  }

  public addClient(client: CommercialClient): void {
    this.clients.unshift(client);
    this.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(this.clients));

    if (isSupabaseEnabled) {
      supabase
        .from('commercial_clients')
        .upsert({
          id: client.id,
          client_code: client.clientCode,
          legal_name: client.legalName,
          organization_id: client.organizationId,
          industry: client.industry,
          employee_count: client.employeeCount,
          gstin: client.gstin,
          pan: client.pan,
          cin: client.cin,
          billing_address: client.billingAddress,
          primary_contact: client.primaryContact,
          billing_contact: client.billingContact,
          commercial_status: client.commercialStatus,
          notes: client.notes,
          updated_at: new Date().toISOString(),
        })
        .then(() => {}, () => {});
    }
  }

  public updateClient(client: CommercialClient): void {
    const idx = this.clients.findIndex((c) => c.id === client.id);
    if (idx >= 0) {
      this.clients[idx] = client;
      this.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(this.clients));

      if (isSupabaseEnabled) {
        supabase
          .from('commercial_clients')
          .upsert({
            id: client.id,
            client_code: client.clientCode,
            legal_name: client.legalName,
            organization_id: client.organizationId,
            industry: client.industry,
            employee_count: client.employeeCount,
            gstin: client.gstin,
            pan: client.pan,
            cin: client.cin,
            billing_address: client.billingAddress,
            primary_contact: client.primaryContact,
            billing_contact: client.billingContact,
            commercial_status: client.commercialStatus,
            notes: client.notes,
            updated_at: new Date().toISOString(),
          })
          .then(() => {}, () => {});
      }
    }
  }

  public async deleteClient(id: string): Promise<void> {
    this.clients = this.clients.filter((c) => c.id !== id);
    this.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(this.clients));
    this.notifyDataUpdated('commercial_clients');

    if (isSupabaseEnabled) {
      try {
        await supabase.from('commercial_clients').delete().eq('id', id);
      } catch (err) {
        console.warn('Failed to delete remote client:', err);
      }
    }
  }

  public async deleteQuotation(id: string): Promise<void> {
    this.quotations = this.quotations.filter((q) => q.id !== id);
    this.setItem(STORAGE_KEY_QUOTES, JSON.stringify(this.quotations));
    this.notifyDataUpdated('commercial_quotations');

    if (isSupabaseEnabled) {
      try {
        await supabase.from('commercial_quotations').delete().eq('id', id);
      } catch (err) {
        console.warn('Failed to delete remote quotation:', err);
      }
    }
  }

  public getQuotations(): CommercialQuotation[] {
    return this.quotations;
  }

  public getQuotationById(id: string): CommercialQuotation | undefined {
    return this.quotations.find((q) => q.id === id);
  }

  public saveQuotation(quote: CommercialQuotation): void {
    const idx = this.quotations.findIndex((q) => q.id === quote.id);
    if (idx >= 0) {
      this.quotations[idx] = quote;
    } else {
      this.quotations.unshift(quote);
    }
    this.setItem(STORAGE_KEY_QUOTES, JSON.stringify(this.quotations));

    if (isSupabaseEnabled) {
      supabase
        .from('commercial_quotations')
        .upsert({
          id: quote.id,
          quotation_number: quote.quotationNumber,
          version: quote.version,
          origin_type: quote.originType,
          purpose: quote.purpose,
          opportunity_id: quote.opportunityId,
          opportunity_number: quote.opportunityNumber,
          lead_id: quote.leadId,
          lead_number: quote.leadNumber,
          client_id: quote.clientId,
          client_name: quote.clientName,
          client_gstin: quote.clientGstin,
          client_email: quote.clientEmail,
          client_phone: quote.clientPhone,
          client_state: quote.clientState,
          sales_owner: quote.salesOwner,
          plan_code: quote.planCode,
          plan_name: quote.planName,
          billing_cycle: quote.billingCycle,
          employee_count: quote.employeeCount,
          included_employees: quote.includedEmployees,
          additional_employees_count: quote.additionalEmployeesCount,
          pepm_rate: quote.pepmRate,
          selected_addon_keys: quote.selectedAddonKeys,
          requirements: quote.requirements,
          line_items: quote.lineItems,
          one_time_services: quote.oneTimeServices,
          pricing_snapshot: quote.pricingSnapshot,
          approval: quote.approval,
          solution_config: quote.solutionConfig,
          terms: quote.terms,
          status: quote.status,
          valid_until: quote.validUntil,
          converted_client_id: quote.convertedClientId,
          converted_org_id: quote.convertedOrgId,
          converted_subscription_id: quote.convertedSubscriptionId,
          updated_at: new Date().toISOString(),
        })
        .then(() => {}, () => {});
    }
  }

  public updateQuotationStatus(
    id: string,
    status: QuotationStatus,
    actor: string = 'Super Admin',
    comments?: string
  ): void {
    const quote = this.getQuotationById(id);
    if (!quote) return;

    quote.status = status;
    quote.updatedAt = new Date().toISOString();

    if (status === 'APPROVED') {
      quote.approval.approvedBy = actor;
      quote.approval.approvedAt = new Date().toISOString();
      if (comments) quote.approval.approvalComments = comments;
    }

    this.saveQuotation(quote);
  }

  public extendQuotationValidity(id: string, additionalDays: number = 15): CommercialQuotation | undefined {
    const quote = this.getQuotationById(id);
    if (!quote) return undefined;
    const baseDate = new Date(quote.validUntil && !isNaN(new Date(quote.validUntil).getTime()) ? quote.validUntil : new Date());
    const effectiveBase = baseDate > new Date() ? baseDate : new Date();
    effectiveBase.setDate(effectiveBase.getDate() + additionalDays);
    quote.validUntil = effectiveBase.toISOString().split('T')[0];
    quote.updatedAt = new Date().toISOString();
    this.saveQuotation(quote);
    return quote;
  }

  /**
   * Enterprise Commercial Lifecycle: Convert an Accepted Quotation into Client, Org Tenant, Subscription & Invoice.
   * Maintains strict traceability without creating duplicate entities.
   */
  public async convertAcceptedQuotationToClient(
    quoteId: string,
    conversionData?: {
      legalName?: string;
      tradeName?: string;
      logoUrl?: string;
      gstin?: string;
      pan?: string;
      cin?: string;
      billingAddress?: {
        line1: string;
        city: string;
        state: string;
        country: string;
        pinCode: string;
      };
      adminName?: string;
      adminEmail?: string;
      adminPhone?: string;
    }
  ): Promise<{
    client: CommercialClient;
    organizationId: string;
    subscriptionId: string;
    invoice: SaaSInvoice;
  }> {
    const quote = this.getQuotationById(quoteId);
    if (!quote) throw new Error('Quotation not found');

    const subscriptionId = `SUB-${Date.now().toString().slice(-6)}`;
    let client: CommercialClient;
    let targetOrgId = '';

    if (quote.originType === 'EXISTING_CUSTOMER' && quote.clientId) {
      // 1. Existing Customer path — Do NOT create duplicate client
      const found = this.getClientById(quote.clientId);
      if (!found) throw new Error(`Existing client ${quote.clientId} not found`);
      client = found;

      // Link to existing organization tenant
      const existingOrg = platformTenantService.getOrganizations().items.find(
        (o) => o.legal_name.toLowerCase() === client.legalName.toLowerCase() || o.id === client.id
      );
      targetOrgId = existingOrg?.id || `org-${client.id}`;
    } else {
      // 2. New Customer (Prospect) path — Lead → Client conversion
      const legalName = conversionData?.legalName || quote.clientName;
      const gstin = conversionData?.gstin || quote.clientGstin || 'Pending Verification';
      const pan = conversionData?.pan || (gstin.length >= 12 ? gstin.slice(2, 12) : 'PANPending');
      const resolvedLogoUrl = conversionData?.logoUrl || quote.clientLogoUrl;

      // Check if a client record already exists for this company
      const existingClient = this.clients.find(
        (c) => c.legalName.toLowerCase().trim() === legalName.toLowerCase().trim()
      );

      if (existingClient) {
        client = existingClient;
        if (resolvedLogoUrl && !client.logoUrl) {
          client.logoUrl = resolvedLogoUrl;
          this.updateClient(client);
        }
      } else {
        client = {
          id: `cli-${Date.now().toString().slice(-6)}`,
          clientCode: `CLI-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          legalName,
          tradeName: conversionData?.tradeName || legalName,
          logoUrl: resolvedLogoUrl,
          gstin,
          pan,
          contactPerson: conversionData?.adminName || quote.clientName,
          designation: 'Authorized Representative',
          email: conversionData?.adminEmail || quote.clientEmail,
          phone: conversionData?.adminPhone || quote.clientPhone || '+91 98401 23456',
          billingAddress: conversionData?.billingAddress || {
            line1: 'Corporate Campus, High Tech Zone',
            city: 'Chennai',
            state: quote.clientState || 'Tamil Nadu',
            country: 'India',
            pinCode: '600096',
          },
          industry: quote.requirements?.modulesRequested?.length ? 'Technology & Manufacturing' : 'Enterprise SaaS',
          employeeCount: quote.employeeCount,
          customerType: quote.employeeCount > 500 ? 'Enterprise' : 'Mid-Market',
          status: 'Active',
          createdAt: new Date().toISOString().slice(0, 10),
        };
        this.addClient(client);
      }

      // Provision Organization Tenant if not already present
      const rawSlug = legalName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 24);
      targetOrgId = `org-${rawSlug}`;

      const existingOrg = platformTenantService.getOrganizationById(targetOrgId);
      if (!existingOrg) {
        try {
          const newOrg = await platformTenantService.provisionOrganization({
            company_name: client.legalName,
            display_name: client.tradeName || client.legalName,
            logo_url: resolvedLogoUrl,
            industry: client.industry,
            country: 'India',
            state: client.billingAddress.state,
            city: client.billingAddress.city,
            gstin: client.gstin !== 'Pending Verification' ? client.gstin : undefined,
            pan: client.pan !== 'PANPending' ? client.pan : undefined,
            cin: conversionData?.cin,
            admin_name: client.contactPerson,
            admin_email: client.email,
            admin_phone: client.phone,
            plan: quote.planName as any,
            billing_cycle: quote.billingCycle,
            is_trial: false,
          });
          targetOrgId = newOrg.id;
        } catch {
          // If provisioning caught an expected collision, link to existing
          targetOrgId = `org-${rawSlug}`;
        }
      }

      // Update CRM Lead status & linkage
      if (quote.leadId) {
        const lead = this.getLeadById(quote.leadId);
        if (lead) {
          lead.stage = 'WON';
          lead.convertedClientId = client.id;
          this.saveLead(lead);
        }
      }

      // Update CRM Opportunity status & linkage
      if (quote.opportunityId) {
        const opp = this.getOpportunityById(quote.opportunityId);
        if (opp) {
          opp.stage = 'WON';
          opp.clientId = client.id;
          opp.clientName = client.legalName;
          this.saveOpportunity(opp);
        }
      }
    }

    // Freeze linkages onto Quotation
    quote.status = 'CONVERTED';
    quote.clientId = client.id;
    quote.clientName = client.legalName;
    if (client.gstin && client.gstin !== 'Pending Verification') {
      quote.clientGstin = client.gstin;
    }
    quote.convertedClientId = client.id;
    quote.convertedOrgId = targetOrgId;
    quote.convertedSubscriptionId = subscriptionId;
    quote.updatedAt = new Date().toISOString().slice(0, 10);
    this.saveQuotation(quote);

    // Auto-sync Tenant Feature Entitlements & Add-ons from Approved Quotation
    try {
      if (typeof window !== 'undefined') {
        const entitlementMap: Record<string, boolean> = {};

        // If specific modules were requested or customized in quotation:
        if (quote.requirements?.modulesRequested && quote.requirements.modulesRequested.length > 0) {
          quote.requirements.modulesRequested.forEach((modKey) => {
            entitlementMap[modKey] = true;
          });
        }

        // Addons in quotation
        const addonKeys: string[] = quote.selectedAddonKeys || [];
        addonKeys.forEach((addonKey) => {
          if (addonKey.includes('lms')) entitlementMap['lms'] = true;
          if (addonKey.includes('biometric')) entitlementMap['biometric'] = true;
          if (addonKey.includes('vendor')) entitlementMap['vendor_management'] = true;
          if (addonKey.includes('gps')) entitlementMap['gps'] = true;
        });

        if (Object.keys(entitlementMap).length > 0) {
          localStorage.setItem(`workforce_feature_entitlements_${targetOrgId}`, JSON.stringify(entitlementMap));
        }
        if (addonKeys.length > 0) {
          localStorage.setItem(`workforce_tenant_addons_${targetOrgId}`, JSON.stringify(addonKeys));
        }

        // Also register Customer Commercial Override in saasCatalogueService:
        saasCatalogueService.saveCustomerOverride({
          id: `ovr-${targetOrgId}`,
          tenantId: targetOrgId,
          tenantName: client.legalName,
          basePlan: quote.planCode || (quote.planName as any) || 'STARTER',
          customContractPriceMonthly: quote.pricingSnapshot.recurringPreTax || 0,
          customEmployeeCount: quote.employeeCount || 50,
          includedAddons: addonKeys,
          featureOverrides: entitlementMap,
          limitOverrides: {},
          startDate: new Date().toISOString().slice(0, 10),
          endDate: quote.terms?.subscriptionStartDate ? '2028-12-31' : '2027-12-31',
          billingFrequency: quote.billingCycle || 'Monthly',
          notes: `Provisioned from Accepted Quotation #${quote.quotationNumber}`,
          approvedBy: 'Auto Provisioning Engine (Quotation Accepted)',
          approvedAt: new Date().toISOString(),
        });
      }
    } catch (syncErr) {
      console.warn('[saasCommercialService] Failed to auto-sync tenant entitlements from quotation:', syncErr);
    }

    // Generate First Official Tax Invoice from immutable pricing snapshot
    const invoiceNumber = `INV/26-27/000${this.invoices.length + 185}`;
    const isInterState = client.billingAddress.state !== SUPPLIER_COMPANY_DETAILS.state;
    const taxableValue = quote.pricingSnapshot.recurringPreTax + quote.pricingSnapshot.oneTimePreTax;
    const totalTax = Math.round(taxableValue * 0.18);
    const cgstAmount = isInterState ? 0 : Math.round(totalTax / 2);
    const sgstAmount = isInterState ? 0 : Math.round(totalTax / 2);
    const igstAmount = isInterState ? totalTax : 0;
    const totalInvoiceAmount = taxableValue + totalTax;

    const newInvoice: SaaSInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      invoiceType: 'TAX_INVOICE',
      financialYear: '26-27',
      clientId: client.id,
      clientName: client.legalName,
      clientGstin: client.gstin !== 'Pending Verification' ? client.gstin : '33AABCJ1928K1Z5',
      clientAddress: `${client.billingAddress.line1}, ${client.billingAddress.city}, ${client.billingAddress.state} ${client.billingAddress.pinCode}`,
      clientState: client.billingAddress.state,
      supplierName: SUPPLIER_COMPANY_DETAILS.legalName,
      supplierGstin: SUPPLIER_COMPANY_DETAILS.gstin,
      supplierState: SUPPLIER_COMPANY_DETAILS.state,
      placeOfSupply: client.billingAddress.state,
      isInterState,
      subscriptionId,
      quotationId: quote.id,
      billingPeriodStart: new Date().toISOString().slice(0, 10),
      billingPeriodEnd: new Date(Date.now() + (quote.billingCycle === 'Annual' ? 365 : 30) * 86400000).toISOString().slice(0, 10),
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      paymentTerms: '15 Days Net',
      lineItems: [
        {
          id: `li-${Date.now()}-1`,
          sku: `PLAN-${quote.planCode}`,
          description: `${quote.planName} SaaS Plan — (${quote.employeeCount} Employees, ${quote.billingCycle})`,
          quantity: 1,
          unit: quote.billingCycle === 'Annual' ? 'Year' : 'Month',
          unitPrice: quote.pricingSnapshot.recurringPreTax,
          discount: 0,
          taxableValue: quote.pricingSnapshot.recurringPreTax,
          sacCode: '998313',
          cgstRate: isInterState ? 0 : 9,
          cgstAmount: isInterState ? 0 : Math.round(quote.pricingSnapshot.recurringPreTax * 0.09),
          sgstRate: isInterState ? 0 : 9,
          sgstAmount: isInterState ? 0 : Math.round(quote.pricingSnapshot.recurringPreTax * 0.09),
          igstRate: isInterState ? 18 : 0,
          igstAmount: isInterState ? Math.round(quote.pricingSnapshot.recurringPreTax * 0.18) : 0,
          totalLineAmount: quote.pricingSnapshot.recurringPreTax + Math.round(quote.pricingSnapshot.recurringPreTax * 0.18),
        },
      ],
      subtotal: taxableValue,
      discountAmount: quote.pricingSnapshot.discountAmount,
      taxableValue,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalTax,
      totalInvoiceAmount,
      amountPaid: 0,
      balanceDue: totalInvoiceAmount,
      status: 'Issued',
      bankDetails: SUPPLIER_COMPANY_DETAILS.bankDetails,
      payments: [],
      createdAt: new Date().toISOString(),
      notes: `Invoice generated automatically upon commercial conversion of quotation ${quote.quotationNumber}.`,
    };

    this.invoices.unshift(newInvoice);
    this.setItem(STORAGE_KEY_INVOICES, JSON.stringify(this.invoices));

    return {
      client,
      organizationId: targetOrgId,
      subscriptionId,
      invoice: newInvoice,
    };
  }

  /**
   * Backwards compatible 1-Click convert helper
   */
  public async convertQuotationToSubscription(quoteId: string): Promise<{ subscriptionId: string; invoiceId: string }> {
    const res = await this.convertAcceptedQuotationToClient(quoteId);
    return { subscriptionId: res.subscriptionId, invoiceId: res.invoice.id };
  }

  public getInvoices(): SaaSInvoice[] {
    const orgs = platformTenantService.getOrganizations().items;
    const invoiceMap = new Map<string, SaaSInvoice>();

    const isSupplierSelf = (name: string, id: string) => {
      const lower = (name || '').toLowerCase();
      const idLower = (id || '').toLowerCase();
      return (
        idLower === 'org-joy-corp' ||
        idLower.includes('joy-corp') ||
        lower.includes('joy corporate solutions') ||
        lower === SUPPLIER_COMPANY_DETAILS.legalName.toLowerCase()
      );
    };

    let invoiceCounter = 1;

    // 1. Generate real statutory invoices for active organizations based on their real subscriptions
    orgs.forEach((org) => {
      if (isSupplierSelf(org.legal_name, org.id)) {
        return; // Skip platform provider org (no self-billing)
      }

      const tenantDisplay = formatTenantDisplayId(org.id);
      const subDisplay = formatSubscriptionDisplayId(org.id);
      const invoiceNumber = `INV-2026-${String(invoiceCounter++).padStart(6, '0')}`;
      const planPricing: Record<string, number> = {
        Starter: 18000,
        Professional: 45000,
        Business: 85000,
        Enterprise: 180000,
      };
      const subtotal = org.mrr || planPricing[org.plan] || 45000;
      const gstAmount = Math.round(subtotal * 0.18);
      const cgst = Math.round(gstAmount / 2);
      const sgst = Math.round(gstAmount / 2);
      const totalAmount = subtotal + gstAmount;
      const isPaid = org.billing_status === 'Paid' || String(org.billing_status).toUpperCase() === 'PAID';

      const inv: SaaSInvoice = {
        id: `inv-${org.id}`,
        invoiceNumber,
        invoiceType: 'TAX_INVOICE',
        financialYear: '26-27',
        clientId: org.id,
        clientName: org.legal_name,
        clientGstin: org.gstin || '33AABCT9981K1Z9',
        clientAddress: `${org.city || 'Coimbatore'}, ${org.state || 'Tamil Nadu'}, India`,
        clientState: org.state || 'Tamil Nadu',
        supplierName: SUPPLIER_COMPANY_DETAILS.legalName,
        supplierGstin: SUPPLIER_COMPANY_DETAILS.gstin,
        supplierState: SUPPLIER_COMPANY_DETAILS.state,
        placeOfSupply: 'Tamil Nadu (33)',
        isInterState: false,
        subscriptionId: subDisplay,
        billingPeriodStart: org.created_at ? org.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        billingPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        invoiceDate: org.created_at ? org.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
        paymentTerms: '15 Days Net',
        lineItems: [
          {
            id: `li-inv-${org.id}-1`,
            sku: `PLAN-${org.plan.toUpperCase()}`,
            description: `Joy PeopleHR SaaS Subscription — ${org.plan} Tier (${org.seat_limit} Seats Included)`,
            quantity: 1,
            unit: 'Month',
            unitPrice: subtotal,
            discount: 0,
            taxableValue: subtotal,
            sacCode: '998315',
            cgstRate: 9,
            cgstAmount: cgst,
            sgstRate: 9,
            sgstAmount: sgst,
            igstRate: 0,
            igstAmount: 0,
            totalLineAmount: totalAmount,
          },
        ],
        subtotal,
        discountAmount: 0,
        taxableValue: subtotal,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: 0,
        totalTax: gstAmount,
        totalInvoiceAmount: totalAmount,
        amountPaid: isPaid ? totalAmount : 0,
        balanceDue: isPaid ? 0 : totalAmount,
        status: isPaid ? 'Paid' : 'Issued',
        bankDetails: SUPPLIER_COMPANY_DETAILS.bankDetails,
        payments: isPaid
          ? [
              {
                id: `pay-${org.id}`,
                paymentNumber: `PAY-2026-${tenantDisplay.replace(/^TEN-/, '')}`,
                invoiceId: `inv-${org.id}`,
                amount: totalAmount,
                method: 'Bank Transfer (NEFT/RTGS)',
                utrOrReference: `RZP-${tenantDisplay.replace(/^TEN-/, '')}`,
                paymentDate: org.created_at ? org.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
                receivedBy: 'Payment Gateway Clearing',
                verified: true,
              },
            ]
          : [],
        createdAt: org.created_at || new Date().toISOString(),
        notes: `Subscription billing invoice for ${org.legal_name}.`,
      };

      invoiceMap.set(inv.id, inv);
    });

    // 2. Also append any user-created or quote-converted invoices (excluding mock seed ones & self-billing)
    this.invoices.forEach((inv) => {
      const lowerName = (inv.clientName || '').toLowerCase();
      const isMock = inv.id.startsWith('inv-0') || lowerName.includes('abc industries') || lowerName.includes('xyz logistics');
      const isSelf = isSupplierSelf(inv.clientName, inv.clientId);
      if (!isMock && !isSelf && !invoiceMap.has(inv.id)) {
        invoiceMap.set(inv.id, inv);
      }
    });

    // 3. For registered commercial clients that do not have an invoice yet, generate their official subscription invoice
    this.clients.forEach((client) => {
      if (isSupplierSelf(client.legalName, client.id)) return;
      const hasInvoice = Array.from(invoiceMap.values()).some(
        (inv) => inv.clientId === client.id || inv.clientName.toLowerCase() === client.legalName.toLowerCase()
      );
      if (!hasInvoice) {
        const subtotal = 45000;
        const isInterState = client.billingAddress?.state !== SUPPLIER_COMPANY_DETAILS.state;
        const totalTax = Math.round(subtotal * 0.18);
        const cgst = isInterState ? 0 : Math.round(totalTax / 2);
        const sgst = isInterState ? 0 : Math.round(totalTax / 2);
        const igst = isInterState ? totalTax : 0;
        const total = subtotal + totalTax;
        const invoiceNumber = `INV-2026-${String(invoiceCounter++).padStart(6, '0')}`;
        const inv: SaaSInvoice = {
          id: `inv-cli-${client.id}`,
          invoiceNumber,
          invoiceType: 'TAX_INVOICE',
          financialYear: '26-27',
          clientId: client.id,
          clientName: client.legalName,
          clientGstin: client.gstin || '33AABCT9981K1Z9',
          clientAddress: `${client.billingAddress?.line1 || 'High Tech Zone'}, ${client.billingAddress?.city || 'Chennai'}, ${client.billingAddress?.state || 'Tamil Nadu'} ${client.billingAddress?.pinCode || '600001'}`,
          clientState: client.billingAddress?.state || 'Tamil Nadu',
          supplierName: SUPPLIER_COMPANY_DETAILS.legalName,
          supplierGstin: SUPPLIER_COMPANY_DETAILS.gstin,
          supplierState: SUPPLIER_COMPANY_DETAILS.state,
          placeOfSupply: `${client.billingAddress?.state || 'Tamil Nadu'} (${(client.billingAddress?.state || 'Tamil Nadu') === 'Tamil Nadu' ? '33' : '36'})`,
          isInterState,
          subscriptionId: `SUB-2026-${client.clientCode.replace(/^CLI-2026-/, '')}`,
          billingPeriodStart: client.createdAt || new Date().toISOString().slice(0, 10),
          billingPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          invoiceDate: client.createdAt || new Date().toISOString().slice(0, 10),
          dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
          paymentTerms: '15 Days Net',
          lineItems: [
            {
              id: `li-inv-${client.id}-1`,
              sku: 'PLAN-PROFESSIONAL',
              description: `Joy PeopleHR SaaS Subscription — Professional Tier (${client.employeeCount || 100} Seats Included)`,
              quantity: 1,
              unit: 'Month',
              unitPrice: subtotal,
              discount: 0,
              taxableValue: subtotal,
              sacCode: '998315',
              cgstRate: isInterState ? 0 : 9,
              cgstAmount: cgst,
              sgstRate: isInterState ? 0 : 9,
              sgstAmount: sgst,
              igstRate: isInterState ? 18 : 0,
              igstAmount: igst,
              totalLineAmount: total,
            },
          ],
          subtotal,
          discountAmount: 0,
          taxableValue: subtotal,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: igst,
          totalTax,
          totalInvoiceAmount: total,
          amountPaid: total,
          balanceDue: 0,
          status: 'Paid',
          bankDetails: SUPPLIER_COMPANY_DETAILS.bankDetails,
          payments: [
            {
              id: `pay-${client.id}`,
              paymentNumber: `PAY-2026-${client.clientCode.replace(/^CLI-2026-/, '')}`,
              invoiceId: `inv-cli-${client.id}`,
              amount: total,
              method: 'Bank Transfer (NEFT/RTGS)',
              utrOrReference: `HDFC${Date.now().toString().slice(-8)}`,
              paymentDate: client.createdAt || new Date().toISOString().slice(0, 10),
              receivedBy: 'Online Clearing Settlement',
              verified: true,
            },
          ],
          createdAt: client.createdAt || new Date().toISOString(),
          notes: `Subscription billing invoice for ${client.legalName}.`,
        };
        invoiceMap.set(inv.id, inv);
      }
    });

    return Array.from(invoiceMap.values());
  }

  public getInvoiceById(id: string): SaaSInvoice | undefined {
    return this.invoices.find((i) => i.id === id);
  }

  public saveInvoice(invoice: SaaSInvoice): void {
    const idx = this.invoices.findIndex((i) => i.id === invoice.id);
    if (idx >= 0) {
      this.invoices[idx] = invoice;
    } else {
      this.invoices.unshift(invoice);
    }
    this.setItem(STORAGE_KEY_INVOICES, JSON.stringify(this.invoices));
  }

  public recordPayment(
    invoiceId: string,
    amount: number,
    method: InvoicePaymentRecord['method'],
    utrOrReference: string,
    receivedBy: string = 'Finance Desk'
  ): void {
    const inv = this.getInvoiceById(invoiceId);
    if (!inv) throw new Error('Invoice not found');

    const payment: InvoicePaymentRecord = {
      id: `pay-${Date.now()}`,
      paymentNumber: `PAY-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      invoiceId,
      amount,
      method,
      utrOrReference,
      paymentDate: new Date().toISOString().slice(0, 10),
      receivedBy,
      verified: true,
    };

    inv.payments.push(payment);
    inv.amountPaid += amount;
    inv.balanceDue = Math.max(0, inv.totalInvoiceAmount - inv.amountPaid);

    if (inv.balanceDue <= 0) {
      inv.status = 'Paid';
    } else {
      inv.status = 'Partially Paid';
    }

    this.saveInvoice(inv);
  }
}

export const saasCommercialService = new SaasCommercialService();
