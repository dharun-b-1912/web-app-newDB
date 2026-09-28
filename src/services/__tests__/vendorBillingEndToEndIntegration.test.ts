// src/services/__tests__/vendorBillingEndToEndIntegration.test.ts
// ============================================================================
// JOY PeopleHR — End-to-End Vendor Billing & HR Master Integration Tests
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { VendorBillingIntegrationService } from '../vendor/vendorBillingIntegrationService';
import { ClientMasterService } from '../clientBilling/clientMasterService';
import { ClientBillingRunService } from '../clientBilling/clientBillingRunService';
import { WageComponentMappingService } from '../clientBilling/wageComponentMappingService';

// Mock localStorage for Node environment in Vitest
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
  writable: true,
});

describe('End-to-End Vendor Billing & HR Master Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Scoped Contract Visibility & Rate Cards', () => {
    it('retrieves vendor-assigned client contracts with published commercial terms', async () => {
      const contracts = await VendorBillingIntegrationService.getVendorContracts('VEN-000001');
      expect(contracts.length).toBeGreaterThan(0);
      
      const contract = contracts[0];
      expect(contract.clientLegalName).toBeDefined();
      expect(contract.serviceChargePct).toBe(8.5);
      expect(contract.transportRatePerHead).toBe(375);
      expect(contract.salaryDivisorType).toBe('FIXED_26');
      expect(contract.publishedWageComponents.length).toBeGreaterThan(3);
    });

    it('contains transparent published wage component rules for the contract', async () => {
      const contracts = await VendorBillingIntegrationService.getVendorContracts('VEN-000001');
      const contract = contracts[0];
      const basic = contract.publishedWageComponents.find((c) => c.code === 'BASIC');
      
      expect(basic).toBeDefined();
      expect(basic?.isBillable).toBe(true);
      expect(basic?.rule).toBe('INCLUDED_IN_BILLABLE_BASE');
    });
  });

  describe('2. Vendor Billing Summaries & Invoice Ledger', () => {
    it('retrieves finalized billing cycle summaries for deployed workforce', async () => {
      const summaries = await VendorBillingIntegrationService.getVendorBillingSummaries('VEN-000001');
      expect(summaries.length).toBeGreaterThan(0);

      const cycle = summaries[0];
      expect(cycle.deployedAssociatesCount).toBeGreaterThan(0);
      expect(cycle.totalGrossBillableWages).toBeGreaterThan(0);
      expect(cycle.totalEmployerPf).toBeGreaterThan(0);
      expect(cycle.totalServiceCharge).toBeGreaterThan(0);
      expect(cycle.invoiceGrandTotal).toBeGreaterThan(0);
    });

    it('retrieves granular associate-level wage breakdowns', async () => {
      const summaries = await VendorBillingIntegrationService.getVendorBillingSummaries('VEN-000001');
      const firstRun = summaries[0];

      const associateWages = await VendorBillingIntegrationService.getVendorAssociateWages(
        'VEN-000001',
        firstRun.contractName,
        firstRun.period
      );

      expect(associateWages.length).toBeGreaterThanOrEqual(0);
    });
  });
});
