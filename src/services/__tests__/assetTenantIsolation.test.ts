import { describe, it, expect, beforeEach } from 'vitest';
import { assetService } from '../asset/assetService';
import { assetAssignmentService } from '../asset/assetAssignmentService';

const ELECTRA_ORG_ID = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
const JOY_CORP_ORG_ID = '0c621892-e938-4707-9957-13534ea32c19';

describe('Asset Management Multi-Tenant Isolation', () => {
  it('isolates asset metrics and queries by organizationId without cross-tenant leakage', async () => {
    // 1. Fetch Joy Corporate assets
    const joyAssets = await assetService.fetchAssetsFromDb(JOY_CORP_ORG_ID, true);
    expect(Array.isArray(joyAssets)).toBe(true);

    // 2. Fetch Electra EV assets
    const electraAssets = await assetService.fetchAssetsFromDb(ELECTRA_ORG_ID, true);
    expect(Array.isArray(electraAssets)).toBe(true);

    // 3. Ensure Electra EV cannot see Joy Corporate assets
    const electraSummary = assetService.getSummaryMetrics(ELECTRA_ORG_ID);
    const joySummary = assetService.getSummaryMetrics(JOY_CORP_ORG_ID);

    // All electra assets must have electra organization_id
    electraAssets.forEach(a => {
      expect(a.tenant_id).toBe(ELECTRA_ORG_ID);
    });

    // Joy assets must have Joy organization_id
    joyAssets.forEach(a => {
      expect(a.tenant_id).toBe(JOY_CORP_ORG_ID);
    });

    // Electra summary total must equal electra assets length, NOT Joy Corporate's
    expect(electraSummary.total_assets).toBe(electraAssets.length);
    expect(joySummary.total_assets).toBe(joyAssets.length);
  });

  it('isolates asset assignments strictly by organizationId', async () => {
    const electraAssignments = await assetAssignmentService.fetchAssignmentsFromDb(ELECTRA_ORG_ID, true);
    const joyAssignments = await assetAssignmentService.fetchAssignmentsFromDb(JOY_CORP_ORG_ID, true);

    expect(Array.isArray(electraAssignments)).toBe(true);
    expect(Array.isArray(joyAssignments)).toBe(true);

    // No cross-contamination
    const electraIds = new Set(electraAssignments.map(a => a.id));
    joyAssignments.forEach(ja => {
      expect(electraIds.has(ja.id)).toBe(false);
    });
  });
});

