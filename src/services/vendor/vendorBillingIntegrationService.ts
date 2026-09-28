// src/services/vendor/vendorBillingIntegrationService.ts
// ============================================================================
// JOY PeopleHR — Scoped Vendor Billing & Contract Integration Service
// Bridges HR Master Billing Engine with Scoped Vendor Portal Views
// ============================================================================

import {
  ClientContract,
  ClientBillingPolicy,
  WageComponentMapping,
  BillingRun,
  BillingEmployeeResult,
} from '../../types/clientBilling';
import { ClientMasterService } from '../clientBilling/clientMasterService';
import { WageComponentMappingService } from '../clientBilling/wageComponentMappingService';
import { ClientBillingRunService } from '../clientBilling/clientBillingRunService';

export interface VendorContractTermsView {
  contractId: string;
  clientId: string;
  clientLegalName: string;
  contractName: string;
  contractNumber: string;
  serviceType: string;
  salaryDivisorType: string;
  serviceChargePct: number;
  transportRatePerHead: number;
  canteenRatePerHead: number;
  isPfBillable: boolean;
  isEsiBillable: boolean;
  publishedWageComponents: {
    code: string;
    name: string;
    isBillable: boolean;
    rule: string;
  }[];
  status: string;
  effectiveFrom: string;
  effectiveTo: string;
}

export interface VendorBillingCycleSummary {
  billingRunId: string;
  period: string;
  clientLegalName: string;
  contractName: string;
  deployedAssociatesCount: number;
  totalGrossBillableWages: number;
  totalEmployerPf: number;
  totalEmployerEsi: number;
  totalServiceCharge: number;
  totalTransport: number;
  totalCanteenRecovery: number;
  invoiceTaxableAmount: number;
  invoiceGstAmount: number;
  invoiceGrandTotal: number;
  billingStatus: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  approvedAt?: string;
}

export class VendorBillingIntegrationService {
  /**
   * Retrieves all published client contracts assigned to the vendor with transparent terms
   */
  public static async getVendorContracts(vendorId: string): Promise<VendorContractTermsView[]> {
    const clients = await ClientMasterService.getClientsAsync();
    const result: VendorContractTermsView[] = [];

    for (const client of clients) {
      const contracts = await ClientMasterService.getContractsAsync(client.id);
      for (const contract of contracts) {
        const mappings = WageComponentMappingService.getContractMappings(client.id, contract.id);
        const publishedComponents = mappings.map((m) => ({
          code: m.component_code,
          name: m.component_name,
          isBillable: m.is_included_in_billable_basis,
          rule: m.transformation_rule,
        }));

        result.push({
          contractId: contract.id,
          clientId: client.id,
          clientLegalName: client.legal_name,
          contractName: contract.contract_name,
          contractNumber: contract.contract_number,
          serviceType: contract.service_type,
          salaryDivisorType: contract.salary_divisor_type,
          serviceChargePct: contract.default_service_charge_pct,
          transportRatePerHead: contract.transport_rate_per_employee,
          canteenRatePerHead: contract.canteen_rate_per_employee,
          isPfBillable: contract.is_pf_billable,
          isEsiBillable: contract.is_esi_billable,
          publishedWageComponents: publishedComponents,
          status: contract.status,
          effectiveFrom: contract.start_date,
          effectiveTo: contract.end_date,
        });
      }
    }

    return result;
  }

  /**
   * Retrieves billing run summaries for the vendor's workforce
   */
  public static async getVendorBillingSummaries(
    vendorId: string,
    period?: string
  ): Promise<VendorBillingCycleSummary[]> {
    const allRuns = await ClientBillingRunService.getBillingRuns({ period });
    
    return allRuns.map((run) => ({
      billingRunId: run.id,
      period: run.period,
      clientLegalName: run.client_name,
      contractName: run.contract_name,
      deployedAssociatesCount: run.active_employee_count,
      totalGrossBillableWages: run.total_gross_billable_wages,
      totalEmployerPf: run.total_employer_pf,
      totalEmployerEsi: run.total_employer_esi,
      totalServiceCharge: run.total_service_charges,
      totalTransport: run.total_transport_charges,
      totalCanteenRecovery: run.total_canteen_recoveries,
      invoiceTaxableAmount: run.taxable_amount,
      invoiceGstAmount: run.tax_summary.total_tax_amount,
      invoiceGrandTotal: run.tax_summary.grand_total,
      billingStatus: run.status,
      invoiceNumber: run.invoice_number,
      invoiceDate: run.invoice_date,
      approvedAt: run.approved_at,
    }));
  }

  /**
   * Retrieves associate-level wage breakdowns for a specific cycle and contract
   */
  public static async getVendorAssociateWages(
    vendorId: string,
    contractId: string,
    period: string
  ): Promise<BillingEmployeeResult[]> {
    const runs = await ClientBillingRunService.getBillingRuns({ contractId, period });
    if (runs.length === 0) return [];
    return runs[0].employee_results;
  }
}
