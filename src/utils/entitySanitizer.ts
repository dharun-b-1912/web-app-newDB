import { Company } from '../types';

export const STALE_COMPANY_ID = '0ce6436c-e9b4-4e0e-9102-411ea21b8b80';
export const CORRECT_COMPANY_ID = '2030277f-a6a1-427f-beaf-4fc677a3bae2';
export const STALE_ELECTRA_COMPANY_ID = '3041388a-b7b2-438a-cfba-5fd788b4cbf3';
export const CORRECT_ELECTRA_COMPANY_ID = 'c0bbfb28-1500-4ebb-aba8-453b3681f342';
export const ELECTRA_ORG_ID = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
export const JOY_ORG_ID = '0c621892-e938-4707-9957-13534ea32c19';

/**
 * Universal Legal Entity Sanitizer
 * Collapses any variant of Electra EV into the single canonical legal entity
 * and prevents duplicate entities across tenant boundaries and browser storage.
 */
export function sanitizeAuthorizedEntities(entities: Company[]): Company[] {
  if (!Array.isArray(entities) || entities.length === 0) return [];

  const obsoleteIds = new Set([
    STALE_ELECTRA_COMPANY_ID,
    STALE_COMPANY_ID,
  ]);

  const seenIds = new Set<string>();
  const seenNormKeys = new Set<string>();
  const cleanList: Company[] = [];

  for (const ent of entities) {
    if (!ent || !ent.id || obsoleteIds.has(ent.id)) continue;

    // Normalize entity legal and trade names
    const rawName = (ent.legal_name || ent.trade_name || '').toLowerCase();
    const cleanNormName = rawName
      .replace(/\b(private|pvt|limited|ltd|solutions|technologies|gmc|plant)\b/gi, '')
      .replace(/[^a-z0-9]/g, '');

    const isElectra = cleanNormName.includes('electra') || ent.organization_id === ELECTRA_ORG_ID;
    const normKey = isElectra ? 'electraev' : `${ent.organization_id || 'global'}_${cleanNormName}`;

    if (seenNormKeys.has(normKey)) {
      continue;
    }

    if (isElectra) {
      seenIds.add(CORRECT_ELECTRA_COMPANY_ID);
      seenNormKeys.add(normKey);
      cleanList.push({
        ...ent,
        id: CORRECT_ELECTRA_COMPANY_ID,
        organization_id: ELECTRA_ORG_ID,
        legal_name: 'Electra EV',
        trade_name: 'Electra EV',
        name: 'Electra EV',
        statutory_registration_no: 'U34100TN2024PTC054321',
        tax_id: 'BBBEV5678G',
        country: 'India',
        city: 'Coimbatore',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        address: 'Coimbatore Plant, Tamil Nadu',
        status: 'Active',
      });
      continue;
    }

    if (seenIds.has(ent.id)) continue;
    seenIds.add(ent.id);
    seenNormKeys.add(normKey);

    cleanList.push({
      ...ent,
      legal_name: (ent.legal_name || ent.trade_name || 'Enterprise Legal Entity').replace(/\bPVE\b/gi, 'PVT'),
      trade_name: (ent.trade_name || ent.legal_name || 'Enterprise Legal Entity').replace(/\bPVE\b/gi, 'PVT'),
      country: ent.country || 'India',
      city: ent.city || 'Coimbatore',
      currency: ent.currency || 'INR',
    });
  }

  return cleanList;
}
