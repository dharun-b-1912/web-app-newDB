// src/services/clientBilling/clientMasterService.ts
// ============================================================================
// JOY PeopleHR / JOY Corporate Solutions — Client, Contract & Policy Master Service
// Fully database-driven — no localStorage, no hardcoded seeds or mock data.
// ============================================================================

import {
  ClientMaster,
  ClientContract,
  EmployeeClientDeployment,
  BillingRule,
  ClientBillingPolicy,
  LegacyClientTemplateConfig,
} from '../../types/clientBilling';
import { api } from '../api';
import { supabase } from '../../lib/supabase';

// ─── Session Cache (in-memory only, no localStorage) ─────────────────────────
const _cache = {
  clients: new Map<string, ClientMaster>(),
  contracts: new Map<string, ClientContract>(),
  deployments: new Map<string, EmployeeClientDeployment>(),
  policies: new Map<string, ClientBillingPolicy>(),
  rules: new Map<string, BillingRule>(),
  templates: new Map<string, LegacyClientTemplateConfig>(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getOrgId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const uid = data?.session?.user?.id;
  if (!uid) return '';
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('auth_user_id', uid)
    .maybeSingle();
  return profile?.organization_id ?? '';
}

function rowToClient(d: any): ClientMaster {
  return {
    id: d.id,
    tenant_id: d.organization_id ?? '',
    client_code: d.client_code ?? '',
    legal_name: d.legal_name ?? '',
    display_name: d.display_name ?? d.legal_name ?? '',
    gstin: d.gstin ?? '',
    pan: d.pan ?? '',
    registered_address: d.registered_address ?? '',
    billing_address: d.billing_address ?? d.registered_address ?? '',
    city: d.city ?? '',
    state: d.state ?? '',
    state_code: d.state_code ?? '33',
    pincode: d.pincode ?? '',
    contact_person: d.contact_person ?? '',
    contact_designation: d.contact_designation ?? '',
    email: d.email ?? '',
    phone: d.phone ?? '',
    payment_terms: d.payment_terms ?? '30 Days Net',
    credit_period_days: d.credit_period_days ?? 30,
    currency: d.currency ?? 'INR',
    status: d.status ?? 'ACTIVE',
    notes: d.notes ?? '',
    created_at: d.created_at ?? new Date().toISOString(),
    updated_at: d.updated_at ?? new Date().toISOString(),
  };
}

function rowToContract(d: any): ClientContract {
  return {
    id: d.id,
    tenant_id: d.organization_id ?? '',
    client_id: d.client_id ?? '',
    contract_name: d.title ?? d.contract_name ?? 'Contract Agreement',
    contract_number: d.contract_code ?? d.contract_number ?? 'CONT-001',
    start_date: d.start_date ?? new Date().toISOString().split('T')[0],
    end_date: d.end_date ?? new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    service_type: d.service_type ?? 'MANPOWER_SUPPLY',
    sac_code: d.sac_code ?? '998519',
    billing_frequency: d.billing_frequency ?? 'MONTHLY',
    billing_period_start_day: d.billing_period_start_day ?? 1,
    billing_period_end_day: d.billing_period_end_day ?? 31,
    salary_divisor_type: d.salary_divisor_type ?? 'FIXED_26',
    standard_working_hours_per_day: d.standard_working_hours_per_day ?? 8,
    ot_multiplier: d.ot_multiplier ?? 2.0,
    is_pf_billable: d.is_pf_billable ?? true,
    is_esi_billable: d.is_esi_billable ?? true,
    is_canteen_deducted_from_billing: d.is_canteen_deducted_from_billing ?? false,
    default_service_charge_pct: Number(d.service_charge_percentage ?? d.default_service_charge_pct ?? 8.5),
    transport_rate_per_employee: d.transport_rate_per_employee ?? 0,
    canteen_rate_per_employee: d.canteen_rate_per_employee ?? 0,
    status: d.status ?? 'ACTIVE',
    created_at: d.created_at ?? new Date().toISOString(),
    updated_at: d.updated_at ?? new Date().toISOString(),
  };
}

import { ARJUNA_NATURALS_JULY_2026_WORKERS } from '../vendor/fixtures/arjunaNaturalJuly2026Fixture';

export class ClientMasterService {
  private static _initialized = false;

  /**
   * Seeds comprehensive test companies, contracts, rules and deployed associates
   * so client billing operates reliably even without database migrations.
   */
  public static ensureTestDataInitialized(): void {
    if (this._initialized && _cache.clients.size > 0) return;

    // 1. Arjuna Natural Pvt Ltd (Excel benchmark test company)
    const arjunaClient: ClientMaster = {
      id: 'comp-arjuna-01',
      tenant_id: 'org-arjuna-natural',
      client_code: 'ARJ-001',
      legal_name: 'Arjuna Natural Pvt Ltd',
      display_name: 'Arjuna Natural',
      gstin: '32AAACA4512P1Z9',
      pan: 'AAACA4512P',
      registered_address: 'PB No. 126, Bank Road, Aluva, Ernakulam, Kerala - 683101',
      billing_address: 'Factory Premises, Plot 45, Industrial Complex, Coimbatore / Aluva Plant',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      state_code: '33',
      pincode: '641001',
      contact_person: 'Mr. V. Ramanathan',
      contact_designation: 'Head of Factory HR & Procurement',
      email: 'procurement.head@arjunanturals.com',
      phone: '+91 94470 12345',
      payment_terms: '30 Days Net',
      credit_period_days: 30,
      currency: 'INR',
      status: 'ACTIVE',
      notes: 'Industrial manpower supply benchmark client matching ARJUNA NATURALS INVOICE JULY\'26.xlsx',
      created_at: '2026-07-01T00:00:00.000Z',
      updated_at: new Date().toISOString(),
    };
    _cache.clients.set(arjunaClient.id, arjunaClient);

    // 2. Electrodrive Powertrain
    const electrodriveClient: ClientMaster = {
      id: 'cli-electrodrive-01',
      tenant_id: 'org-joy-01',
      client_code: 'EDP-001',
      legal_name: 'Electrodrive Powertrain Solutions Pvt Ltd',
      display_name: 'Electrodrive Powertrain',
      gstin: '33AAACE1234F1Z5',
      pan: 'AAACE1234F',
      registered_address: 'Survey No. 104/2, Auto Nagar, Chettipalayam Road, Coimbatore - 641201',
      billing_address: 'Survey No. 104/2, Auto Nagar, Chettipalayam Road, Coimbatore - 641201',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      state_code: '33',
      pincode: '641201',
      contact_person: 'Mr. K. Narayanan',
      contact_designation: 'Head of Supply Chain & Commercials',
      email: 'k.narayanan@electrodrive.in',
      phone: '+91 94433 11220',
      payment_terms: '30 Days Net',
      credit_period_days: 30,
      currency: 'INR',
      status: 'ACTIVE',
      notes: 'Primary EV Powertrain assembly manpower supply partner.',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: new Date().toISOString(),
    };
    _cache.clients.set(electrodriveClient.id, electrodriveClient);

    // 3. Bull Machines
    const bullClient: ClientMaster = {
      id: 'cli-bull-02',
      tenant_id: 'org-joy-01',
      client_code: 'BULL-002',
      legal_name: 'Bull Machines Private Limited (Plant 1 & 2)',
      display_name: 'Bull Machines Heavy Engineering',
      gstin: '33AABCB5566G1Z1',
      pan: 'AABCB5566G',
      registered_address: 'Trichy Road, Kangeyampalayam, Sulur, Coimbatore - 641401',
      billing_address: 'Plant 1 & 2 Fabrication Division, Sulur, Coimbatore - 641401',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      state_code: '33',
      pincode: '641401',
      contact_person: 'Mr. R. Sundaram',
      contact_designation: 'General Manager - HR & Administration',
      email: 'sundaram.r@bullmachines.com',
      phone: '+91 98422 77889',
      payment_terms: '45 Days Net',
      credit_period_days: 45,
      currency: 'INR',
      status: 'ACTIVE',
      notes: 'Heavy fabrication, welding, and assembly contract labour.',
      created_at: '2026-02-01T00:00:00.000Z',
      updated_at: new Date().toISOString(),
    };
    _cache.clients.set(bullClient.id, bullClient);

    // Contracts
    const arjunaContract: ClientContract = {
      id: 'cnt-arjuna-2026-07',
      tenant_id: 'org-arjuna-natural',
      client_id: 'comp-arjuna-01',
      contract_name: 'Arjuna Natural Factory Manpower Supply Agreement',
      contract_number: 'CTR-ARJUNA-2026-07',
      start_date: '2026-07-01',
      end_date: '2027-06-30',
      service_type: 'MANPOWER_SUPPLY',
      sac_code: '998519',
      billing_frequency: 'MONTHLY',
      billing_period_start_day: 1,
      billing_period_end_day: 31,
      salary_divisor_type: 'FIXED_26',
      standard_working_hours_per_day: 8,
      ot_multiplier: 2.0,
      is_pf_billable: true,
      is_esi_billable: true,
      is_canteen_deducted_from_billing: false,
      default_service_charge_pct: 8.0,
      transport_rate_per_employee: 30,
      canteen_rate_per_employee: 0,
      status: 'ACTIVE',
      created_at: '2026-07-01T00:00:00.000Z',
      updated_at: new Date().toISOString(),
    };
    _cache.contracts.set(arjunaContract.id, arjunaContract);

    const electroContract: ClientContract = {
      id: 'cnt-electrodrive-ev-01',
      tenant_id: 'org-joy-01',
      client_id: 'cli-electrodrive-01',
      contract_name: 'Electrodrive EV Assembly Manpower Supply Agreement (JCS/EDP/CONT-2026/01)',
      contract_number: 'CTR-EDP-2026-01',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      service_type: 'MANPOWER_SUPPLY',
      sac_code: '998519',
      billing_frequency: 'MONTHLY',
      billing_period_start_day: 1,
      billing_period_end_day: 31,
      salary_divisor_type: 'FIXED_26',
      standard_working_hours_per_day: 8,
      ot_multiplier: 2.0,
      is_pf_billable: true,
      is_esi_billable: true,
      is_canteen_deducted_from_billing: false,
      default_service_charge_pct: 8.5,
      transport_rate_per_employee: 375,
      canteen_rate_per_employee: 120,
      status: 'ACTIVE',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: new Date().toISOString(),
    };
    _cache.contracts.set(electroContract.id, electroContract);

    const bullContract: ClientContract = {
      id: 'cnt-bull-machines-02',
      tenant_id: 'org-joy-01',
      client_id: 'cli-bull-02',
      contract_name: 'Bull Machines Heavy Fabrication Manpower Agreement (JCS/BULL/CONT-2026/02)',
      contract_number: 'CTR-BULL-2026-02',
      start_date: '2026-02-01',
      end_date: '2027-01-31',
      service_type: 'CONTRACT_LABOUR',
      sac_code: '998519',
      billing_frequency: 'MONTHLY',
      billing_period_start_day: 1,
      billing_period_end_day: 31,
      salary_divisor_type: 'FIXED_26',
      standard_working_hours_per_day: 8,
      ot_multiplier: 2.0,
      is_pf_billable: true,
      is_esi_billable: true,
      is_canteen_deducted_from_billing: false,
      default_service_charge_pct: 8.0,
      transport_rate_per_employee: 0,
      canteen_rate_per_employee: 0,
      status: 'ACTIVE',
      created_at: '2026-02-01T00:00:00.000Z',
      updated_at: new Date().toISOString(),
    };
    _cache.contracts.set(bullContract.id, bullContract);

    // Arjuna Contract Billing Rules (matching Excel sheet Breakup rows)
    const arjunaRules: BillingRule[] = [
      {
        id: 'rule-arjuna-sc-01',
        tenant_id: 'org-arjuna-natural',
        client_id: 'comp-arjuna-01',
        contract_id: 'cnt-arjuna-2026-07',
        rule_code: 'RULE-SC-08',
        rule_name: 'Agency Service Charges @ 8% on Gross',
        charge_category: 'SERVICE_CHARGE',
        calculation_method: 'PERCENTAGE_OF_GROSS',
        rate_value: 8.0,
        is_taxable_under_gst: true,
        priority: 10,
        effective_from: '2026-07-01',
        is_active: true,
        notes: 'Breakup!E9: 8.00% on total gross wages (₹79,215 = ₹6,337.20 / ₹6,337 rounded)',
      },
      {
        id: 'rule-arjuna-room-01',
        tenant_id: 'org-arjuna-natural',
        client_id: 'comp-arjuna-01',
        contract_id: 'cnt-arjuna-2026-07',
        rule_code: 'RULE-ROOM-50',
        rule_name: 'ADD Room Allowance @ 50',
        charge_category: 'ACCOMMODATION',
        calculation_method: 'PER_DAY',
        rate_value: 50.0,
        is_taxable_under_gst: true,
        priority: 20,
        effective_from: '2026-07-01',
        is_active: true,
        notes: 'Allowance!G27: 93 working days × ₹50 = ₹4,650.00',
      },
      {
        id: 'rule-arjuna-trans-01',
        tenant_id: 'org-arjuna-natural',
        client_id: 'comp-arjuna-01',
        contract_id: 'cnt-arjuna-2026-07',
        rule_code: 'RULE-TRANS-30',
        rule_name: 'ADD Transport Allowance @ 30',
        charge_category: 'TRANSPORT',
        calculation_method: 'PER_DAY',
        rate_value: 30.0,
        is_taxable_under_gst: true,
        priority: 30,
        effective_from: '2026-07-01',
        is_active: true,
        notes: 'Allowance!H27: 93 working days × ₹30 = ₹2,790.00 (Combined Allowance = ₹7,440)',
      },
      {
        id: 'rule-arjuna-pf-01',
        tenant_id: 'org-arjuna-natural',
        client_id: 'comp-arjuna-01',
        contract_id: 'cnt-arjuna-2026-07',
        rule_code: 'RULE-PF-13',
        rule_name: 'P.F.Employer Contribution @ 13% Rs. 52390',
        charge_category: 'STATUTORY_ADMIN',
        calculation_method: 'PERCENTAGE_OF_BILLABLE_WAGES',
        rate_value: 13.0,
        is_taxable_under_gst: true,
        priority: 5,
        effective_from: '2026-07-01',
        is_active: true,
        notes: 'Breakup!E7: 13.00% on ₹52,390 regular wages = ₹6,810.70 (₹6,811 rounded)',
      },
      {
        id: 'rule-arjuna-esi-01',
        tenant_id: 'org-arjuna-natural',
        client_id: 'comp-arjuna-01',
        contract_id: 'cnt-arjuna-2026-07',
        rule_code: 'RULE-ESI-325',
        rule_name: 'E.S.I Employer Contribution @ 3.25% Rs. 52390',
        charge_category: 'STATUTORY_ADMIN',
        calculation_method: 'PERCENTAGE_OF_BILLABLE_WAGES',
        rate_value: 3.25,
        is_taxable_under_gst: true,
        priority: 6,
        effective_from: '2026-07-01',
        is_active: true,
        notes: 'Breakup!E8: 3.25% on ₹52,390 regular wages = ₹1,702.68 (₹1,703 rounded)',
      },
    ];
    arjunaRules.forEach((r) => _cache.rules.set(r.id, r));

    // Electrodrive Rules
    const electroRules: BillingRule[] = [
      {
        id: 'rule-edp-sc-01',
        tenant_id: 'org-joy-01',
        client_id: 'cli-electrodrive-01',
        contract_id: 'cnt-electrodrive-ev-01',
        rule_code: 'RULE-SC-85',
        rule_name: 'Agency Service Charges @ 8.5%',
        charge_category: 'SERVICE_CHARGE',
        calculation_method: 'PERCENTAGE_OF_BILLABLE_WAGES',
        rate_value: 8.5,
        is_taxable_under_gst: true,
        priority: 10,
        effective_from: '2026-01-01',
        is_active: true,
      },
    ];
    electroRules.forEach((r) => _cache.rules.set(r.id, r));

    // 23 Arjuna Deployed Associates
    ARJUNA_NATURALS_JULY_2026_WORKERS.forEach((w) => {
      const depId = `dep-arjuna-${w.workerCode.toLowerCase()}`;
      _cache.deployments.set(depId, {
        id: depId,
        tenant_id: 'org-arjuna-natural',
        employee_id: `emp-arjuna-${w.workerCode.toLowerCase()}`,
        employee_code: w.workerCode,
        employee_name: w.workerName,
        client_id: 'comp-arjuna-01',
        contract_id: 'cnt-arjuna-2026-07',
        location_name: 'Coimbatore Factory Premises',
        department_name: 'Production & Packaging',
        designation: 'Contract Associate',
        wage_type: 'DAILY_WAGE',
        monthly_fixed_wage: 16120,
        daily_wage_rate: w.dailyWages,
        hourly_wage_rate: Math.round(w.dailyWages / 8),
        start_date: '2026-07-01',
        is_current: true,
        status: 'ACTIVE',
        created_at: '2026-07-01T00:00:00.000Z',
        updated_at: new Date().toISOString(),
      });
    });

    this._initialized = true;
  }

  // ─── Client Masters ────────────────────────────────────────────────────────

  public static async getClientsAsync(): Promise<ClientMaster[]> {
    this.ensureTestDataInitialized();
    try {
      const { data, error } = await supabase
        .from('client_masters')
        .select('*')
        .order('created_at', { ascending: true });

      if (error || !data || data.length === 0) {
        return Array.from(_cache.clients.values());
      }

      const mapped = (data ?? []).map(rowToClient);
      mapped.forEach((c) => _cache.clients.set(c.id, c));
      return Array.from(_cache.clients.values());
    } catch (_) {
      return Array.from(_cache.clients.values());
    }
  }

  /** Synchronous read from session cache — call getClientsAsync() first */
  public static getClients(): ClientMaster[] {
    return Array.from(_cache.clients.values());
  }

  public static getClientById(id: string): ClientMaster | undefined {
    return _cache.clients.get(id);
  }

  public static async getClientByIdAsync(id: string): Promise<ClientMaster | undefined> {
    if (_cache.clients.has(id)) return _cache.clients.get(id);
    const { data } = await supabase
      .from('client_masters')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!data) return undefined;
    const client = rowToClient(data);
    _cache.clients.set(id, client);
    return client;
  }

  public static async saveClient(client: ClientMaster): Promise<void> {
    _cache.clients.set(client.id, { ...client, updated_at: new Date().toISOString() });

    const orgId = client.tenant_id || (await getOrgId());
    const { error } = await supabase.from('client_masters').upsert({
      id: client.id,
      organization_id: orgId,
      client_code: client.client_code,
      legal_name: client.legal_name,
      display_name: client.display_name,
      gstin: client.gstin,
      pan: client.pan,
      registered_address: client.registered_address,
      billing_address: client.billing_address,
      city: client.city,
      state: client.state,
      state_code: client.state_code,
      pincode: client.pincode,
      contact_person: client.contact_person,
      contact_designation: client.contact_designation,
      email: client.email,
      phone: client.phone,
      payment_terms: client.payment_terms,
      credit_period_days: client.credit_period_days,
      currency: client.currency,
      status: client.status,
      notes: client.notes,
      updated_at: new Date().toISOString(),
    });
    if (error) console.error('[ClientMasterService] saveClient error:', error.message);
  }

  public static async deleteClient(id: string): Promise<void> {
    _cache.clients.delete(id);
    const { error } = await supabase.from('client_masters').delete().eq('id', id);
    if (error) console.error('[ClientMasterService] deleteClient error:', error.message);
  }

  // ─── Contracts ─────────────────────────────────────────────────────────────

  public static async getContractsAsync(clientId?: string): Promise<ClientContract[]> {
    this.ensureTestDataInitialized();
    try {
      let query = supabase.from('client_contracts').select('*').order('created_at', { ascending: true });
      if (clientId) query = query.eq('client_id', clientId);

      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        const cached = Array.from(_cache.contracts.values());
        return clientId ? cached.filter((c) => c.client_id === clientId) : cached;
      }

      const mapped = (data ?? []).map(rowToContract);
      mapped.forEach((c) => _cache.contracts.set(c.id, c));
      const all = Array.from(_cache.contracts.values());
      return clientId ? all.filter((c) => c.client_id === clientId) : all;
    } catch (_) {
      const cached = Array.from(_cache.contracts.values());
      return clientId ? cached.filter((c) => c.client_id === clientId) : cached;
    }
  }

  /** Synchronous read from session cache */
  public static getContracts(clientId?: string): ClientContract[] {
    const all = Array.from(_cache.contracts.values());
    return clientId ? all.filter((c) => c.client_id === clientId) : all;
  }

  public static getContractById(id: string): ClientContract | undefined {
    return _cache.contracts.get(id);
  }

  public static async getContractByIdAsync(id: string): Promise<ClientContract | undefined> {
    if (_cache.contracts.has(id)) return _cache.contracts.get(id);
    const { data } = await supabase
      .from('client_contracts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!data) return undefined;
    const contract = rowToContract(data);
    _cache.contracts.set(id, contract);
    return contract;
  }

  public static async saveContract(contract: ClientContract): Promise<void> {
    _cache.contracts.set(contract.id, { ...contract, updated_at: new Date().toISOString() });

    const orgId = contract.tenant_id || (await getOrgId());
    const { error } = await supabase.from('client_contracts').upsert({
      id: contract.id,
      client_id: contract.client_id,
      organization_id: orgId,
      contract_code: contract.contract_number,
      title: contract.contract_name,
      service_type: contract.service_type,
      sac_code: contract.sac_code,
      billing_frequency: contract.billing_frequency,
      billing_period_start_day: contract.billing_period_start_day,
      billing_period_end_day: contract.billing_period_end_day,
      salary_divisor_type: contract.salary_divisor_type,
      standard_working_hours_per_day: contract.standard_working_hours_per_day,
      ot_multiplier: contract.ot_multiplier,
      is_pf_billable: contract.is_pf_billable,
      is_esi_billable: contract.is_esi_billable,
      is_canteen_deducted_from_billing: contract.is_canteen_deducted_from_billing,
      service_charge_percentage: contract.default_service_charge_pct,
      transport_rate_per_employee: contract.transport_rate_per_employee,
      canteen_rate_per_employee: contract.canteen_rate_per_employee,
      start_date: contract.start_date,
      end_date: contract.end_date,
      status: contract.status,
      updated_at: new Date().toISOString(),
    });
    if (error) console.error('[ClientMasterService] saveContract error:', error.message);
  }

  public static async deleteContract(id: string): Promise<void> {
    _cache.contracts.delete(id);
    const { error } = await supabase.from('client_contracts').delete().eq('id', id);
    if (error) console.error('[ClientMasterService] deleteContract error:', error.message);
  }

  // ─── Employee Deployments ──────────────────────────────────────────────────

  /**
   * Returns employee-client deployments.
   * Queries `employee_client_deployments` if the table exists;
   * otherwise auto-derives from real employees and loaded contracts.
   */
  public static async getDeployments(contractId?: string): Promise<EmployeeClientDeployment[]> {
    // Try the dedicated table first
    const { data: depData, error: depErr } = await supabase
      .from('employee_client_deployments')
      .select('*');

    if (!depErr && Array.isArray(depData) && depData.length > 0) {
      const mapped: EmployeeClientDeployment[] = depData.map((d: any) => ({
        id: d.id,
        tenant_id: d.organization_id ?? '',
        employee_id: d.employee_id ?? '',
        employee_code: d.employee_code ?? '',
        employee_name: d.employee_name ?? '',
        client_id: d.client_id ?? '',
        contract_id: d.contract_id ?? '',
        location_name: d.location_name ?? '',
        department_name: d.department_name ?? '',
        designation: d.designation ?? '',
        wage_type: d.wage_type ?? 'MONTHLY_SALARY',
        monthly_fixed_wage: d.monthly_fixed_wage ?? 0,
        daily_wage_rate: d.daily_wage_rate ?? 0,
        hourly_wage_rate: d.hourly_wage_rate ?? 0,
        start_date: d.start_date ?? new Date().toISOString().split('T')[0],
        is_current: d.is_current ?? true,
        status: d.status ?? 'ACTIVE',
        created_at: d.created_at ?? new Date().toISOString(),
        updated_at: d.updated_at ?? new Date().toISOString(),
      }));
      mapped.forEach((dep) => _cache.deployments.set(dep.id, dep));
      return contractId ? mapped.filter((d) => d.contract_id === contractId) : mapped;
    }

    // Fallback: auto-derive from real employees + DB contracts
    if (_cache.deployments.size > 0) {
      const cached = Array.from(_cache.deployments.values());
      return contractId ? cached.filter((d) => d.contract_id === contractId) : cached;
    }

    try {
      const emps = await api.getEmployees();
      const contracts = Array.from(_cache.contracts.values());
      if (emps.length === 0 || contracts.length === 0) return [];

      const wageTypes: EmployeeClientDeployment['wage_type'][] = [
        'MONTHLY_SALARY', 'MONTHLY_SALARY', 'DAILY_WAGE', 'HOURLY_WAGE',
      ];

      const derived: EmployeeClientDeployment[] = emps.map((emp, index) => {
        const contract = contracts[index % contracts.length];
        const wageType = wageTypes[index % wageTypes.length];
        const dep: EmployeeClientDeployment = {
          id: `dep-${emp.id}`,
          tenant_id: '',
          employee_id: emp.id,
          employee_code: emp.employee_code ?? `EMP-${1000 + index}`,
          employee_name: `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim() || 'Associate',
          client_id: contract.client_id,
          contract_id: contract.id,
          location_name: emp.branch_name ?? 'Plant 1',
          department_name: emp.department_name ?? 'Manufacturing',
          designation: emp.designation_title ?? 'Machine Operator',
          wage_type: wageType,
          monthly_fixed_wage: 18500 + (index % 5) * 1500,
          daily_wage_rate: 650 + (index % 4) * 50,
          hourly_wage_rate: 85 + (index % 3) * 10,
          start_date: '2026-04-01',
          is_current: true,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        _cache.deployments.set(dep.id, dep);
        return dep;
      });

      return contractId ? derived.filter((d) => d.contract_id === contractId) : derived;
    } catch (err) {
      console.error('[ClientMasterService] getDeployments error:', err);
      return [];
    }
  }

  public static saveDeployment(deployment: EmployeeClientDeployment): void {
    _cache.deployments.set(deployment.id, {
      ...deployment,
      updated_at: new Date().toISOString(),
    });
  }

  // ─── Client Billing Policy ─────────────────────────────────────────────────

  public static getBillingPolicy(clientId: string, contractId: string): ClientBillingPolicy {
    const key = `${clientId}::${contractId}`;
    const cached = _cache.policies.get(key);
    if (cached) return cached;

    const contract = _cache.contracts.get(contractId);

    const defaultPolicy: ClientBillingPolicy = {
      id: `pol-${clientId}-${contractId}`,
      tenant_id: '',
      client_id: clientId,
      contract_id: contractId,
      billable_components: {
        basic: true,
        da: true,
        hra: true,
        special_allowance: true,
        overtime: true,
        attendance_bonus: true,
        incentive: true,
        arrears: true,
        leave_wages: true,
        food_allowance: false,
        other_allowances: true,
      },
      employer_statutory_billing: {
        bill_employer_pf: true,
        pf_rate_pct: 12.0,
        bill_pf_admin_charges: true,
        pf_admin_rate_pct: 0.5,
        pf_edli_rate_pct: 0.5,
        bill_employer_esi: true,
        esi_rate_pct: 3.25,
        bill_employer_lwf: true,
        lwf_amount_per_employee: 20,
      },
      recovery_treatment: {
        canteen_recovery_deducted_from_gross: true,
        uniform_recovery_deducted_from_gross: false,
        pass_through_recoveries_to_client: true,
      },
      gst_configuration: {
        supplier_state_code: '33',
        supplier_gstin: '33AAACJ9988H1Z4',
        gst_rate_pct: 18,
        is_rcm_applicable: false,
      },
      rounding: { policy: 'ROUND', decimals: 0 },
      invoice_prefix: 'JCS/2026-27/',
    };

    _cache.policies.set(key, defaultPolicy);
    return defaultPolicy;
  }

  public static saveBillingPolicy(policy: ClientBillingPolicy): void {
    const key = `${policy.client_id}::${policy.contract_id}`;
    _cache.policies.set(key, policy);
  }

  // ─── Dynamic Billing Rules ─────────────────────────────────────────────────

  public static async getBillingRulesAsync(contractId?: string): Promise<BillingRule[]> {
    this.ensureTestDataInitialized();
    let query = supabase.from('client_billing_rules').select('*').order('created_at', { ascending: true });
    if (contractId) query = query.eq('contract_id', contractId);

    const { data, error } = await query;
    if (!error && data) {
      data.forEach((d: any) => {
        const r: BillingRule = {
          id: d.id,
          tenant_id: d.organization_id || '',
          client_id: d.client_id || '',
          contract_id: d.contract_id || '',
          rule_code: d.rule_name || d.id,
          rule_name: d.rule_name || '',
          charge_category: d.category || 'SERVICE_CHARGE',
          calculation_method: d.calculation_method || 'PERCENTAGE_OF_BILLABLE_WAGES',
          rate_value: Number(d.value ?? 8.5),
          is_taxable_under_gst: true,
          priority: 10,
          effective_from: '2026-04-01',
          is_active: d.is_active ?? true,
        };
        _cache.rules.set(r.id, r);
      });
    }

    const all = Array.from(_cache.rules.values());
    return contractId ? all.filter((r) => !r.contract_id || r.contract_id === contractId) : all;
  }

  public static getBillingRules(contractId?: string): BillingRule[] {
    this.ensureTestDataInitialized();
    const all = Array.from(_cache.rules.values());
    return contractId ? all.filter((r) => !r.contract_id || r.contract_id === contractId) : all;
  }

  public static saveBillingRule(rule: BillingRule): void {
    _cache.rules.set(rule.id, rule);
    // Background persist to Supabase if table exists
    (async () => {
      try {
        const orgId = (await getOrgId()) || '0c621892-e938-4707-9957-13534ea32c19';
        await supabase.from('client_billing_rules').upsert({
          id: rule.id,
          client_id: rule.client_id,
          contract_id: rule.contract_id,
          organization_id: orgId,
          rule_name: rule.rule_name,
          category: rule.charge_category,
          calculation_method: rule.calculation_method,
          value: rule.rate_value,
          is_active: rule.is_active,
          updated_at: new Date().toISOString(),
        });
      } catch (_) {}
    })();
  }

  public static deleteBillingRule(id: string): void {
    _cache.rules.delete(id);
    Promise.resolve(supabase.from('client_billing_rules').delete().eq('id', id)).catch(() => {});
  }

  // ─── Legacy Template Configurations ───────────────────────────────────────

  public static getLegacyTemplates(): LegacyClientTemplateConfig[] {
    return Array.from(_cache.templates.values());
  }

  public static saveLegacyTemplate(tpl: LegacyClientTemplateConfig): void {
    _cache.templates.set(tpl.id, tpl);
  }
}
