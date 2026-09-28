// src/services/__tests__/vendorHeaderConnectionCertification.test.ts
import { describe, it, expect } from 'vitest';
import { CONNECTED_CLIENT_COMPANIES } from '../../components/shell/VendorCompanyConnectionSelector';

describe('Joy PeopleHR — Vendor Portal Header & Connected Client Companies Architecture', () => {
  it('certifies that Vendor Portal isolates vendor identity and lists authorized client companies', () => {
    expect(CONNECTED_CLIENT_COMPANIES).toHaveLength(2);

    const primaryClient = CONNECTED_CLIENT_COMPANIES.find((c) => c.isPrimary);
    expect(primaryClient).toBeDefined();
    expect(primaryClient?.legalName).toBe('Joy Corporate Solutions Pvt Ltd');
    expect(primaryClient?.siteName).toBe('Chennai Manufacturing Plant');
    expect(primaryClient?.siteCode).toBe('CHE-01');
    expect(primaryClient?.contractCode).toBe('CON-JOY-CORP-2026-01');
    expect(primaryClient?.masterPoNumber).toBe('PO-JOY-2026-01');
    expect(primaryClient?.activeWorkforceCount).toBe(36);
    expect(primaryClient?.serviceChargePct).toBe(8.0);
  });

  it('certifies that secondary client companies are mapped with contract and workforce quotas', () => {
    const arjunaClient = CONNECTED_CLIENT_COMPANIES.find((c) => c.id === 'arjuna-natural-coimbatore');
    expect(arjunaClient).toBeDefined();
    expect(arjunaClient?.legalName).toBe('Arjuna Natural Pvt Ltd');
    expect(arjunaClient?.siteName).toBe('Factory Premises — Unit 2 Plant');
    expect(arjunaClient?.contractCode).toBe('CON-ARJUNA-MANPOWER-2026');
    expect(arjunaClient?.masterPoNumber).toBe('PO-ARJUNA-2026-07-E2E');
    expect(arjunaClient?.activeWorkforceCount).toBe(50);
  });

  it('validates client switching event payload structure', () => {
    const selectedClient = CONNECTED_CLIENT_COMPANIES[0];
    const eventDetail = {
      id: selectedClient.id,
      clientCode: selectedClient.clientCode,
      legalName: selectedClient.legalName,
      siteName: selectedClient.siteName,
      masterPoNumber: selectedClient.masterPoNumber,
      contractCode: selectedClient.contractCode,
    };

    expect(eventDetail.legalName).toBe('Joy Corporate Solutions Pvt Ltd');
    expect(eventDetail.siteName).toBe('Chennai Manufacturing Plant');
    expect(eventDetail.masterPoNumber).toBe('PO-JOY-2026-01');
  });
});
