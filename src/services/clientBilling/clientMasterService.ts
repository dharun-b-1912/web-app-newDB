// src/services/clientBilling/clientMasterService.ts
// ============================================================================
// JOY PeopleHR / JOY Corporate Solutions — Client, Contract & Policy Master Service
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

const STORAGE_KEYS = {
  CLIENTS: 'joy_client_master_list',
  CONTRACTS: 'joy_client_contracts_list',
  DEPLOYMENTS: 'joy_employee_client_deployments',
  POLICIES: 'joy_client_billing_policies',
  RULES: 'joy_client_billing_rules',
  LEGACY_TEMPLATES: 'joy_legacy_template_configs',
};

// Seed Enterprise Master Clients & Contracts
const SEED_CLIENTS: ClientMaster[] = [
  {
    id: 'cli-electrodrive-01',
    tenant_id: 'org-joy-01',
    client_code: 'EDP-001',
    legal_name: 'Electrodrive Powertrain Solutions Pvt Ltd',
    display_name: 'Electrodrive Powertrain',
    gstin: '33AAACE1234F1Z5',
    pan: 'AAACE1234F',
    registered_address: 'Survey No. 104/2, Auto Nagar, Chettipalayam Road',
    billing_address: 'Survey No. 104/2, Auto Nagar, Chettipalayam Road',
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
    created_at: '2026-01-15T09:00:00.000Z',
    updated_at: '2026-08-20T10:00:00.000Z',
  },
  {
    id: 'cli-bull-02',
    tenant_id: 'org-joy-01',
    client_code: 'BULL-002',
    legal_name: 'Bull Machines Private Limited (Plant 1 & 2)',
    display_name: 'Bull Machines Heavy Engineering',
    gstin: '33AABCB5566G1Z1',
    pan: 'AABCB5566G',
    registered_address: 'Trichy Road, Kangeyampalayam, Sulur',
    billing_address: 'Plant 1 & 2 Fabrication Division, Sulur',
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
    created_at: '2026-02-01T09:00:00.000Z',
    updated_at: '2026-08-22T11:00:00.000Z',
  },
  {
    id: 'cli-pressmatic-03',
    tenant_id: 'org-joy-01',
    client_code: 'PRESS-003',
    legal_name: 'Pressmatic Precision Engineering Works LLP',
    display_name: 'Pressmatic Precision',
    gstin: '33AAAFP8899K1Z8',
    pan: 'AAAFP8899K',
    registered_address: 'Plot 48, SIDCO Industrial Estate, Kurichi',
    billing_address: 'Plot 48, SIDCO Industrial Estate, Kurichi',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    state_code: '33',
    pincode: '641021',
    contact_person: 'Mr. V. Chandran',
    contact_designation: 'Operations Director',
    email: 'v.chandran@pressmatic.co.in',
    phone: '+91 97890 22334',
    payment_terms: '15 Days Net',
    credit_period_days: 15,
    currency: 'INR',
    status: 'ACTIVE',
    notes: 'Precision stamping, tooling & press operators.',
    created_at: '2026-02-15T09:00:00.000Z',
    updated_at: '2026-08-25T14:00:00.000Z',
  },
  {
    id: 'cli-flowserve-04',
    tenant_id: 'org-joy-01',
    client_code: 'FLOW-004',
    legal_name: 'Flowserve Sanmar Control Valves Pvt Ltd',
    display_name: 'Flowserve Sanmar',
    gstin: '33AABCF4455H1Z3',
    pan: 'AABCF4455H',
    registered_address: '147, Karapakkam, OMR Express Highway',
    billing_address: '147, Karapakkam, OMR Express Highway',
    city: 'Chennai',
    state: 'Tamil Nadu',
    state_code: '33',
    pincode: '600097',
    contact_person: 'Ms. Geetha Subramanian',
    contact_designation: 'Commercial Manager',
    email: 'gsubramanian@flowserve.com',
    phone: '+91 99401 55667',
    payment_terms: '30 Days Net',
    credit_period_days: 30,
    currency: 'INR',
    status: 'ACTIVE',
    notes: 'Daily wage & Shift based valve assembly technicians.',
    created_at: '2026-03-01T09:00:00.000Z',
    updated_at: '2026-08-26T16:00:00.000Z',
  },
  {
    id: 'cli-lgb-05',
    tenant_id: 'org-joy-01',
    client_code: 'LGB-005',
    legal_name: 'L.G. Balakrishnan & Bros Limited (Rolon Division)',
    display_name: 'LGB Rolon Automotive',
    gstin: '33AAACL1122D1Z4',
    pan: 'AAACL1122D',
    registered_address: '6/16/13, Krishnarayapuram Road, Ganapathy',
    billing_address: 'Chain Manufacturing Division, Ganapathy',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    state_code: '33',
    pincode: '641006',
    contact_person: 'Mr. P. Balaji',
    contact_designation: 'Vice President - Manufacturing Operations',
    email: 'p.balaji@lgb.co.in',
    phone: '+91 98940 33445',
    payment_terms: '30 Days Net',
    credit_period_days: 30,
    currency: 'INR',
    status: 'ACTIVE',
    notes: 'Automotive transmission & timing chain assembly workforce.',
    created_at: '2026-03-10T09:00:00.000Z',
    updated_at: '2026-08-27T09:00:00.000Z',
  },
];

