import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DEFAULT_EMPLOYEES } from '../api';
import { sanitizeAuthorizedEntities } from '../organizationContextService';
import { Company } from '../../types';

describe('Zero-Mock & Database-Authoritative Multi-Tenant Architecture', () => {
  it('enforces that DEFAULT_EMPLOYEES is strictly an empty array with zero mock personas', () => {
    expect(DEFAULT_EMPLOYEES).toBeDefined();
    expect(DEFAULT_EMPLOYEES).toEqual([]);
    expect(DEFAULT_EMPLOYEES.length).toBe(0);
  });

  it('guarantees sanitizeAuthorizedEntities eliminates duplicate entities and obsolete mock IDs', () => {
    const dirtyEntities: Company[] = [
      {
        id: 'c0bbfb28-1500-4ebb-aba8-453b3681f342',
        organization_id: 'c5ab6b03-adde-47cc-a033-064f4c39b21e',
        legal_name: 'Electra EV',
        trade_name: 'Electra EV',
        country: 'India',
        currency: 'INR',
        city: 'Coimbatore',
        status: 'Active',
        created_at: new Date().toISOString(),
      },
      {
        id: '3041388a-b7b2-438a-cfba-5fd788b4cbf3', // Obsolete mock duplicate ID
        organization_id: 'c5ab6b03-adde-47cc-a033-064f4c39b21e',
        legal_name: 'Electra EV Pvt Ltd',
        trade_name: 'Electra EV Pvt Ltd',
        country: 'India',
        currency: 'INR',
        city: 'Coimbatore',
        status: 'Active',
        created_at: new Date().toISOString(),
      },
      {
        id: '0ce6436c-e9b4-4e0e-9102-411ea21b8b80', // Obsolete Joy Corporate mock ID
        organization_id: '0c621892-e938-4707-9957-13534ea32c19',
        legal_name: 'Joy Corporate Solutions Old Mock',
        country: 'India',
        currency: 'INR',
        city: 'Coimbatore',
        status: 'Active',
        created_at: new Date().toISOString(),
      },
      {
        id: '2030277f-a6a1-427f-beaf-4fc677a3bae2', // Canonical Joy Corporate
        organization_id: '0c621892-e938-4707-9957-13534ea32c19',
        legal_name: 'Joy Corporate Solutions Pvt Ltd',
        trade_name: 'Joy Corporate Solutions',
        country: 'India',
        currency: 'INR',
        city: 'Coimbatore',
        status: 'Active',
        created_at: new Date().toISOString(),
      },
    ];

    const clean = sanitizeAuthorizedEntities(dirtyEntities);

    // Must remove the 2 obsolete mock IDs and collapse duplicate names per organization
    expect(clean.length).toBe(2);
    expect(clean.map(c => c.id)).toEqual([
      'c0bbfb28-1500-4ebb-aba8-453b3681f342',
      '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    ]);
    expect(clean.find(c => c.organization_id === 'c5ab6b03-adde-47cc-a033-064f4c39b21e')?.legal_name).toBe('Electra EV');
  });

  it('verifies that tenant normalization collapses different suffix variants of the same legal entity', () => {
    const variants: Company[] = [
      {
        id: 'c0bbfb28-1500-4ebb-aba8-453b3681f342',
        organization_id: 'org-test-1',
        legal_name: 'Acme Technologies Private Limited',
        trade_name: 'Acme',
        country: 'India',
        currency: 'INR',
        city: 'Coimbatore',
        status: 'Active',
        created_at: new Date().toISOString(),
      },
      {
        id: 'diff-id-999',
        organization_id: 'org-test-1',
        legal_name: 'Acme Technologies Pvt Ltd',
        trade_name: 'Acme Technologies',
        country: 'India',
        currency: 'INR',
        city: 'Coimbatore',
        status: 'Active',
        created_at: new Date().toISOString(),
      },
    ];

    const sanitized = sanitizeAuthorizedEntities(variants);
    expect(sanitized.length).toBe(1);
    expect(sanitized[0].id).toBe('c0bbfb28-1500-4ebb-aba8-453b3681f342');
  });
});

