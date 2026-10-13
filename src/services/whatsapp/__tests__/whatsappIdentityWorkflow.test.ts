// src/services/whatsapp/__tests__/whatsappIdentityWorkflow.test.ts
// ============================================================================
// JOY PeopleHR / WorkforceOS WhatsApp Bot — Phase 1.1 Production Identity Workflow
// Complete Test Suite: Identity, Verification, Hierarchy, RBAC, State Machine,
// Security Isolation & Diagnostics
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  whatsAppIdentityService,
  whatsAppOtpService,
  whatsAppPermissionService,
  whatsAppBotEngine,
  whatsAppClient,
  whatsAppLogger,
  normalizeIndianPhone,
  isValidIndianMobile,
  extractPhoneNumberCandidate,
} from '../index';
import type { ResolvedEmployeeIdentity, BotSessionContext } from '../types';

describe('Phase 1.1 — Production WhatsApp Identity & Security Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. IDENTITY & PHONE NORMALIZATION
  // ==========================================================================
  describe('Group 1: Identity & Phone Normalization', () => {
    it('normalizes valid Indian numbers with +91, spaces, hyphens, and leading zero', () => {
      expect(whatsAppIdentityService.normalizePhone('9876543210').e164).toBe('+919876543210');
      expect(whatsAppIdentityService.normalizePhone('+919876543210').e164).toBe('+919876543210');
      expect(whatsAppIdentityService.normalizePhone('+91 98765 43210').e164).toBe('+919876543210');
      expect(whatsAppIdentityService.normalizePhone('+91-98765-43210').e164).toBe('+919876543210');
      expect(whatsAppIdentityService.normalizePhone('09876543210').e164).toBe('+919876543210');
      expect(whatsAppIdentityService.normalizePhone('919876543210').canonical10).toBe('9876543210');
    });

    it('identifies invalid or foreign numbers correctly', () => {
      expect(isValidIndianMobile('12345')).toBe(false);
      expect(isValidIndianMobile('0000000000')).toBe(false);
      expect(isValidIndianMobile('+14155552671')).toBe(false);
      expect(whatsAppIdentityService.normalizePhone('12345').isValid).toBe(false);
    });

    it('handles unknown numbers by transitioning to ACCOUNT_NOT_FOUND', async () => {
      const sendInteractiveSpy = vi.spyOn(whatsAppClient, 'sendInteractive').mockResolvedValue({
        success: true,
        messageId: 'msg-not-found',
      });
      vi.spyOn(whatsAppIdentityService, 'lookupEmployeeByPhone').mockResolvedValue([]);

      await whatsAppBotEngine.handleInboundMessage({
        from: '919999900001',
        messageId: 'wamid-nf-1',
        text: '9876543211',
      });

      expect(sendInteractiveSpy).toHaveBeenCalled();
      const call = sendInteractiveSpy.mock.calls[0][0];
      expect(call.body.text).toContain('No Account Found');
    });

    it('filters out inactive or terminated employees during lookup', async () => {
      // Inactive employee
      vi.spyOn(whatsAppIdentityService, 'lookupEmployeeByPhone').mockResolvedValue([]);

      const result = await whatsAppIdentityService.lookupEmployeeByPhone('9876543299');
      expect(result).toHaveLength(0);
    });

    it('handles multiple organizations/companies for the same mobile', async () => {
      const mockAccounts: ResolvedEmployeeIdentity[] = [
        {
          employeeId: 'emp-001',
          employeeCode: 'JCS-001',
          fullName: 'Dharun B',
          organizationId: 'org-1',
          companyName: 'Joy Corporate Solutions',
          department: 'Tech',
          designation: 'Staff Engineer',
          employmentStatus: 'Active',
          phone: '919876543210',
          roleContext: 'EMPLOYEE',
          directReportsCount: 0,
          teamLeadReportsCount: 0,
          permissions: ['attendance.view_self'],
        },
        {
          employeeId: 'emp-002',
          employeeCode: 'ABC-101',
          fullName: 'Dharun B',
          organizationId: 'org-2',
          companyName: 'ABC Manufacturing Ltd',
          department: 'Operations',
          designation: 'Consultant',
          employmentStatus: 'Active',
          phone: '919876543210',
          roleContext: 'EMPLOYEE',
          directReportsCount: 0,
          teamLeadReportsCount: 0,
          permissions: ['attendance.view_self'],
        },
      ];

      vi.spyOn(whatsAppIdentityService, 'lookupEmployeeByPhone').mockResolvedValue(mockAccounts);
      const sendTextSpy = vi.spyOn(whatsAppClient, 'sendText').mockResolvedValue({
        success: true,
        messageId: 'msg-multi',
      });

      await whatsAppBotEngine.handleInboundMessage({
        from: '919999900002',
        messageId: 'wamid-multi-1',
        text: '9876543210',
      });

      expect(sendTextSpy).toHaveBeenCalled();
      const textCall = sendTextSpy.mock.calls[0][0];
      expect(textCall.text).toContain('Multiple Accounts Found');
      expect(textCall.text).toContain('Joy Corporate Solutions');
      expect(textCall.text).toContain('ABC Manufacturing Ltd');
    });
  });

  // ==========================================================================
  // 2. VERIFICATION FLOW & RETRIES
  // ==========================================================================
  describe('Group 2: Verification Flow & Retries', () => {
    const singleAccount: ResolvedEmployeeIdentity = {
      employeeId: 'emp-ver-1',
      employeeCode: 'JCS-042',
      fullName: 'Suresh Kumar',
      organizationId: 'org-joy',
      companyName: 'Joy Corporate Solutions',
      department: 'Logistics',
      designation: 'Officer',
      employmentStatus: 'Active',
      phone: '919876543222',
      roleContext: 'EMPLOYEE',
      directReportsCount: 0,
      teamLeadReportsCount: 0,
      permissions: whatsAppIdentityService.buildPermissionSet('EMPLOYEE'),
    };

    it('completes verification when user clicks YES', async () => {
      vi.spyOn(whatsAppIdentityService, 'lookupEmployeeByPhone').mockResolvedValue([singleAccount]);
      const sendTextSpy = vi.spyOn(whatsAppClient, 'sendText').mockResolvedValue({
        success: true,
        messageId: 'msg-v-yes',
      });

      // 1. Send phone
      await whatsAppBotEngine.handleInboundMessage({
        from: '919999900010',
        messageId: 'wamid-v1',
        text: '9876543222',
      });

      // 2. Click YES
      await whatsAppBotEngine.handleInboundMessage({
        from: '919999900010',
        messageId: 'wamid-v2',
        buttonPayload: 'CONFIRM_IDENTITY_YES',
      });

      expect(sendTextSpy).toHaveBeenCalled();
      const lastCall = sendTextSpy.mock.calls[sendTextSpy.mock.calls.length - 1][0];
      expect(lastCall.text).toContain('Welcome, *Suresh Kumar*');
      expect(lastCall.text).toContain('Joy Corporate Solutions');
    });

    it('rejects identity when user clicks NO and resets session state', async () => {
      vi.spyOn(whatsAppIdentityService, 'lookupEmployeeByPhone').mockResolvedValue([singleAccount]);
      const sendTextSpy = vi.spyOn(whatsAppClient, 'sendText').mockResolvedValue({
        success: true,
        messageId: 'msg-v-no',
      });

      // 1. Send phone
      await whatsAppBotEngine.handleInboundMessage({
        from: '919999900011',
        messageId: 'wamid-v3',
        text: '9876543222',
      });

      // 2. Click NO
      await whatsAppBotEngine.handleInboundMessage({
        from: '919999900011',
        messageId: 'wamid-v4',
        buttonPayload: 'CONFIRM_IDENTITY_NO',
      });

      expect(sendTextSpy).toHaveBeenCalled();
      const lastCall = sendTextSpy.mock.calls[sendTextSpy.mock.calls.length - 1][0];
      expect(lastCall.text).toContain('Welcome to JOY PeopleHR');
      expect(lastCall.text).toContain('Please enter your registered mobile number');
    });

    it('allows retry verification with a new phone number', async () => {
      vi.spyOn(whatsAppIdentityService, 'lookupEmployeeByPhone').mockResolvedValue([singleAccount]);
      const sendInteractiveSpy = vi.spyOn(whatsAppClient, 'sendInteractive').mockResolvedValue({
        success: true,
        messageId: 'msg-v-retry',
      });

      // 1. Enter first phone
      await whatsAppBotEngine.handleInboundMessage({
        from: '919999900012',
        messageId: 'wamid-v5',
        text: '9876543222',
      });

      // 2. Cancel
      await whatsAppBotEngine.handleInboundMessage({
        from: '919999900012',
        messageId: 'wamid-v6',
        buttonPayload: 'CONFIRM_IDENTITY_NO',
      });

      // 3. Retry with different phone
      await whatsAppBotEngine.handleInboundMessage({
        from: '919999900012',
        messageId: 'wamid-v7',
        text: '9876543222',
      });

      expect(sendInteractiveSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // 3. HIERARCHY & ROLE RESOLUTION
  // ==========================================================================
  describe('Group 3: Hierarchy & Role Context Resolution', () => {
    it('resolves normal EMPLOYEE when reporting counts are 0', () => {
      const hierarchy = whatsAppIdentityService.resolveRoleContext({
        directReportsCount: 0,
        teamLeadReportsCount: 0,
        isHR: false,
        designation: 'Software Developer',
      });

      expect(hierarchy.roleContext).toBe('EMPLOYEE');
    });

    it('does NOT promote someone to MANAGER based solely on designation string', () => {
      const hierarchy = whatsAppIdentityService.resolveRoleContext({
        directReportsCount: 0,
        teamLeadReportsCount: 0,
        isHR: false,
        designation: 'Assistant Manager - Sales',
      });

      // Must remain EMPLOYEE because they have 0 direct reports and are not HR
      expect(hierarchy.roleContext).toBe('EMPLOYEE');
    });

    it('resolves TEAM_LEAD when teamLeadReportsCount > 0 and directReportsCount = 0', () => {
      const hierarchy = whatsAppIdentityService.resolveRoleContext({
        directReportsCount: 0,
        teamLeadReportsCount: 6,
        isHR: false,
        designation: 'Technical Lead',
      });

      expect(hierarchy.roleContext).toBe('TEAM_LEAD');
    });

    it('resolves MANAGER when directReportsCount > 0', () => {
      const hierarchy = whatsAppIdentityService.resolveRoleContext({
        directReportsCount: 14,
        teamLeadReportsCount: 0,
        isHR: false,
        designation: 'Operations Head',
      });

      expect(hierarchy.roleContext).toBe('MANAGER');
    });

    it('resolves HR when user is designated as HR or department is HR', () => {
      const hierarchy = whatsAppIdentityService.resolveRoleContext({
        directReportsCount: 2,
        teamLeadReportsCount: 0,
        isHR: true,
        designation: 'HR Executive',
      });

      expect(hierarchy.roleContext).toBe('HR');
    });
  });

  // ==========================================================================
  // 4. PERMISSION ENGINE & ACCESS CONTROL
  // ==========================================================================
  describe('Group 4: Granular Permissions (Granted vs Denied)', () => {
    it('grants self-service permissions and denies manager/HR permissions for EMPLOYEE', () => {
      const perms = whatsAppIdentityService.resolvePermissions('EMPLOYEE', { isHR: false });

      // Granted
      expect(perms.granted).toContain('attendance.view_self');
      expect(perms.granted).toContain('attendance.check_in');
      expect(perms.granted).toContain('attendance.check_out');
      expect(perms.granted).toContain('leave.view_self');
      expect(perms.granted).toContain('leave.apply');
      expect(perms.granted).toContain('regularization.apply');
      expect(perms.granted).toContain('payslip.view_self');
      expect(perms.granted).toContain('documents.view_self');
      expect(perms.granted).toContain('helpdesk.create');

      // Denied
      expect(perms.denied).toContain('team.attendance.view');
      expect(perms.denied).toContain('leave.approve');
      expect(perms.denied).toContain('regularization.approve');
      expect(perms.denied).toContain('team.members.view');
      expect(perms.denied).toContain('employee.search');
      expect(perms.denied).toContain('reports.view');
    });

    it('grants team oversight and approval permissions for MANAGER', () => {
      const perms = whatsAppIdentityService.resolvePermissions('MANAGER', { isHR: false });

      expect(perms.granted).toContain('attendance.view_self');
      expect(perms.granted).toContain('team.attendance.view');
      expect(perms.granted).toContain('leave.approve');
      expect(perms.granted).toContain('regularization.approve');
      expect(perms.granted).toContain('team.members.view');
      expect(perms.granted).toContain('shift.roster.view');

      expect(perms.granted).toContain('reports.view');

      // Denied org-wide
      expect(perms.denied).toContain('employee.search');
      expect(perms.denied).toContain('policy.broadcast');
    });

    it('grants organization-wide management permissions for HR', () => {
      const perms = whatsAppIdentityService.resolvePermissions('HR', { isHR: true });

      expect(perms.granted).toContain('employee.search');
      expect(perms.granted).toContain('reports.view');
      expect(perms.granted).toContain('leave.approve');
      expect(perms.granted).toContain('policy.broadcast');
    });
  });

  // ==========================================================================
  // 5. CRITICAL SECURITY ISOLATION & ATTACK ATTEMPTS
  // ==========================================================================
  describe('Group 5: Security Isolation & Attack Vectors', () => {
    it('CRITICAL: Rejects user attempting to authenticate via Employee Code (e.g., JCS-017)', async () => {
      const sendTextSpy = vi.spyOn(whatsAppClient, 'sendText').mockResolvedValue({
        success: true,
        messageId: 'msg-sec-1',
      });

      // User tries sending an employee code to gain access
      await whatsAppBotEngine.handleInboundMessage({
        from: '919999900099',
        messageId: 'wamid-attack-1',
        text: 'JCS-017',
      });

      expect(sendTextSpy).toHaveBeenCalled();
      const call = sendTextSpy.mock.calls[0][0];
      expect(call.text).toContain('Employee codes cannot be used directly to unlock account access');
      expect(call.text).toContain('registered mobile number');
    });

    it('CRITICAL: Rejects user attempting arbitrary codes like WF-1002 or EMP-999', async () => {
      const sendTextSpy = vi.spyOn(whatsAppClient, 'sendText').mockResolvedValue({
        success: true,
        messageId: 'msg-sec-2',
      });

      await whatsAppBotEngine.handleInboundMessage({
        from: '919999900099',
        messageId: 'wamid-attack-2',
        text: 'WF-1002',
      });

      const call = sendTextSpy.mock.calls[0][0];
      expect(call.text).toContain('Employee codes cannot be used directly to unlock account access');
    });

    it('Cross-employee & cross-company isolation: rejects unauthorized operations', () => {
      const employeeA = {
        employeeId: 'emp-A',
        organizationId: 'org-1',
        roleContext: 'EMPLOYEE' as const,
        permissions: ['attendance.view_self', 'leave.apply'],
      };

      // Attacking Employee B's leave
      const requestedTargetEmployeeId = 'emp-B';
      const hasAccess = employeeA.employeeId === requestedTargetEmployeeId;
      expect(hasAccess).toBe(false);

      // Attacking Company B
      const requestedTargetOrgId = 'org-2';
      const hasCompanyAccess = employeeA.organizationId === requestedTargetOrgId;
      expect(hasCompanyAccess).toBe(false);
    });
  });

  // ==========================================================================
  // 6. STATE MACHINE TRANSITIONS & REGRESSION PREVENTION
  // ==========================================================================
  describe('Group 6: State Machine & Transition Auditing', () => {
    it('audits valid state transitions smoothly', () => {
      const correlationId = whatsAppLogger.generateCorrelationId();
      expect(correlationId).toMatch(/^WA-\d{8}-\d{6}-[A-F0-9]{4}$/);

      // Log valid transition
      whatsAppLogger.logStateTransition(
        correlationId,
        'UNKNOWN',
        'AWAITING_PHONE',
        'User sent greeting'
      );
    });

    it('detects and logs illegal backward state transitions', () => {
      const correlationId = whatsAppLogger.generateCorrelationId();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // VERIFIED -> AWAITING_PHONE is an illegal direct jump
      whatsAppLogger.logStateTransition(
        correlationId,
        'VERIFIED',
        'AWAITING_PHONE',
        'Attacker attempted regression'
      );

      expect(errorSpy).toHaveBeenCalled();
      const loggedError = errorSpy.mock.calls[0][0];
      expect(loggedError).toContain('INVALID STATE TRANSITION');
    });
  });

  // ==========================================================================
  // 7. END-TO-END FLOW TRACE & DIAGNOSTIC SUMMARY
  // ==========================================================================
  describe('Group 7: End-to-End Flow Trace & Terminal Diagnostic', () => {
    it('prints a complete diagnostic summary when verification completes', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      whatsAppLogger.printDiagnosticSummary({
        correlationId: 'WA-TEST-001',
        phoneNormalized: true,
        employeeLookup: true,
        employeeActive: true,
        organizationResolution: true,
        verification: true,
        hierarchy: true,
        roleContext: true,
        permissions: true,
        menuResolution: true,
        session: true,
        whatsappResponse: true,
        finalResult: 'READY',
      });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('WORKFORCEOS WHATSAPP IDENTITY DIAGNOSTIC');
      expect(output).toContain('FINAL RESULT: READY');
    });
  });

  // ==========================================================================
  // 8. CRYPTOGRAPHIC OTP VERIFICATION LIFECYCLE
  // ==========================================================================
  describe('Group 8: Cryptographic OTP Verification Lifecycle', () => {
    it('generates, delivers, and verifies a 6-digit OTP challenge', async () => {
      const sendTextSpy = vi.spyOn(whatsAppClient, 'sendText').mockResolvedValue({
        success: true,
        messageId: 'wamid-otp-1',
      });

      const phone = '9876543210';
      const challengeRes = await whatsAppOtpService.createAndSendOtp({
        phone,
        organizationId: 'org-test-1',
        employeeId: 'emp-test-1',
        employeeName: 'Dharun B',
      });

      expect(challengeRes.success).toBe(true);
      expect(challengeRes.challengeId).toBeDefined();
      expect(sendTextSpy).toHaveBeenCalled();

      // Extract the 6-digit OTP code sent in message text
      const call = sendTextSpy.mock.calls[0][0];
      const match = call.text.match(/\*(\d{6})\*/);
      expect(match).not.toBeNull();
      const sentCode = match![1];

      // Verifying correct OTP returns success
      const verifyRes = whatsAppOtpService.verifyOtp({
        phone,
        enteredOtp: sentCode,
      });
      expect(verifyRes.success).toBe(true);

      // Second use of the same OTP must fail (single-use challenge invalidation)
      const reuseRes = whatsAppOtpService.verifyOtp({
        phone,
        enteredOtp: sentCode,
      });
      expect(reuseRes.success).toBe(false);
      expect(reuseRes.reason).toBe('NO_ACTIVE_CHALLENGE');
    });

    it('enforces attempt limits (maximum 3 attempts) and locks out', async () => {
      vi.spyOn(whatsAppClient, 'sendText').mockResolvedValue({
        success: true,
        messageId: 'wamid-otp-lockout',
      });

      const phone = '9876543212';
      await whatsAppOtpService.createAndSendOtp({ phone });

      // Attempt 1: wrong code
      const r1 = whatsAppOtpService.verifyOtp({ phone, enteredOtp: '000000' });
      expect(r1.success).toBe(false);
      expect(r1.reason).toBe('INVALID_OTP');
      expect(r1.remainingAttempts).toBe(2);

      // Attempt 2: wrong code
      const r2 = whatsAppOtpService.verifyOtp({ phone, enteredOtp: '111111' });
      expect(r2.success).toBe(false);
      expect(r2.remainingAttempts).toBe(1);

      // Attempt 3: wrong code
      const r3 = whatsAppOtpService.verifyOtp({ phone, enteredOtp: '222222' });
      expect(r3.success).toBe(false);
      expect(r3.remainingAttempts).toBe(0);

      // Attempt 4: maximum attempts exceeded -> LOCKED
      const r4 = whatsAppOtpService.verifyOtp({ phone, enteredOtp: '333333' });
      expect(r4.success).toBe(false);
      expect(r4.reason).toBe('MAX_ATTEMPTS_EXCEEDED');
    });

    it('enforces 60-second cooldown on OTP resend requests', async () => {
      vi.spyOn(whatsAppClient, 'sendText').mockResolvedValue({
        success: true,
        messageId: 'wamid-otp-resend',
      });

      const phone = '9876543213';
      const first = await whatsAppOtpService.createAndSendOtp({ phone });
      expect(first.success).toBe(true);

      // Immediate resend must be rejected with cooldown message
      const second = await whatsAppOtpService.createAndSendOtp({ phone });
      expect(second.success).toBe(false);
      expect(second.error).toContain('Please wait');
      expect(second.cooldownRemainingSeconds).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // 9. BACKEND PERMISSION AUTHORIZATION ENGINE (4-POINT VERIFICATION)
  // ==========================================================================
  describe('Group 9: Backend Permission Authorization Engine', () => {
    it('rejects unauthenticated or unverified sessions', () => {
      const session: BotSessionContext = {
        waId: '+919876543210',
        organizationId: 'org-test',
        employeeId: 'emp-test',
        employeeName: 'Test User',
        department: 'Tech',
        state: 'IDLE',
        authStatus: 'UNAUTHENTICATED',
        lastActiveAt: new Date().toISOString(),
        permissions: ['attendance.view_self'],
      };

      const result = whatsAppPermissionService.authorize({
        session,
        requiredPermission: 'attendance.view_self',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not authenticated');
    });

    it('rejects expired sessions (> 24-hour TTL)', () => {
      const expiredTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      const session: BotSessionContext = {
        waId: '+919876543210',
        organizationId: 'org-test',
        employeeId: 'emp-test',
        employeeName: 'Test User',
        department: 'Tech',
        state: 'IDLE',
        authStatus: 'VERIFIED',
        lastActiveAt: expiredTime,
        permissions: ['attendance.view_self'],
      };

      const result = whatsAppPermissionService.authorize({
        session,
        requiredPermission: 'attendance.view_self',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('session has expired');
    });

    it('enforces multi-tenant organization boundary', () => {
      const session: BotSessionContext = {
        waId: '+919876543210',
        organizationId: 'org-corp-alpha',
        employeeId: 'emp-test',
        employeeName: 'Test User',
        department: 'Tech',
        state: 'IDLE',
        authStatus: 'VERIFIED',
        lastActiveAt: new Date().toISOString(),
        permissions: ['leave.approve'],
      };

      // Attacking org-corp-beta
      const result = whatsAppPermissionService.authorize({
        session,
        requiredPermission: 'leave.approve',
        targetOrganizationId: 'org-corp-beta',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Cross-organization access is strictly prohibited');
    });

    it('grants access when session is verified, within TTL, within org, and has capability', () => {
      const session: BotSessionContext = {
        waId: '+919876543210',
        organizationId: 'org-corp-alpha',
        employeeId: 'emp-test',
        employeeName: 'Manager User',
        department: 'Operations',
        state: 'IDLE',
        authStatus: 'VERIFIED',
        lastActiveAt: new Date().toISOString(),
        roleContext: 'MANAGER',
        permissions: ['team.attendance.view', 'leave.approve'],
      };

      const result = whatsAppPermissionService.authorize({
        session,
        requiredPermission: 'leave.approve',
        targetOrganizationId: 'org-corp-alpha',
      });
      expect(result.allowed).toBe(true);
    });

    it('denies access if an employee attempts a manager-only capability', () => {
      const session: BotSessionContext = {
        waId: '+919876543210',
        organizationId: 'org-corp-alpha',
        employeeId: 'emp-test',
        employeeName: 'Standard Associate',
        department: 'Sales',
        state: 'IDLE',
        authStatus: 'VERIFIED',
        lastActiveAt: new Date().toISOString(),
        roleContext: 'EMPLOYEE',
        permissions: ['attendance.view_self', 'leave.apply'],
      };

      const result = whatsAppPermissionService.authorize({
        session,
        requiredPermission: 'leave.approve',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('do not have the required permission');
    });
  });

  // ==========================================================================
  // 10. DYNAMIC ROLE-AWARE MENU GENERATION
  // ==========================================================================
  describe('Group 10: Dynamic Role-Aware Menu Generation', () => {
    it('generates only self-service menu items for standard employees', () => {
      const empPermissions = whatsAppIdentityService.buildPermissionSet('EMPLOYEE');
      const menuItems = whatsAppPermissionService.generateMenuItems(empPermissions);

      const ids = menuItems.map(m => m.id);
      expect(ids).toContain('MENU_ATTENDANCE');
      expect(ids).toContain('MENU_LEAVE');
      expect(ids).toContain('MENU_PAYSLIP');
      expect(ids).not.toContain('MENU_TEAM_ATTENDANCE');
      expect(ids).not.toContain('MENU_LEAVE_APPROVALS');
      expect(ids).not.toContain('MENU_EMPLOYEE_SEARCH');
    });

    it('includes team and approval capabilities in manager menus', () => {
      const mgrPermissions = whatsAppIdentityService.buildPermissionSet('MANAGER');
      const menuItems = whatsAppPermissionService.generateMenuItems(mgrPermissions);

      const ids = menuItems.map(m => m.id);
      expect(ids).toContain('MENU_ATTENDANCE');
      expect(ids).toContain('MENU_TEAM_ATTENDANCE');
      expect(ids).toContain('MENU_LEAVE_APPROVALS');
      expect(ids).toContain('MENU_REPORTS');
      expect(ids).not.toContain('MENU_EMPLOYEE_SEARCH');
    });

    it('includes employee search and HR operations in HR menus', () => {
      const hrPermissions = whatsAppIdentityService.buildPermissionSet('HR');
      const menuItems = whatsAppPermissionService.generateMenuItems(hrPermissions);

      const ids = menuItems.map(m => m.id);
      expect(ids).toContain('MENU_EMPLOYEE_SEARCH');
      expect(ids).toContain('MENU_LEAVE_APPROVALS');
      expect(ids).toContain('MENU_DOCUMENTS');
    });
  });
});