const SEED_CONTRACTS: ClientContract[] = [
  {
    id: 'cnt-electrodrive-01',
    tenant_id: 'org-joy-01',
    client_id: 'cli-electrodrive-01',
    contract_name: 'Electrodrive EV Assembly Manpower Supply Agreement',
    contract_number: 'JCS/EDP/CONT-2026/01',
    start_date: '2026-04-01',
    end_date: '2027-03-31',
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
    canteen_rate_per_employee: 650,
    status: 'ACTIVE',
    created_at: '2026-04-01T09:00:00.000Z',
    updated_at: '2026-08-20T10:00:00.000Z',
  },
  {
    id: 'cnt-bull-02',
    tenant_id: 'org-joy-01',
    client_id: 'cli-bull-02',
    contract_name: 'Bull Machines Plant 1 & 2 Technical Staffing Contract',
    contract_number: 'JCS/BULL/CONT-2026/02',
    start_date: '2026-04-01',
    end_date: '2027-03-31',
    service_type: 'CONTRACT_LABOUR',
    sac_code: '998519',
    billing_frequency: 'MONTHLY',
    billing_period_start_day: 1,
    billing_period_end_day: 31,
    salary_divisor_type: 'CLIENT_CUSTOM',
    custom_divisor_days: 27, // Bull Plant specific 27 days cycle
    standard_working_hours_per_day: 8,
    ot_multiplier: 2.0,
    is_pf_billable: true,
    is_esi_billable: true,
    is_canteen_deducted_from_billing: true,
    default_service_charge_pct: 8.0,
    transport_rate_per_employee: 0,
    canteen_rate_per_employee: 550,
    status: 'ACTIVE',
    created_at: '2026-04-01T09:00:00.000Z',
    updated_at: '2026-08-22T11:00:00.000Z',
  },
  {
    id: 'cnt-pressmatic-03',
    tenant_id: 'org-joy-01',
    client_id: 'cli-pressmatic-03',
    contract_name: 'Pressmatic Precision Tooling & Operations Contract',
    contract_number: 'JCS/PRESS/CONT-2026/03',
    start_date: '2026-04-01',
    end_date: '2027-03-31',
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
    is_canteen_deducted_from_billing: true,
    default_service_charge_pct: 8.5,
    transport_rate_per_employee: 350,
    canteen_rate_per_employee: 600,
    status: 'ACTIVE',
    created_at: '2026-04-01T09:00:00.000Z',
    updated_at: '2026-08-25T14:00:00.000Z',
  },
  {
    id: 'cnt-flowserve-04',
    tenant_id: 'org-joy-01',
    client_id: 'cli-flowserve-04',
    contract_name: 'Flowserve Valve Assembly Daily Wage Staffing',
    contract_number: 'JCS/FLOW/CONT-2026/04',
    start_date: '2026-04-01',
    end_date: '2027-03-31',
    service_type: 'CONTRACT_LABOUR',
    sac_code: '998519',
    billing_frequency: 'MONTHLY',
    billing_period_start_day: 1,
    billing_period_end_day: 31,
    salary_divisor_type: 'CALENDAR_DAYS',
    standard_working_hours_per_day: 8,
    ot_multiplier: 1.5,
    is_pf_billable: true,
    is_esi_billable: true,
    is_canteen_deducted_from_billing: false,
    default_service_charge_pct: 9.0,
    transport_rate_per_employee: 400,
    canteen_rate_per_employee: 700,
    status: 'ACTIVE',
    created_at: '2026-04-01T09:00:00.000Z',
    updated_at: '2026-08-26T16:00:00.000Z',
  },
];

