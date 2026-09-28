// ============================================================================
// Service: Onboarding Readiness & Missing Information Rules Engine
// Divya Manpower Resources (P) Ltd.
// ============================================================================

import { Employee } from '../../types';
import {
  EmployeeOnboardingReadiness,
  ReadinessCheckItem,
  StatutoryNominee,
  PfDeclarationData,
  AppointmentOrderData,
  StatutoryFormType,
} from '../../types/statutoryForms';

export class OnboardingRulesEngine {
  /**
   * Evaluate complete statutory and master readiness for an employee
   */
  public static evaluateReadiness(
    employee: Partial<Employee> | null,
    pfDeclaration?: Partial<PfDeclarationData> | null,
    nominations: StatutoryNominee[] = [],
    appointmentOrder?: Partial<AppointmentOrderData> | null,
    uploadedDocumentTypes: string[] = []
  ): EmployeeOnboardingReadiness {
    const checklist: ReadinessCheckItem[] = [];
    const empId = employee?.id || 'unknown-employee';

    // 1. Personal Identity & Profile Rule
    const missingPersonal: string[] = [];
    const empAny = employee as any;
    if (!employee?.first_name && !empAny?.name) missingPersonal.push('Full Name');
    if (!empAny?.date_of_birth && !empAny?.dob) missingPersonal.push('Date of Birth');
    if (!empAny?.gender) missingPersonal.push('Gender');
    if (!empAny?.father_name && !empAny?.father_or_spouse_name) {
      missingPersonal.push("Father's / Husband's Name");
    }

    checklist.push({
      id: 'rule-personal-profile',
      category: 'PERSONAL',
      title: 'Personal Identity & Master Profile',
      description: "Employee official legal name, DOB, gender, and father's/spouse name",
      is_mandatory: true,
      is_completed: missingPersonal.length === 0,
      affected_forms: ['RESUME', 'FORM_11', 'FORM_2', 'FORM_F', 'FORM_1', 'FORM_Q'],
      missing_fields: missingPersonal,
      action_required: missingPersonal.length > 0 ? `Fill ${missingPersonal.join(', ')}` : undefined,
    });

    // 2. Address & Communication Details Rule
    const missingAddress: string[] = [];
    const hasPresent = Boolean(empAny?.present_address || empAny?.address || empAny?.address_info);
    const hasPermanent = Boolean(empAny?.permanent_address || empAny?.permanent_address_info || empAny?.address);
    if (!hasPresent) missingAddress.push('Present Address');
    if (!hasPermanent) missingAddress.push('Permanent Address');
    if (!empAny?.phone && !empAny?.mobile_phone && !empAny?.work_phone) missingAddress.push('Contact Mobile Number');

    checklist.push({
      id: 'rule-address-contact',
      category: 'ADDRESS',
      title: 'Residential Address & Contact Details',
      description: 'Present and permanent postal addresses with pincode for statutory filings',
      is_mandatory: true,
      is_completed: missingAddress.length === 0,
      affected_forms: ['RESUME', 'FORM_11', 'FORM_2', 'FORM_F', 'FORM_1', 'FORM_Q'],
      missing_fields: missingAddress,
      action_required: missingAddress.length > 0 ? `Provide ${missingAddress.join(', ')}` : undefined,
    });

    // 3. Bank Account & Settlement Details Rule
    const missingBank: string[] = [];
    const hasBankAcc = Boolean((employee as any)?.bank_account_number || (employee as any)?.bank_account_no || pfDeclaration?.bank_account_no);
    const hasIfsc = Boolean((employee as any)?.bank_ifsc || pfDeclaration?.bank_ifsc);
    if (!hasBankAcc) missingBank.push('Bank Account Number');
    if (!hasIfsc) missingBank.push('Bank IFSC Code');
    if (!uploadedDocumentTypes.includes('BANK_PROOF') && !uploadedDocumentTypes.includes('BANK_PASSBOOK')) {
      missingBank.push('Bank Passbook / Cancelled Cheque Proof');
    }

    checklist.push({
      id: 'rule-banking-proof',
      category: 'BANKING',
      title: 'Bank Account & Proof of Passbook',
      description: 'Bank verification for direct salary disbursement & EPFO Form 11 KYC',
      is_mandatory: true,
      is_completed: missingBank.length === 0,
      affected_forms: ['RESUME', 'FORM_11'],
      missing_fields: missingBank,
      action_required: missingBank.length > 0 ? `Upload/Provide ${missingBank.join(', ')}` : undefined,
    });

    // 4. EPFO Form 11 Prior Membership & UAN Rule
    const missingPf: string[] = [];
    if (!pfDeclaration) {
      missingPf.push('EPFO Declaration Form 11 Details');
    } else {
      if (pfDeclaration.previous_epf_member && !pfDeclaration.previous_uan) {
        missingPf.push('Previous Universal Account Number (UAN)');
      }
      if (pfDeclaration.international_worker && !pfDeclaration.passport_number) {
        missingPf.push('Passport Number (International Worker)');
      }
    }

    checklist.push({
      id: 'rule-epfo-form-11',
      category: 'STATUTORY_PF',
      title: 'EPFO Form 11 Prior Membership Declaration',
      description: 'Declaration of prior EPF/EPS scheme membership and international worker status',
      is_mandatory: true,
      is_completed: missingPf.length === 0,
      affected_forms: ['FORM_11'],
      missing_fields: missingPf,
      action_required: missingPf.length > 0 ? `Complete ${missingPf.join(', ')}` : undefined,
    });

    // 5. Statutory EPF / EPS Form 2 Nominations Rule
    const epfNominees = nominations.filter((n) => n.nomination_type === 'EPF');
    const epfTotalShare = epfNominees.reduce((acc, curr) => acc + (Number(curr.share_percentage) || 0), 0);
    const missingEpfNomination: string[] = [];

    if (epfNominees.length === 0) {
      missingEpfNomination.push('EPF Nominee Record');
    } else if (Math.round(epfTotalShare) !== 100) {
      missingEpfNomination.push(`EPF Share Total must equal 100% (currently ${epfTotalShare}%)`);
    }

    // Minor Nominee Guardian Check
    const minorWithoutGuardian = epfNominees.find((n) => n.is_minor && !n.guardian_name);
    if (minorWithoutGuardian) {
      missingEpfNomination.push(`Guardian Name for minor nominee (${minorWithoutGuardian.nominee_name})`);
    }

    checklist.push({
      id: 'rule-form-2-epf-nomination',
      category: 'NOMINATIONS',
      title: 'Form 2: EPF & EPS Statutory Nominations',
      description: 'Nominee proportions (100% allocation) and minor guardian declarations',
      is_mandatory: true,
      is_completed: missingEpfNomination.length === 0,
      affected_forms: ['FORM_2'],
      missing_fields: missingEpfNomination,
      action_required: missingEpfNomination.length > 0 ? missingEpfNomination.join('; ') : undefined,
    });

    // 6. Form F Gratuity Nomination Rule
    const gratuityNominees = nominations.filter((n) => n.nomination_type === 'GRATUITY');
    const gratTotalShare = gratuityNominees.reduce((acc, curr) => acc + (Number(curr.share_percentage) || 0), 0);
    const missingGratuity: string[] = [];
    if (gratuityNominees.length === 0) {
      missingGratuity.push('Gratuity Nominee (Form F)');
    } else if (Math.round(gratTotalShare) !== 100) {
      missingGratuity.push(`Gratuity Share Total must be 100% (currently ${gratTotalShare}%)`);
    }

    checklist.push({
      id: 'rule-form-f-gratuity-nomination',
      category: 'NOMINATIONS',
      title: 'Form F: Gratuity Nomination (Payment of Gratuity Act)',
      description: 'Designated beneficiaries and proportion of gratuity entitlement',
      is_mandatory: true,
      is_completed: missingGratuity.length === 0,
      affected_forms: ['FORM_F'],
      missing_fields: missingGratuity,
      action_required: missingGratuity.length > 0 ? missingGratuity.join('; ') : undefined,
    });

    // 7. Form 1 Payment of Wages Nomination Rule
    const wageNominees = nominations.filter((n) => n.nomination_type === 'WAGES');
    const missingWages: string[] = [];
    if (wageNominees.length === 0) {
      missingWages.push('Wages Nominee (Form 1)');
    }

    checklist.push({
      id: 'rule-form-1-wages-nomination',
      category: 'NOMINATIONS',
      title: 'Form 1: Payment of Wages Nomination',
      description: 'Nomination for unpaid wage disbursement under Payment of Wages Rules',
      is_mandatory: true,
      is_completed: missingWages.length === 0,
      affected_forms: ['FORM_1'],
      missing_fields: missingWages,
      action_required: missingWages.length > 0 ? missingWages.join('; ') : undefined,
    });

    // 8. Mandatory KYC Documents Upload Rule
    const missingDocs: string[] = [];
    if (!uploadedDocumentTypes.includes('AADHAAR') && !uploadedDocumentTypes.includes('AADHAAR_CARD')) {
      missingDocs.push('Aadhaar Card Copy');
    }
    if (!uploadedDocumentTypes.includes('PAN') && !uploadedDocumentTypes.includes('PAN_CARD')) {
      missingDocs.push('PAN Card Copy');
    }
    if (!uploadedDocumentTypes.includes('PHOTO') && !(employee as any)?.avatar_url && !(employee as any)?.photo_url) {
      missingDocs.push('Passport Size Photograph');
    }

    checklist.push({
      id: 'rule-document-proofs',
      category: 'DOCUMENTS',
      title: 'Mandatory KYC & Identity Documents',
      description: 'Aadhaar, PAN, and passport size photo uploaded to private vault',
      is_mandatory: true,
      is_completed: missingDocs.length === 0,
      affected_forms: ['RESUME', 'FORM_11', 'FORM_2', 'FORM_F', 'FORM_1', 'FORM_Q'],
      missing_fields: missingDocs,
      action_required: missingDocs.length > 0 ? `Upload ${missingDocs.join(', ')}` : undefined,
    });

    // 9. Form Q Appointment Order & Wage Breakup Rule
    const missingWage: string[] = [];
    const basic = appointmentOrder?.basic_wage || (employee as any)?.basic_salary || 0;
    const gross = appointmentOrder?.gross_wage || (employee as any)?.gross_salary || 0;
    if (basic <= 0) missingWage.push('Basic Wage Structure');
    if (gross <= 0) missingWage.push('Gross Wage Breakup');

    checklist.push({
      id: 'rule-form-q-appointment-order',
      category: 'COMPENSATION',
      title: 'Form Q: Appointment Order & Wage Breakup',
      description: 'Designation, DOJ, and statutory minimum wage components (Basic + VDA)',
      is_mandatory: true,
      is_completed: missingWage.length === 0,
      affected_forms: ['FORM_Q'],
      missing_fields: missingWage,
      action_required: missingWage.length > 0 ? `Configure ${missingWage.join(', ')}` : undefined,
    });

    // Summary Calculations
    const totalRules = checklist.length;
    const completedRules = checklist.filter((c) => c.is_completed).length;
    const completionPercentage = Math.round((completedRules / totalRules) * 100);
    const blockers = checklist
      .filter((c) => !c.is_completed && c.is_mandatory)
      .map((c) => `${c.title}: ${c.missing_fields.join(', ')}`);

    return {
      employee_id: empId,
      total_rules: totalRules,
      completed_rules: completedRules,
      completion_percentage: completionPercentage,
      is_ready_for_generation: blockers.length === 0,
      checklist,
      blockers,
    };
  }
}
