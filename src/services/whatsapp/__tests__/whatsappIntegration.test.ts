// src/services/whatsapp/__tests__/whatsappIntegration.test.ts
// ============================================================================
// Comprehensive Unit & Integration Tests for Joy PeopleHR WhatsApp Platform
// Validates Normalization, HSM Templates, Flow Schema, Webhook Ingress & Bot FSM
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  normalizeIndianPhone,
  isValidIndianMobile,
  maskPhoneNumber,
  maskBankAccount,
  WhatsAppTemplateRegistry,
  whatsAppFlowsEngine,
  LEAVE_APPLICATION_FLOW_SCHEMA,
  whatsAppWebhookHandler,
  whatsAppNotificationService,
} from '../index';

describe('WhatsApp Integration Suite — Joy PeopleHR', () => {
  // --------------------------------------------------------------------------
  // 1. Phone Normalization & Privacy Utilities
  // --------------------------------------------------------------------------
  describe('Phone Normalization & Security Masking', () => {
    it('normalizes 10-digit Indian numbers to E.164 without plus', () => {
      expect(normalizeIndianPhone('9876543210')).toBe('919876543210');
      expect(normalizeIndianPhone('+91 98765 43210')).toBe('919876543210');
      expect(normalizeIndianPhone('09876543210')).toBe('919876543210');
      expect(normalizeIndianPhone('91-9876543210')).toBe('919876543210');
    });

    it('validates valid Indian mobile prefixes (6, 7, 8, 9)', () => {
      expect(isValidIndianMobile('9876543210')).toBe(true);
      expect(isValidIndianMobile('8765432109')).toBe(true);
      expect(isValidIndianMobile('7654321098')).toBe(true);
      expect(isValidIndianMobile('6543210987')).toBe(true);
      expect(isValidIndianMobile('1234567890')).toBe(false);
    });

    it('masks phone numbers and bank account numbers for compliance', () => {
      expect(maskPhoneNumber('9876543210')).toBe('+91 ****** 3210');
      expect(maskBankAccount('123456789012')).toBe('XXXX9012');
      expect(maskBankAccount('9876')).toBe('9876');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Meta HSM Template Registry Validation
  // --------------------------------------------------------------------------
  describe('Meta HSM Template Registry', () => {
    it('builds compliant Payslip HSM Template with Document Header', () => {
      const payload = WhatsAppTemplateRegistry.buildPayslipTemplate({
        organizationId: 'org-test-01',
        employeeId: 'emp-001',
        employeeName: 'Anand Kumar',
        phone: '9876543210',
        monthYear: 'September 2026',
        netPay: 54300,
        bankAccountMasked: 'XXXX5012',
        payDate: '30-Sep-2026',
        payslipPdfUrl: 'https://joyhr.in/storage/payslips/sep26.pdf',
      });

      expect(payload.templateName).toBe('joy_monthly_payslip_v1');
      expect(payload.category).toBe('UTILITY');
      expect(payload.to).toBe('919876543210');
      expect(payload.components).toHaveLength(2);
      expect(payload.components[0].type).toBe('header');
      expect(payload.components[0].parameters[0].document?.link).toBe('https://joyhr.in/storage/payslips/sep26.pdf');
    });

    it('builds Leave Approval Request Template with Quick Reply Buttons', () => {
      const payload = WhatsAppTemplateRegistry.buildLeaveApprovalRequestTemplate({
        organizationId: 'org-test-01',
        leaveRequestId: 'req-8891',
        managerPhone: '9876543210',
        managerName: 'Prakash V',
        employeeName: 'Priya S',
        leaveType: 'Casual Leave',
        startDate: '25-Oct-2026',
        endDate: '26-Oct-2026',
        daysCount: 2,
        reason: 'Family Event',
      });

      expect(payload.templateName).toBe('joy_leave_approval_action_v1');
      expect(payload.components).toHaveLength(3); // body + 2 buttons
      expect(payload.components[1].parameters[0].payload).toBe('APPROVE_LEAVE_req-8891');
      expect(payload.components[2].parameters[0].payload).toBe('REJECT_LEAVE_req-8891');
    });
  });

  // --------------------------------------------------------------------------
  // 3. WhatsApp Flows Engine & Meta Schema Validation
  // --------------------------------------------------------------------------
  describe('WhatsApp Flows Engine (Meta v3.1)', () => {
    it('validates pre-built Leave Application Flow JSON Schema', () => {
      const result = whatsAppFlowsEngine.validateFlowSchema(LEAVE_APPLICATION_FLOW_SCHEMA);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(LEAVE_APPLICATION_FLOW_SCHEMA.screens).toHaveLength(2);
      expect(LEAVE_APPLICATION_FLOW_SCHEMA.screens[0].id).toBe('LEAVE_FORM_SCREEN');
      expect(LEAVE_APPLICATION_FLOW_SCHEMA.screens[1].id).toBe('SUMMARY_CONFIRM_SCREEN');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Webhook Ingress & Token Verification
  // --------------------------------------------------------------------------
  describe('Meta Webhook Ingress Handler', () => {
    it('validates Meta webhook challenge subscription', () => {
      const result = whatsAppWebhookHandler.verifySubscription({
        mode: 'subscribe',
        token: 'joy_peoplehr_meta_webhook_secret_token',
        challenge: 'random_challenge_string_12345',
      });

      expect(result.isValid).toBe(true);
      expect(result.challenge).toBe('random_challenge_string_12345');
    });

    it('rejects invalid webhook challenge token', () => {
      const result = whatsAppWebhookHandler.verifySubscription({
        mode: 'subscribe',
        token: 'invalid_forged_token',
        challenge: 'challenge_123',
      });

      expect(result.isValid).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 5. High-Level Automation Service Dispatch
  // --------------------------------------------------------------------------
  describe('WhatsApp Notification Service', () => {
    it('dispatches Payslip notification without errors', async () => {
      const res = await whatsAppNotificationService.sendMonthlyPayslip({
        organizationId: 'org-test-01',
        employeeId: 'emp-001',
        employeeName: 'Anand Kumar',
        phone: '9876543210',
        monthYear: 'September 2026',
        netPay: 54300,
        bankAccountMasked: 'XXXX5012',
        payDate: '30-Sep-2026',
        payslipPdfUrl: 'https://joyhr.in/storage/payslips/sep26.pdf',
      });

      expect(res.success).toBe(true);
    });
  });
});
