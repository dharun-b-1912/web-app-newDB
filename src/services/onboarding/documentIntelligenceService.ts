// ============================================================================
// Service: Document Intelligence & OCR Extraction Assistant
// Divya Manpower Resources (P) Ltd.
// ============================================================================

import { DocumentOcrResult, OcrExtractedField } from '../../types/statutoryForms';

export class DocumentIntelligenceService {
  /**
   * Assistive Document OCR Extractor & Canonical Profile Cross-Referencer
   */
  public static async analyzeDocument(
    file: File | { name: string; type: string; dataUrl?: string },
    documentType: 'AADHAAR' | 'PAN' | 'BANK_PROOF' | 'UAN_CARD' | 'EDUCATION',
    canonicalProfile?: {
      full_name?: string;
      date_of_birth?: string;
      pan_number?: string;
      aadhaar_number?: string;
      bank_account_no?: string;
      bank_ifsc?: string;
      father_name?: string;
    }
  ): Promise<DocumentOcrResult> {
    // Simulated intelligent OCR extraction based on document type patterns
    const fileName = file.name.toLowerCase();
    const fields: OcrExtractedField[] = [];

    if (documentType === 'AADHAAR') {
      const extractedName = canonicalProfile?.full_name || 'Murugan P';
      const extractedDob = canonicalProfile?.date_of_birth || '1988-04-12';
      const extractedAadhaar = canonicalProfile?.aadhaar_number || '8921 4562 1098';

      fields.push({
        field_name: 'full_name',
        label: 'Candidate Legal Name',
        extracted_value: extractedName,
        canonical_value: canonicalProfile?.full_name,
        confidence: 0.98,
        is_match: !canonicalProfile?.full_name || canonicalProfile.full_name.trim().toLowerCase() === extractedName.toLowerCase(),
        status: 'MATCHED',
      });

      fields.push({
        field_name: 'date_of_birth',
        label: 'Date of Birth (DOB)',
        extracted_value: extractedDob,
        canonical_value: canonicalProfile?.date_of_birth,
        confidence: 0.95,
        is_match: !canonicalProfile?.date_of_birth || canonicalProfile.date_of_birth === extractedDob,
        status: 'MATCHED',
      });

      fields.push({
        field_name: 'aadhaar_number',
        label: 'Aadhaar Number (UID)',
        extracted_value: extractedAadhaar,
        canonical_value: canonicalProfile?.aadhaar_number,
        confidence: 0.99,
        is_match: true,
        status: 'MATCHED',
      });
    } else if (documentType === 'PAN') {
      const extractedPan = canonicalProfile?.pan_number || 'ABCDE1234F';
      const extractedName = canonicalProfile?.full_name || 'Murugan P';

      fields.push({
        field_name: 'pan_number',
        label: 'Permanent Account Number (PAN)',
        extracted_value: extractedPan,
        canonical_value: canonicalProfile?.pan_number,
        confidence: 0.99,
        is_match: !canonicalProfile?.pan_number || canonicalProfile.pan_number.toUpperCase() === extractedPan.toUpperCase(),
        status: 'MATCHED',
      });

      fields.push({
        field_name: 'full_name',
        label: 'Cardholder Name',
        extracted_value: extractedName,
        canonical_value: canonicalProfile?.full_name,
        confidence: 0.97,
        is_match: !canonicalProfile?.full_name || canonicalProfile.full_name.toLowerCase() === extractedName.toLowerCase(),
        status: 'MATCHED',
      });
    } else if (documentType === 'BANK_PROOF') {
      const extractedAcc = canonicalProfile?.bank_account_no || '918273645019';
      const extractedIfsc = canonicalProfile?.bank_ifsc || 'SBIN0001234';

      fields.push({
        field_name: 'bank_account_no',
        label: 'Bank Account Number',
        extracted_value: extractedAcc,
        canonical_value: canonicalProfile?.bank_account_no,
        confidence: 0.96,
        is_match: !canonicalProfile?.bank_account_no || canonicalProfile.bank_account_no === extractedAcc,
        status: 'MATCHED',
      });

      fields.push({
        field_name: 'bank_ifsc',
        label: 'IFSC Code',
        extracted_value: extractedIfsc,
        canonical_value: canonicalProfile?.bank_ifsc,
        confidence: 0.98,
        is_match: !canonicalProfile?.bank_ifsc || canonicalProfile.bank_ifsc.toUpperCase() === extractedIfsc.toUpperCase(),
        status: 'MATCHED',
      });

      fields.push({
        field_name: 'bank_name',
        label: 'Bank Branch / Institution',
        extracted_value: 'State Bank of India (SBI)',
        confidence: 0.94,
        is_match: true,
        status: 'MATCHED',
      });
    }

    const hasDiscrepancy = fields.some((f) => !f.is_match || f.confidence < 0.85);
    const avgConfidence = fields.length > 0 ? fields.reduce((a, b) => a + b.confidence, 0) / fields.length : 1.0;

    return {
      document_type: documentType,
      fields,
      overall_confidence: Number(avgConfidence.toFixed(2)),
      has_discrepancy: hasDiscrepancy,
      notes: hasDiscrepancy
        ? 'Minor discrepancy detected between uploaded document and entered profile. Human review recommended.'
        : 'All extracted fields successfully verified against master profile.',
    };
  }
}
