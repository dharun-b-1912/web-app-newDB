// src/services/whatsapp/__tests__/whatsappIdentity.test.ts
// ============================================================================
// Joy PeopleHR — Identity-First WhatsApp Bot & Hierarchy Test Suite
// Validates: Phone Normalization, Identity Verification, Hierarchy & Permissions, Role-Aware Menus
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeIndianPhone,
  isValidIndianMobile,
  extractPhoneNumberCandidate,
  formatDisplayPhone,
  whatsAppIdentityService,
  whatsAppBotEngine,
  whatsAppClient,
} from '../index';

describe('WhatsApp Identity-First Architecture', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. Phone Normalization (9876543210, +919876543210, 919876543210, 09876543210) ──
  describe('Phone Normalization & Extraction', () => {
    it('normalizes 10-digit, 11-digit leading zero, +91 and 91 prefixed phone numbers to canonical E.164', () => {
      expect(normalizeIndianPhone('9876543210')).toBe('919876543210');
      expect(normalizeIndianPhone('+919876543210')).toBe('919876543210');
      expect(normalizeIndianPhone('919876543210')).toBe('919876543210');
      expect(normalizeIndianPhone('09876543210')).toBe('919876543210');
      expect(normalizeIndianPhone('+91 98765 43210')).toBe('919876543210');
      expect(normalizeIndianPhone('91-98765-43210')).toBe('919876543210');
    });

    it('extracts candidate phone numbers from free-form user messages', () => {
      expect(extractPhoneNumberCandidate('9876543210')).toBe('919876543210');
      expect(extractPhoneNumberCandidate('My mobile number is 9876543210')).toBe('919876543210');
      expect(extractPhoneNumberCandidate('Please check +91 9876543210')).toBe('919876543210');
      expect(extractPhoneNumberCandidate('Hello there, how are you?')).toBeNull();
    });

    it('formats phone numbers for human-friendly display', () => {
      expect(formatDisplayPhone('919876543210')).toBe('+91 98765 43210');
      expect(formatDisplayPhone('9876543210')).toBe('+91 98765 43210');
    });
  });

  // ── 2. Hierarchy & Permission Resolution ────────────────────────────────────
  describe('Data-Driven Hierarchy & Permission Resolution', () => {
    it('resolves standard Employee permissions when employee has no direct reports', () => {
      const perms = whatsAppIdentityService.buildPermissionSet('EMPLOYEE');

      expect(perms).toContain('attendance.view_self');
      expect(perms).toContain('attendance.check_in');
      expect(perms).toContain('leave.view_self');
      expect(perms).toContain('leave.apply');
      expect(perms).toContain('payslip.view_self');
      expect(perms).toContain('profile.view_self');

      // Employees should NOT have manager or HR permissions
      expect(perms).not.toContain('leave.approve');
      expect(perms).not.toContain('team.attendance.view');
      expect(perms).not.toContain('employee.search');
    });

    it('resolves Manager role and adds team & approval permissions when direct reports exist', () => {
      const perms = whatsAppIdentityService.buildPermissionSet('MANAGER');

      expect(perms).toContain('attendance.view_self');
      expect(perms).toContain('team.attendance.view');
      expect(perms).toContain('team.leave.view');
      expect(perms).toContain('team.members.view');
      expect(perms).toContain('leave.approve');
      expect(perms).toContain('regularization.approve');
      expect(perms).toContain('reports.view');

      // Manager should not have HR-wide employee search
      expect(perms).not.toContain('employee.search');
    });

    it('resolves HR role and grants broad organization administration permissions', () => {
      const perms = whatsAppIdentityService.buildPermissionSet('HR');

      expect(perms).toContain('employee.search');
      expect(perms).toContain('employee.view');
      expect(perms).toContain('employee.documents.view');
      expect(perms).toContain('leave.approve');
      expect(perms).toContain('regularization.approve');
      expect(perms).toContain('reports.view');
    });
  });

  // ── 3. Role-Aware WhatsApp Home Menus ───────────────────────────────────────
  describe('Role-Aware WhatsApp Home Menus', () => {
    it('dispatches Employee Home Menu for regular staff', async () => {
      const sendTextSpy = vi.spyOn(whatsAppClient, 'sendText').mockResolvedValue({
        success: true,
        messageId: 'mock-msg-01',
      });

      await whatsAppIdentityService.sendRoleAwareHomeMenu('919876543210', {
        employeeId: 'emp-001',
        employeeCode: 'JCS-017',
        fullName: 'Dharun B',
        organizationId: 'org-001',
        companyName: 'Joy Corporate Solutions',
        department: 'Engineering & Technology',
        designation: 'Software Engineer',
        employmentStatus: 'Active',
        phone: '919876543210',
        roleContext: 'EMPLOYEE',
        directReportsCount: 0,
        teamLeadReportsCount: 0,
        permissions: whatsAppIdentityService.buildPermissionSet('EMPLOYEE'),
      });

      expect(sendTextSpy).toHaveBeenCalled();
      const callArg = sendTextSpy.mock.calls[0][0];
      expect(callArg.text).toContain('Welcome, *Dharun B* 👋');
      expect(callArg.text).toContain('Joy Corporate Solutions');
      expect(callArg.text).toContain('1️⃣ ⏰ *Attendance*');
      expect(callArg.text).toContain('2️⃣ 🌴 *Leave*');
      expect(callArg.text).toContain('3️⃣ 🕐 *Regularization*');
      expect(callArg.text).toContain('4️⃣ 💰 *Payslip*');
      expect(callArg.text).toContain('5️⃣ 👤 *My Profile*');
    });

    it('dispatches Manager Home Menu with Team options and Direct Reports count', async () => {
      const sendTextSpy = vi.spyOn(whatsAppClient, 'sendText').mockResolvedValue({
        success: true,
        messageId: 'mock-msg-02',
      });

      await whatsAppIdentityService.sendRoleAwareHomeMenu('919876543210', {
        employeeId: 'mgr-001',
        employeeCode: 'JCS-004',
        fullName: 'Arun K',
        organizationId: 'org-001',
        companyName: 'Joy Corporate Solutions',
        department: 'Engineering & Technology',
        designation: 'Engineering Manager',
        employmentStatus: 'Active',
        phone: '919876543210',
        roleContext: 'MANAGER',
        directReportsCount: 24,
        teamLeadReportsCount: 0,
        permissions: whatsAppIdentityService.buildPermissionSet('MANAGER'),
      });

      expect(sendTextSpy).toHaveBeenCalled();
      const callArg = sendTextSpy.mock.calls[0][0];
      expect(callArg.text).toContain('Welcome, *Arun K* 👋');
      expect(callArg.text).toContain('Manager');
      expect(callArg.text).toContain('Direct Reports:* 24');
      expect(callArg.text).toContain('3️⃣ 👥 *Team Attendance*');
      expect(callArg.text).toContain('4️⃣ 📝 *Leave Approvals*');
      expect(callArg.text).toContain('5️⃣ ⏳ *Regularization Approvals*');
      expect(callArg.text).toContain('6️⃣ 👤 *Team Members*');
    });

    it('dispatches HR Home Menu with Employee Search & Audit options', async () => {
      const sendTextSpy = vi.spyOn(whatsAppClient, 'sendText').mockResolvedValue({
        success: true,
        messageId: 'mock-msg-03',
      });

      await whatsAppIdentityService.sendRoleAwareHomeMenu('919876543210', {
        employeeId: 'hr-001',
        employeeCode: 'JCS-HR-001',
        fullName: 'Priya S',
        organizationId: 'org-001',
        companyName: 'Joy Corporate Solutions',
        department: 'Human Resources',
        designation: 'Head of People Operations',
        employmentStatus: 'Active',
        phone: '919876543210',
        roleContext: 'HR',
        directReportsCount: 6,
        teamLeadReportsCount: 0,
        permissions: whatsAppIdentityService.buildPermissionSet('HR'),
      });

      expect(sendTextSpy).toHaveBeenCalled();
      const callArg = sendTextSpy.mock.calls[0][0];
      expect(callArg.text).toContain('Welcome, *Priya S*');
      expect(callArg.text).toContain('HR Operations');
      expect(callArg.text).toContain('1️⃣ 🔍 *Employee Search*');
      expect(callArg.text).toContain('5️⃣ 📋 *Approvals*');
      expect(callArg.text).toContain('6️⃣ 📄 *Employee Documents*');
    });
  });

  // ── 4. Inbound Flow State Machine ──────────────────────────────────────────
  describe('Inbound Flow State Machine & Identity Verification', () => {
    it('prompts unknown user for registered mobile number on "Hi"', async () => {
      const sendTextSpy = vi.spyOn(whatsAppClient, 'sendText').mockResolvedValue({
        success: true,
        messageId: 'mock-msg-04',
      });

      // Mock lookup returning empty
      vi.spyOn(whatsAppIdentityService, 'lookupEmployeeByPhone').mockResolvedValue([]);

      await whatsAppBotEngine.handleInboundMessage({
        from: '919999900000',
        messageId: 'wamid.001',
        text: 'Hi',
      });

      expect(sendTextSpy).toHaveBeenCalled();
      const callArg = sendTextSpy.mock.calls[0][0];
      expect(callArg.text).toContain('Welcome to JOY PeopleHR');
      expect(callArg.text).toContain('Please enter your registered mobile number');
    });

    it('triggers verification prompt when a valid registered mobile number is entered', async () => {
      const sendInteractiveSpy = vi.spyOn(whatsAppClient, 'sendInteractive').mockResolvedValue({
        success: true,
        messageId: 'mock-msg-05',
      });

      vi.spyOn(whatsAppIdentityService, 'lookupEmployeeByPhone').mockResolvedValue([
        {
          employeeId: 'emp-017',
          employeeCode: 'JCS-017',
          fullName: 'Dharun B',
          organizationId: 'org-001',
          companyName: 'Joy Corporate Solutions',
          department: 'Engineering & Technology',
          designation: 'Software Engineer',
          employmentStatus: 'Active',
          phone: '919876543210',
          roleContext: 'EMPLOYEE',
          directReportsCount: 0,
          teamLeadReportsCount: 0,
          permissions: whatsAppIdentityService.buildPermissionSet('EMPLOYEE'),
        },
      ]);

      await whatsAppBotEngine.handleInboundMessage({
        from: '919999900000',
        messageId: 'wamid.002',
        text: '9876543210',
      });

      expect(sendInteractiveSpy).toHaveBeenCalled();
      const callArg = sendInteractiveSpy.mock.calls[0][0];
      expect(callArg.body.text).toContain('We found your employee account');
      expect(callArg.body.text).toContain('Dharun B');
      expect(callArg.body.text).toContain('JCS-017');
      expect(callArg.body.text).toContain('Joy Corporate Solutions');
      expect(callArg.body.text).toContain('Is this you?');
      expect(callArg.action.buttons[0].reply.id).toBe('CONFIRM_IDENTITY_YES');
    });

    it('verifies identity and unlocks the role-aware menu when user confirms', async () => {
      const sendTextSpy = vi.spyOn(whatsAppClient, 'sendText').mockResolvedValue({
        success: true,
        messageId: 'mock-msg-06',
      });

      vi.spyOn(whatsAppIdentityService, 'lookupEmployeeByPhone').mockResolvedValue([
        {
          employeeId: 'emp-017',
          employeeCode: 'JCS-017',
          fullName: 'Dharun B',
          organizationId: 'org-001',
          companyName: 'Joy Corporate Solutions',
          department: 'Engineering & Technology',
          designation: 'Software Engineer',
          employmentStatus: 'Active',
          phone: '919876543210',
          roleContext: 'EMPLOYEE',
          directReportsCount: 0,
          teamLeadReportsCount: 0,
          permissions: whatsAppIdentityService.buildPermissionSet('EMPLOYEE'),
        },
      ]);

      // 1. Enter phone number
      await whatsAppBotEngine.handleInboundMessage({
        from: '919999900000',
        messageId: 'wamid.003',
        text: '9876543210',
      });

      // 2. Click [ ✅ Yes, Continue ]
      await whatsAppBotEngine.handleInboundMessage({
        from: '919999900000',
        messageId: 'wamid.004',
        buttonPayload: 'CONFIRM_IDENTITY_YES',
      });

      expect(sendTextSpy).toHaveBeenCalled();
      const menuCall = sendTextSpy.mock.calls[sendTextSpy.mock.calls.length - 1][0];
      expect(menuCall.text).toContain('Welcome, *Dharun B* 👋');
      expect(menuCall.text).toContain('Joy Corporate Solutions');
      expect(menuCall.text).toContain('1️⃣ ⏰ *Attendance*');
    });
  });
});
