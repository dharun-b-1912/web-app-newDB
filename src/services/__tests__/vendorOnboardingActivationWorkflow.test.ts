import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  VendorOnboardingService,
} from '../vendor/vendorOnboardingService';
import {
  VendorOnboardingSubmission,
} from '../../types/vendorPortal';
import { resendEmailService } from '../email/resendEmailService';

describe('Joy PeopleHR — Vendor Onboarding & Automated Account Activation Workflow', () => {
  const TEST_ORG_ID = 'org-joy-main';

  const createSampleSubmission = (overrides?: Partial<VendorOnboardingSubmission>): VendorOnboardingSubmission => ({
    id: `vsub_test_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    organizationId: TEST_ORG_ID,
    currentStep: 1,
    status: 'DRAFT',
    company: {
      legalName: 'Acme Manpower Solutions Pvt Ltd',
      tradeName: 'Acme Workforce',
      vendorCode: 'VND-8899',
      companyStructure: 'PRIVATE_LIMITED',
      pan: 'ABCDE1234F',
      gstin: '33ABCDE1234F1Z5',
      msmeNumber: 'UDYAM-TN-03-0099887',
      registeredAddress: {
        street: '100 Industrial Estate Road',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641004',
        country: 'India',
      },
      authorizedContact: {
        fullName: 'Karthik Ramanathan',
        email: 'karthik.contact@acmeworkforce.com',
        phone: '+919876543210',
        designation: 'Managing Director',
      },
    },
    statutory: {
      esiRegistrationNumber: '56001195190001001',
      pfRegistrationNumber: 'CB/CBE/1724259000',
      laborLicenseNumber: 'CLRA/TN/2026/0491',
    },
    banking: {
      accountHolderName: 'Acme Manpower Solutions Pvt Ltd',
      bankName: 'HDFC Bank Ltd',
      accountNumber: '987654321098',
      ifscCode: 'HDFC0001234',
      branch: 'Coimbatore Main Branch',
      complianceContact: {
        fullName: 'S. Compliance Officer',
        email: 'compliance@acmeworkforce.com',
        phone: '+919876543211',
      },
    },
    clientAssignment: {
      clientCompanyId: 'comp-arjuna-main',
      clientCompanyName: 'Arjuna Natural Pvt Ltd',
      siteName: 'Factory Premises — Unit 1 Plant',
      contractCode: 'CON-ARJUNA-MANPOWER-2026',
      masterPoNumber: 'PO-ARJUNA-2026-07-001',
      maxWorkforceCapacity: 100,
      serviceChargePercentage: 8.0,
      contractStartDate: '2026-04-01',
      contractEndDate: '2027-03-31',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Field & Format Validations', () => {
    it('validates PAN format according to Indian Income Tax standards (5 letters, 4 digits, 1 letter)', () => {
      expect(VendorOnboardingService.isValidPAN('ABCDE1234F')).toBe(true);
      expect(VendorOnboardingService.isValidPAN('AOAPR4773D')).toBe(true);
      expect(VendorOnboardingService.isValidPAN('abcde1234f')).toBe(true); // Case-insensitive
      expect(VendorOnboardingService.isValidPAN('12345ABCDE')).toBe(false);
      expect(VendorOnboardingService.isValidPAN('ABC1234F')).toBe(false);
      expect(VendorOnboardingService.isValidPAN('')).toBe(false);
    });

    it('validates GSTIN format according to GST standards (15 alphanumeric characters)', () => {
      expect(VendorOnboardingService.isValidGSTIN('33AOAPR4773D1Z2')).toBe(true);
      expect(VendorOnboardingService.isValidGSTIN('33AACCA8648K1ZG')).toBe(true);
      expect(VendorOnboardingService.isValidGSTIN('33AOAPR4773D1Z')).toBe(false); // 14 chars
      expect(VendorOnboardingService.isValidGSTIN('INVALID_GSTIN_12')).toBe(false);
    });

    it('validates IFSC bank code format', () => {
      expect(VendorOnboardingService.isValidIFSC('HDFC0001234')).toBe(true);
      expect(VendorOnboardingService.isValidIFSC('SBIN0000456')).toBe(true);
      expect(VendorOnboardingService.isValidIFSC('HDFC1234567')).toBe(false); // 5th char must be 0
      expect(VendorOnboardingService.isValidIFSC('HDFC0123')).toBe(false);
    });

    it('validates all step constraints comprehensively', () => {
      const invalidSub = createSampleSubmission({
        company: {
          legalName: '',
          vendorCode: '',
          companyStructure: 'PRIVATE_LIMITED',
          pan: 'INVALID_PAN',
          gstin: 'INVALID_GSTIN',
          registeredAddress: { street: '', city: '', state: '', pincode: '', country: '' },
          authorizedContact: { fullName: '', email: 'not-an-email', phone: '123', designation: '' },
        },
      });

      const step1Val = VendorOnboardingService.validateStep(invalidSub, 1);
      expect(step1Val.valid).toBe(false);
      expect(step1Val.errors.length).toBeGreaterThan(4);

      const validSub = createSampleSubmission();
      expect(VendorOnboardingService.validateStep(validSub, 1).valid).toBe(true);
      expect(VendorOnboardingService.validateStep(validSub, 2).valid).toBe(true);
      expect(VendorOnboardingService.validateStep(validSub, 3).valid).toBe(true);
      expect(VendorOnboardingService.validateStep(validSub, 4).valid).toBe(true);
    });
  });

  describe('2. Draft Persistence & Resumption', () => {
    it('saves draft state reliably and allows resuming without data loss', async () => {
      const draft = createSampleSubmission({
        currentStep: 3,
        company: {
          ...createSampleSubmission().company,
          legalName: 'Draft Manpower Solutions',
        },
      });

      const saveRes = await VendorOnboardingService.saveDraft(draft);
      expect(saveRes.success).toBe(true);
      expect(saveRes.savedAt).toBeDefined();

      const fetchRes = await VendorOnboardingService.getActiveDraft(TEST_ORG_ID);
      expect(fetchRes.success).toBe(true);
      expect(fetchRes.draft?.company.legalName).toBe('Draft Manpower Solutions');
      expect(fetchRes.draft?.currentStep).toBe(3);

      // Clean up
      await VendorOnboardingService.clearDraft(TEST_ORG_ID);
    });
  });

  describe('3. Relational Master Data Fetching', () => {
    it('retrieves active client companies, plant sites, contracts, and POs', async () => {
      const deps = await VendorOnboardingService.getOnboardingDependencies(TEST_ORG_ID);
      expect(deps.clientCompanies.length).toBeGreaterThan(0);
      expect(deps.clientSites.length).toBeGreaterThan(0);
      expect(deps.activeContracts.length).toBeGreaterThan(0);
      expect(deps.purchaseOrders.length).toBeGreaterThan(0);

      // Verify specific references
      const arjunaComp = deps.clientCompanies.find((c) => c.name.includes('Arjuna Natural'));
      expect(arjunaComp).toBeDefined();
      expect(arjunaComp?.gstin).toBe('33AACCA8648K1ZG');
    });
  });

  describe('4. Registration, Single-Use Activation Token & Email Dispatch', () => {
    it('registers vendor, creates secure single-use token, and dispatches activation email', async () => {
      const emailSpy = vi.spyOn(resendEmailService, 'sendVendorAccountActivationEmail').mockResolvedValue({
        success: true,
        id: 'msg_resend_mock_123',
        message: 'Delivered',
      });

      const submission = createSampleSubmission({
        company: {
          ...createSampleSubmission().company,
          pan: 'TXPAN1234K',
          gstin: '33TXPAN1234K1Z8',
          authorizedContact: {
            ...createSampleSubmission().company.authorizedContact,
            email: 'newvendor.contact@acme.com',
          },
        },
      });

      const regResult = await VendorOnboardingService.registerAndActivateVendor(submission, {
        sendActivationEmail: true,
        actorName: 'HR Head Coimbatore',
      });

      expect(regResult.success).toBe(true);
      expect(regResult.token).toBeDefined();
      expect(regResult.activationUrl).toContain(encodeURIComponent(regResult.token!));
      expect(regResult.submission?.activationDetails?.invitationStatus).toBe('INVITATION_SENT');
      expect(emailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'newvendor.contact@acme.com',
          vendorLegalName: submission.company.legalName,
          activationToken: regResult.token,
        })
      );

      // Accept token and set strong password
      const acceptRes = await VendorOnboardingService.acceptInvitation(regResult.token!, 'SecureP@ssw0rd2026!');
      expect(acceptRes.success).toBe(true);
      expect(acceptRes.vendorLegalName).toBe(submission.company.legalName);

      // Verify single-use token cannot be reused
      const secondAccept = await VendorOnboardingService.acceptInvitation(regResult.token!, 'AnotherPassword123!');
      expect(secondAccept.success).toBe(false);
      expect(secondAccept.error).toContain('already been used');
    });

    it('prevents duplicate vendor registration for same PAN, GSTIN, or email', async () => {
      const sub1 = createSampleSubmission({
        company: {
          ...createSampleSubmission().company,
          pan: 'DUPAN9999Z',
          gstin: '33DUPAN9999Z1Z1',
          authorizedContact: {
            ...createSampleSubmission().company.authorizedContact,
            email: 'dup.vendor@sample.com',
          },
        },
      });

      // Register first vendor
      const reg1 = await VendorOnboardingService.registerAndActivateVendor(sub1, {
        sendActivationEmail: false,
      });
      expect(reg1.success).toBe(true);

      // Attempt duplicate PAN
      const dupPanSub = createSampleSubmission({
        company: {
          ...createSampleSubmission().company,
          legalName: 'Different Name Pvt Ltd',
          pan: 'DUPAN9999Z', // Same PAN
          gstin: '33OTHER1234F1Z9',
          authorizedContact: {
            ...createSampleSubmission().company.authorizedContact,
            email: 'different.email@sample.com',
          },
        },
      });

      const reg2 = await VendorOnboardingService.registerAndActivateVendor(dupPanSub, {
        sendActivationEmail: false,
      });
      expect(reg2.success).toBe(false);
      expect(reg2.error).toContain('already registered');
    });
  });

  describe('5. HR Activation Lifecycle Controls & Email Template Admin', () => {
    it('supports resending activation email with fresh single-use token', async () => {
      const emailSpy = vi.spyOn(resendEmailService, 'sendVendorAccountActivationEmail').mockResolvedValue({
        success: true,
      });

      const submission = createSampleSubmission({
        company: {
          ...createSampleSubmission().company,
          pan: 'RSEND1234T',
          gstin: '33RSEND1234T1Z2',
          authorizedContact: {
            ...createSampleSubmission().company.authorizedContact,
            email: 'resend.contact@vendor.com',
          },
        },
      });

      const reg = await VendorOnboardingService.registerAndActivateVendor(submission, {
        sendActivationEmail: true,
      });
      expect(reg.success).toBe(true);

      const resendRes = await VendorOnboardingService.resendActivationInvitation(
        reg.submission!.id,
        'HR Administrator'
      );
      expect(resendRes.success).toBe(true);
      expect(resendRes.activationUrl).toBeDefined();
      expect(emailSpy).toHaveBeenCalledTimes(2);
    });

    it('allows revoking an invitation so token can no longer be accepted', async () => {
      const submission = createSampleSubmission({
        company: {
          ...createSampleSubmission().company,
          pan: 'REVOK1234R',
          gstin: '33REVOK1234R1Z3',
          authorizedContact: {
            ...createSampleSubmission().company.authorizedContact,
            email: 'revoke.contact@vendor.com',
          },
        },
      });

      const reg = await VendorOnboardingService.registerAndActivateVendor(submission, {
        sendActivationEmail: false,
      });

      const revokeRes = await VendorOnboardingService.revokeActivationInvitation(
        reg.submission!.id,
        'Terminated during background check',
        'HR Head'
      );
      expect(revokeRes.success).toBe(true);

      // Attempting to accept a revoked token fails
      const acceptRes = await VendorOnboardingService.acceptInvitation(reg.token!, 'SecureP@ss123');
      expect(acceptRes.success).toBe(false);
      expect(acceptRes.error).toContain('revoked');
    });

    it('allows HR administrator to customize activation email template with placeholder support', () => {
      const template = VendorOnboardingService.getActivationEmailTemplate();
      expect(template.subject).toContain('Activate Your Vendor Account');
      expect(template.availablePlaceholders).toContain('{{authorized_contact_name}}');
      expect(template.availablePlaceholders).toContain('{{vendor_code}}');

      const updateRes = VendorOnboardingService.saveActivationEmailTemplate({
        subject: 'Action Required: Activate Your {{vendor_legal_name}} Portal Access',
      });
      expect(updateRes.success).toBe(true);
      expect(updateRes.template.version).toBeGreaterThan(1);
    });
  });
});