export class ClientMasterService {
  private static getStorage<T>(key: string, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private static setStorage<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  // --- Clients Master ---
  public static getClients(): ClientMaster[] {
    const list = this.getStorage<ClientMaster[]>(STORAGE_KEYS.CLIENTS, []);
    if (list.length === 0) {
      this.setStorage(STORAGE_KEYS.CLIENTS, SEED_CLIENTS);
      return SEED_CLIENTS;
    }
    return list;
  }

  public static getClientById(id: string): ClientMaster | undefined {
    return this.getClients().find((c) => c.id === id);
  }

  public static saveClient(client: ClientMaster): void {
    const list = this.getClients();
    const idx = list.findIndex((c) => c.id === client.id);
    if (idx >= 0) {
      list[idx] = { ...client, updated_at: new Date().toISOString() };
    } else {
      list.unshift({ ...client, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    this.setStorage(STORAGE_KEYS.CLIENTS, list);
  }

  public static deleteClient(id: string): void {
    const list = this.getClients().filter((c) => c.id !== id);
    this.setStorage(STORAGE_KEYS.CLIENTS, list);
  }

  // --- Contracts Master ---
  public static getContracts(clientId?: string): ClientContract[] {
    const list = this.getStorage<ClientContract[]>(STORAGE_KEYS.CONTRACTS, []);
    if (list.length === 0) {
      this.setStorage(STORAGE_KEYS.CONTRACTS, SEED_CONTRACTS);
      return clientId ? SEED_CONTRACTS.filter((c) => c.client_id === clientId) : SEED_CONTRACTS;
    }
    return clientId ? list.filter((c) => c.client_id === clientId) : list;
  }

  public static getContractById(id: string): ClientContract | undefined {
    return this.getContracts().find((c) => c.id === id);
  }

  public static saveContract(contract: ClientContract): void {
    const list = this.getContracts();
    const idx = list.findIndex((c) => c.id === contract.id);
    if (idx >= 0) {
      list[idx] = { ...contract, updated_at: new Date().toISOString() };
    } else {
      list.unshift({ ...contract, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    this.setStorage(STORAGE_KEYS.CONTRACTS, list);
  }

  public static deleteContract(id: string): void {
    const list = this.getContracts().filter((c) => c.id !== id);
    this.setStorage(STORAGE_KEYS.CONTRACTS, list);
  }

  // --- Employee Client Deployments ---
  public static async getDeployments(contractId?: string): Promise<EmployeeClientDeployment[]> {
    let list = this.getStorage<EmployeeClientDeployment[]>(STORAGE_KEYS.DEPLOYMENTS, []);
    if (list.length === 0) {
      // Auto-deploy actual employees from the database
      try {
        const emps = await api.getEmployees();
        if (Array.isArray(emps) && emps.length > 0) {
          const contracts = this.getContracts();
          const primaryContract = contracts[0] || SEED_CONTRACTS[0];

          list = emps.map((emp, index) => {
            const assignedContract = contracts[index % contracts.length] || primaryContract;
            const wageTypes: EmployeeClientDeployment['wage_type'][] = ['MONTHLY_SALARY', 'MONTHLY_SALARY', 'DAILY_WAGE', 'HOURLY_WAGE'];
            const assignedWageType = wageTypes[index % wageTypes.length];

            return {
              id: `dep-${emp.id}`,
              tenant_id: 'org-joy-01',
              employee_id: emp.id,
              employee_code: emp.employee_code || `EMP-${1000 + index}`,
              employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Associate',
              client_id: assignedContract.client_id,
              contract_id: assignedContract.id,
              location_name: emp.branch_name || 'Plant 1',
              department_name: emp.department_name || 'Manufacturing',
              designation: emp.designation_title || 'Machine Operator',
              wage_type: assignedWageType,
              monthly_fixed_wage: 18500 + (index % 5) * 1500,
              daily_wage_rate: 650 + (index % 4) * 50,
              hourly_wage_rate: 85 + (index % 3) * 10,
              start_date: '2026-04-01',
              is_current: true,
              status: 'ACTIVE',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          });
          this.setStorage(STORAGE_KEYS.DEPLOYMENTS, list);
        }
      } catch (_) {}
    }
    return contractId ? list.filter((d) => d.contract_id === contractId) : list;
  }

  public static saveDeployment(deployment: EmployeeClientDeployment): void {
    const list = this.getStorage<EmployeeClientDeployment[]>(STORAGE_KEYS.DEPLOYMENTS, []);
    const idx = list.findIndex((d) => d.id === deployment.id);
    if (idx >= 0) {
      list[idx] = { ...deployment, updated_at: new Date().toISOString() };
    } else {
      list.unshift({ ...deployment, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    this.setStorage(STORAGE_KEYS.DEPLOYMENTS, list);
  }

  // --- Client Billing Policy ---
  public static getBillingPolicy(clientId: string, contractId: string): ClientBillingPolicy {
    const list = this.getStorage<ClientBillingPolicy[]>(STORAGE_KEYS.POLICIES, []);
    const found = list.find((p) => p.client_id === clientId && p.contract_id === contractId);
    if (found) return found;

    // Default policy
    const defaultPolicy: ClientBillingPolicy = {
      id: `pol-${clientId}-${contractId}`,
      tenant_id: 'org-joy-01',
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
        supplier_state_code: '33', // Tamil Nadu
        supplier_gstin: '33AAACJ9988H1Z4', // JOY Corporate Solutions GSTIN
        gst_rate_pct: 18,
        is_rcm_applicable: false,
      },
      rounding: {
        policy: 'ROUND',
        decimals: 0,
      },
      invoice_prefix: 'JCS/2026-27/',
    };

    return defaultPolicy;
  }

  public static saveBillingPolicy(policy: ClientBillingPolicy): void {
    const list = this.getStorage<ClientBillingPolicy[]>(STORAGE_KEYS.POLICIES, []);
    const idx = list.findIndex((p) => p.client_id === policy.client_id && p.contract_id === policy.contract_id);
    if (idx >= 0) {
      list[idx] = policy;
    } else {
      list.push(policy);
    }
    this.setStorage(STORAGE_KEYS.POLICIES, list);
  }

  // --- Dynamic Billing Rules ---
  public static getBillingRules(contractId?: string): BillingRule[] {
    const list = this.getStorage<BillingRule[]>(STORAGE_KEYS.RULES, []);
    return contractId ? list.filter((r) => !r.contract_id || r.contract_id === contractId) : list;
  }

  public static saveBillingRule(rule: BillingRule): void {
    const list = this.getBillingRules();
    const idx = list.findIndex((r) => r.id === rule.id);
    if (idx >= 0) {
      list[idx] = rule;
    } else {
      list.push(rule);
    }
    this.setStorage(STORAGE_KEYS.RULES, list);
  }

  public static deleteBillingRule(id: string): void {
    const list = this.getBillingRules().filter((r) => r.id !== id);
    this.setStorage(STORAGE_KEYS.RULES, list);
  }

  // --- Legacy Template Configurations ---
  public static getLegacyTemplates(): LegacyClientTemplateConfig[] {
    return this.getStorage<LegacyClientTemplateConfig[]>(STORAGE_KEYS.LEGACY_TEMPLATES, []);
  }

  public static saveLegacyTemplate(tpl: LegacyClientTemplateConfig): void {
    const list = this.getLegacyTemplates();
    const idx = list.findIndex((t) => t.id === tpl.id);
    if (idx >= 0) {
      list[idx] = tpl;
    } else {
      list.push(tpl);
    }
    this.setStorage(STORAGE_KEYS.LEGACY_TEMPLATES, list);
  }
}
