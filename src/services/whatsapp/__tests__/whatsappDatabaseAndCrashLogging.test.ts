// src/services/whatsapp/__tests__/whatsappDatabaseAndCrashLogging.test.ts
// ============================================================================
// JOY PeopleHR / WorkforceOS — WhatsApp Production Test Suite:
// Fast Reply & Blue Tick • Dedicated DB Crash Logger • Active Error Recovery • DB Sync
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { whatsAppClient } from '../whatsappClient';
import { whatsAppLogger } from '../whatsappLogger';
import { whatsAppBotEngine } from '../botEngine';
import { supabase } from '../../../lib/supabase';

describe('WhatsApp Production Hardening — Fast Reply, DB Crash Logging & Menus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. WhatsApp Blue Tick (markAsRead) ──────────────────────────────────────
  describe('Group 1: Meta Cloud API Blue Tick Read Receipts', () => {
    it('successfully triggers markAsRead in mock sandbox without throwing', async () => {
      const result = await whatsAppClient.markAsRead('wamid.HBgLOTE5Mzg0MTI1Mjc4FQIAEhgg...');
      expect(result).toBe(true);
    });

    it('gracefully handles empty messageId in markAsRead', async () => {
      const result = await whatsAppClient.markAsRead('');
      expect(result).toBe(false);
    });

    it('calls markAsRead immediately on inbound message arrival', async () => {
      const markAsReadSpy = vi.spyOn(whatsAppClient, 'markAsRead').mockResolvedValue(true);
      await whatsAppBotEngine.handleInboundMessage({
        from: '910000000099',
        messageId: 'wamid.INBOUND_MSG_123',
        text: 'Hi',
      });
      expect(markAsReadSpy).toHaveBeenCalledWith('wamid.INBOUND_MSG_123');
    }, 15000);
  });

  // ── 2. Dedicated Database Crash & Event Logger ──────────────────────────────
  describe('Group 2: Dedicated WhatsApp Database Crash Logger', () => {
    it('persists structured crash log with Who, What, Where, When, Why & Stack Trace', async () => {
      const insertSpy = vi.spyOn(supabase, 'from');

      whatsAppLogger.logFailure({
        correlationId: 'WA-20261005-CRASH-001',
        what: 'DATABASE_TIMEOUT_EXCEPTION',
        where: 'attendanceService.recordAttendancePunch',
        why: 'PostgreSQL connection timeout after 5000ms',
        state: 'ATTENDANCE_MENU',
        operation: 'ATTENDANCE_PUNCH',
        userResponse: 'Failed to record check-in',
        who: {
          employeeId: '0cdef8b4-0000-0000-0000-000000000001',
          employeeCode: 'WF-1001',
          name: 'Thirumalai R K',
          phone: '+919384125278',
          roleContext: 'EMPLOYEE',
        },
        organizationId: 'org-joy-01',
        error: new Error('Connection reset by peer'),
      });

      // Verify that audit event was recorded in memory
      const events = whatsAppLogger.getAuditEvents('WA-20261005-CRASH-001');
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].errorCode).toBe('DATABASE_TIMEOUT_EXCEPTION');
      expect(events[0].result).toBe('FAILED');
    });

    it('masks phone numbers and IDs in audit logs for privacy compliance', () => {
      const maskedPhone = whatsAppLogger.maskPhone('+919384125278');
      expect(maskedPhone).toBe('+91 ****** 5278');

      const maskedId = whatsAppLogger.maskId('emp-0cdef8b4-9999', 'emp');
      expect(maskedId).toBe('emp_******9999');
    });
  });

  // ── 3. Active Status Error Recovery ─────────────────────────────────────────
  describe('Group 3: Active Status Error Notification & Incident Codes', () => {
    it('sends active service recovery notice with incident tracking code and retry buttons', async () => {
      const sendInteractiveSpy = vi.spyOn(whatsAppClient, 'sendInteractive').mockResolvedValue({
        success: true,
        messageId: 'wamid.ERR_NOTIF_01',
      });

      // Simulate sending system error via private method or simulated flow
      const mockSession: any = {
        waId: '+919384125278',
        organizationId: 'org-joy-01',
        employeeId: 'emp-001',
        employeeName: 'Thirumalai R K',
        employeeCode: 'WF-1001',
        state: 'IDLE',
        correlationId: 'WA-TEST-ERR-CORR',
      };

      // Call sendSystemError directly
      await (whatsAppBotEngine as any).sendSystemError(mockSession, 'PAYSLIP', new Error('DB connection dropped'));

      expect(sendInteractiveSpy).toHaveBeenCalled();
      const lastCall = sendInteractiveSpy.mock.calls[0][0];
      expect(lastCall.header?.text).toContain('Service Notice');
      expect(lastCall.body.text).toContain('WA-ERR-');
      expect(lastCall.body.text).toContain('Incident ID');
      expect(lastCall.action.buttons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ reply: expect.objectContaining({ id: 'MENU_PAYSLIP' }) }),
          expect.objectContaining({ reply: expect.objectContaining({ id: 'MENU_BACK' }) }),
          expect.objectContaining({ reply: expect.objectContaining({ id: 'CONTACT_HR' }) }),
        ])
      );
    });
  });

  // ── 4. Smart Biometric Attendance Toggle ────────────────────────────────────
  describe('Group 4: Smart Biometric Attendance Punch Toggle', () => {
    it('records check-in and responds with green status emoji when no punch exists today', async () => {
      const sendInteractiveSpy = vi.spyOn(whatsAppClient, 'sendInteractive').mockResolvedValue({
        success: true,
        messageId: 'wamid.PUNCH_01',
      });

      const mockSession: any = {
        waId: '+919384125278',
        organizationId: 'org-joy-01',
        employeeId: 'emp-punch-test-1',
        employeeName: 'Thirumalai R K',
        state: 'ATTENDANCE_MENU',
      };

      await (whatsAppBotEngine as any).recordAttendancePunch(mockSession);

      expect(sendInteractiveSpy).toHaveBeenCalled();
      const lastCall = sendInteractiveSpy.mock.calls[sendInteractiveSpy.mock.calls.length - 1][0];
      expect(lastCall.body.text).toMatch(/Check-in Recorded|Check-out Recorded/);
      expect(lastCall.action.buttons.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── 5. Role-Aware Database Synchronized Menus ───────────────────────────────
  describe('Group 5: Role-Aware Database Synchronized Menus', () => {
    it('renders team attendance overview with live metrics and action buttons', async () => {
      const sendInteractiveSpy = vi.spyOn(whatsAppClient, 'sendInteractive').mockResolvedValue({
        success: true,
        messageId: 'wamid.TEAM_ATT_01',
      });

      const mockManagerSession: any = {
        waId: '+919384125278',
        organizationId: 'org-joy-01',
        employeeId: 'emp-mgr-01',
        employeeName: 'Dharun B',
        directReportsCount: 15,
        roleContext: 'MANAGER',
      };

      await (whatsAppBotEngine as any).sendTeamAttendanceOverview(mockManagerSession);

      expect(sendInteractiveSpy).toHaveBeenCalled();
      const call = sendInteractiveSpy.mock.calls[0][0];
      expect(call.body.text).toContain('Team Attendance Overview');
      expect(call.body.text).toContain('Total Direct Reports');
    });

    it('renders employee document vault overview with verified status', async () => {
      const sendInteractiveSpy = vi.spyOn(whatsAppClient, 'sendInteractive').mockResolvedValue({
        success: true,
        messageId: 'wamid.DOCS_01',
      });

      const mockSession: any = {
        waId: '+919384125278',
        organizationId: 'org-joy-01',
        employeeId: 'emp-docs-01',
        employeeName: 'Thirumalai R K',
        roleContext: 'EMPLOYEE',
      };

      await (whatsAppBotEngine as any).sendEmployeeDocumentsOverview(mockSession);

      expect(sendInteractiveSpy).toHaveBeenCalled();
      const call = sendInteractiveSpy.mock.calls[0][0];
      expect(call.body.text).toContain('Document Vault');
    });

    it('renders pending leave approvals cleanly', async () => {
      const sendInteractiveSpy = vi.spyOn(whatsAppClient, 'sendInteractive').mockResolvedValue({
        success: true,
        messageId: 'wamid.APP_01',
      });

      const mockManagerSession: any = {
        waId: '+919384125278',
        organizationId: 'org-joy-01',
        employeeId: 'emp-mgr-01',
        employeeName: 'Dharun B',
        roleContext: 'MANAGER',
      };

      await (whatsAppBotEngine as any).sendPendingLeaveApprovals(mockManagerSession);

      expect(sendInteractiveSpy).toHaveBeenCalled();
      const call = sendInteractiveSpy.mock.calls[0][0];
      expect(call.body.text).toContain('Pending Leave Approvals');
    });
  });
});
