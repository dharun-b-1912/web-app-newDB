// src/services/draftStorageService.ts
// ============================================================
// Joy PeopleHR Enterprise — Policy-Based Form Draft Preservation
// Saves user input safely across session timeouts and browser refreshes
// with data sensitivity classification (Low / Medium / Sensitive).
// ============================================================

export type DataSensitivityTier = 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGHLY_SENSITIVE';

export interface DraftMetadata {
  formId: string;
  tenantId?: string;
  userId?: string;
  updatedAt: number;
  sensitivity: DataSensitivityTier;
  step?: number;
}

export interface StoredDraft<T = any> {
  metadata: DraftMetadata;
  payload: T;
}

// Keys that should never be saved in plaintext client storage
const SENSITIVE_FIELD_KEYS = [
  'password',
  'confirmPassword',
  'bankAccountNumber',
  'bankIfsc',
  'panNumber',
  'aadhaarNumber',
  'passportNumber',
  'ssn',
  'creditCard',
  'cvv',
];

class DraftStorageService {
  private readonly PREFIX = 'wf_draft_';

  /**
   * Sanitizes payload according to sensitivity tier
   */
  private sanitizePayload<T extends Record<string, any>>(data: T, tier: DataSensitivityTier): T {
    if (!data || typeof data !== 'object') return data;

    const copy = JSON.parse(JSON.stringify(data));

    if (tier === 'HIGHLY_SENSITIVE') {
      // Redact all sensitive fields
      const redact = (obj: any) => {
        for (const key of Object.keys(obj)) {
          if (SENSITIVE_FIELD_KEYS.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
            delete obj[key];
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            redact(obj[key]);
          }
        }
      };
      redact(copy);
    }

    return copy;
  }

  /**
   * Save a form draft
   */
  saveDraft<T extends Record<string, any>>(
    formId: string,
    data: T,
    options: {
      tenantId?: string;
      userId?: string;
      sensitivity?: DataSensitivityTier;
      step?: number;
    } = {}
  ): boolean {
    try {
      const sensitivity = options.sensitivity || 'LOW_RISK';
      const sanitized = this.sanitizePayload(data, sensitivity);

      const draft: StoredDraft<T> = {
        metadata: {
          formId,
          tenantId: options.tenantId,
          userId: options.userId,
          updatedAt: Date.now(),
          sensitivity,
          step: options.step,
        },
        payload: sanitized,
      };

      const storageKey = `${this.PREFIX}${formId}`;
      sessionStorage.setItem(storageKey, JSON.stringify(draft));
      return true;
    } catch (err) {
      console.warn('[DraftStorage] Failed to save draft:', err);
      return false;
    }
  }

  /**
   * Retrieve a saved draft
   */
  getDraft<T = any>(formId: string): StoredDraft<T> | null {
    try {
      const storageKey = `${this.PREFIX}${formId}`;
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as StoredDraft<T>;
    } catch (err) {
      console.warn('[DraftStorage] Failed to read draft:', err);
      return null;
    }
  }

  /**
   * Check if a draft exists
   */
  hasDraft(formId: string): boolean {
    const storageKey = `${this.PREFIX}${formId}`;
    return sessionStorage.getItem(storageKey) !== null;
  }

  /**
   * Clear a draft after successful submission
   */
  clearDraft(formId: string): void {
    try {
      const storageKey = `${this.PREFIX}${formId}`;
      sessionStorage.removeItem(storageKey);
    } catch (err) {
      console.warn('[DraftStorage] Failed to clear draft:', err);
    }
  }

  /**
   * Get all active drafts for the current session
   */
  listDrafts(): DraftMetadata[] {
    const list: DraftMetadata[] = [];
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(this.PREFIX)) {
          const raw = sessionStorage.getItem(key);
          if (raw) {
            const draft = JSON.parse(raw) as StoredDraft;
            if (draft?.metadata) list.push(draft.metadata);
          }
        }
      }
    } catch (err) {
      console.warn('[DraftStorage] Error listing drafts:', err);
    }
    return list;
  }
}

export const draftStorageService = new DraftStorageService();
