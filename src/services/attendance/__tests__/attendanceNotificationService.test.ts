// src/services/attendance/__tests__/attendanceNotificationService.test.ts
// ============================================================================
// JOY PeopleHR — Attendance Supervisor Push & In-App Notification Test Suite
// Verifies check-in/out event triggers, reporting hierarchy resolution,
// deduplication, in-app persistence, remote push delivery, and idempotency.
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { attendanceNotificationService } from '../attendanceNotificationService';
import { attendanceIngestionService } from '../attendanceIngestionService';

describe('JOY PeopleHR — Attendance Supervisor Push & In-App Notification Engine', () => {
  beforeEach(() => {
    attendanceNotificationService.clearState();
    attendanceIngestionService.clearState();
    vi.restoreAllMocks();
  });

  describe('1. Notification Content & Formatting', () => {
    it('generates professional, precise check-in notification text with employee code and source', () => {
      const sourceMobile = attendanceNotificationService.getSourceLabel('MOBILE');
      const sourceBio = attendanceNotificationService.getSourceLabel('BIOMETRIC');
      const sourceWeb = attendanceNotificationService.getSourceLabel('WEB');

      expect(sourceMobile).toBe('Mobile App');
      expect(sourceBio).toBe('Biometric Terminal');
      expect(sourceWeb).toBe('Web Portal');

      const timeStr = attendanceNotificationService.formatTimeIst('2026-10-21T09:15:00.000+05:30');
      expect(timeStr).toMatch(/09:15\s?(AM|am)/);
    });
  });

  describe('2. Check-In Accepted Event Processing', () => {
    it('dispatches check-in notifications to resolved Reporting Manager & TL', async () => {
      // Mock hierarchy resolver
      vi.spyOn(attendanceNotificationService, 'resolveAttendanceSupervisors').mockResolvedValue({
        punchingEmployee: {
          id: 'emp-arjun-099',
          code: 'JCS-099',
          name: 'Arjun Kumar',
        },
        supervisors: [
          {
            employeeId: 'mgr-dharun-017',
            employeeCode: 'JCS-017',
            name: 'Dharun B',
            role: 'REPORTING_MANAGER',
            authUserId: 'user-dharun-auth',
            fcmTokens: ['fcm_token_dharun_active_device'],
          },
          {
            employeeId: 'tl-praveen-102',
            employeeCode: 'JMS-102',
            name: 'Praveen B',
            role: 'TL_SUPERVISOR',
            authUserId: 'user-praveen-auth',
            fcmTokens: ['fcm_token_praveen_device'],
          },
        ],
      });

      // Mock remote push and in-app
      vi.spyOn(attendanceNotificationService, 'dispatchPushToSupervisor').mockResolvedValue({
        success: true,
        messageId: 'projects/joy-peoplehr/messages/12345678',
      });
      vi.spyOn(attendanceNotificationService, 'persistInAppNotification').mockResolvedValue('notif-event-uuid-1');

      const log = await attendanceNotificationService.handleAttendanceEventAccepted({
        organizationId: 'org-joy-corp',
        punchId: 'punch-101',
        employeeId: 'emp-arjun-099',
        eventType: 'attendance.check_in.accepted',
        punchType: 'CHECK_IN',
        source: 'MOBILE',
        punchTime: '2026-10-21T09:15:00.000+05:30',
      });

      expect(log.punchingEmployee.name).toBe('Arjun Kumar');
      expect(log.resolvedRecipients.length).toBe(2);
      expect(log.missingHierarchy).toBe(false);

      // Verify deliveries recorded
      const inAppDeliveries = log.deliveries.filter((d) => d.channel === 'IN_APP');
      const pushDeliveries = log.deliveries.filter((d) => d.channel === 'PUSH');

      expect(inAppDeliveries.length).toBe(2);
      expect(pushDeliveries.length).toBe(2);
      expect(pushDeliveries[0].status).toBe('SENT');
      expect(pushDeliveries[0].providerMessageId).toBe('projects/joy-peoplehr/messages/12345678');
    });
  });

  describe('3. Check-Out Accepted Event Processing', () => {
    it('dispatches distinct check-out notifications', async () => {
      vi.spyOn(attendanceNotificationService, 'resolveAttendanceSupervisors').mockResolvedValue({
        punchingEmployee: {
          id: 'emp-arjun-099',
          code: 'JCS-099',
          name: 'Arjun Kumar',
        },
        supervisors: [
          {
            employeeId: 'mgr-dharun-017',
            employeeCode: 'JCS-017',
            name: 'Dharun B',
            role: 'REPORTING_MANAGER',
            authUserId: 'user-dharun-auth',
            fcmTokens: ['fcm_token_dharun_active_device'],
          },
        ],
      });

      vi.spyOn(attendanceNotificationService, 'dispatchPushToSupervisor').mockResolvedValue({
        success: true,
        messageId: 'projects/joy-peoplehr/messages/checkout-999',
      });
      vi.spyOn(attendanceNotificationService, 'persistInAppNotification').mockResolvedValue('notif-checkout-1');

      const log = await attendanceNotificationService.handleAttendanceEventAccepted({
        organizationId: 'org-joy-corp',
        punchId: 'punch-out-202',
        employeeId: 'emp-arjun-099',
        eventType: 'attendance.check_out.accepted',
        punchType: 'CHECK_OUT',
        source: 'BIOMETRIC',
        punchTime: '2026-10-21T18:30:00.000+05:30',
      });

      expect(log.eventType).toBe('attendance.check_out.accepted');
      expect(log.deliveries.some((d) => d.status === 'SENT')).toBe(true);
    });
  });

  describe('4. Deduplication & Hierarchy Routing Rules', () => {
    it('deduplicates when Reporting Manager and Team Lead are the same individual', async () => {
      vi.spyOn(attendanceNotificationService, 'resolveAttendanceSupervisors').mockResolvedValue({
        punchingEmployee: {
          id: 'emp-thiru-20',
          code: 'JCS-20',
          name: 'Thirumalai R K',
        },
        supervisors: [
          {
            employeeId: 'mgr-praveen-102',
            employeeCode: 'JMS-102',
            name: 'Praveen B',
            role: 'REPORTING_MANAGER_AND_TL',
            authUserId: 'user-praveen-auth',
            fcmTokens: ['fcm_token_praveen'],
          },
        ],
      });

      vi.spyOn(attendanceNotificationService, 'dispatchPushToSupervisor').mockResolvedValue({
        success: true,
        messageId: 'projects/joy/messages/dedup-1',
      });
      vi.spyOn(attendanceNotificationService, 'persistInAppNotification').mockResolvedValue('notif-dedup-1');

      const log = await attendanceNotificationService.handleAttendanceEventAccepted({
        organizationId: 'org-joy-corp',
        punchId: 'punch-303',
        employeeId: 'emp-thiru-20',
        eventType: 'attendance.check_in.accepted',
        punchType: 'CHECK_IN',
        source: 'WEB',
        punchTime: '2026-10-21T09:00:00.000+05:30',
      });

      // Recipient should only be 1 (deduplicated)
      expect(log.resolvedRecipients.length).toBe(1);
      expect(log.resolvedRecipients[0].role).toBe('REPORTING_MANAGER_AND_TL');
      expect(log.deliveries.filter((d) => d.channel === 'PUSH').length).toBe(1);
    });

    it('safely records a routing exception and never broadcasts when no supervisors are mapped', async () => {
      vi.spyOn(attendanceNotificationService, 'resolveAttendanceSupervisors').mockResolvedValue({
        punchingEmployee: {
          id: 'emp-unmapped-01',
          code: 'JCS-999',
          name: 'Unmapped Contractor',
        },
        supervisors: [],
        routingException: 'No Reporting Manager or TL/Supervisor configured for Unmapped Contractor (JCS-999)',
      });

      const pushSpy = vi.spyOn(attendanceNotificationService, 'dispatchPushToSupervisor');
      const inAppSpy = vi.spyOn(attendanceNotificationService, 'persistInAppNotification');

      const log = await attendanceNotificationService.handleAttendanceEventAccepted({
        organizationId: 'org-joy-corp',
        punchId: 'punch-404',
        employeeId: 'emp-unmapped-01',
        eventType: 'attendance.check_in.accepted',
        punchType: 'CHECK_IN',
        source: 'MOBILE',
        punchTime: '2026-10-21T09:05:00.000+05:30',
      });

      expect(log.missingHierarchy).toBe(true);
      expect(log.routingException).toContain('No Reporting Manager');
      expect(log.resolvedRecipients.length).toBe(0);
      expect(log.deliveries.length).toBe(0);

      // Verify no push or in-app broadcast occurred
      expect(pushSpy).not.toHaveBeenCalled();
      expect(inAppSpy).not.toHaveBeenCalled();
    });
  });

  describe('5. Unregistered Supervisor Devices', () => {
    it('handles supervisor with no mobile device registered without throwing error', async () => {
      vi.spyOn(attendanceNotificationService, 'resolveAttendanceSupervisors').mockResolvedValue({
        punchingEmployee: {
          id: 'emp-arjun-099',
          code: 'JCS-099',
          name: 'Arjun Kumar',
        },
        supervisors: [
          {
            employeeId: 'mgr-no-device',
            employeeCode: 'JCS-555',
            name: 'Web Only Manager',
            role: 'REPORTING_MANAGER',
            fcmTokens: [], // Zero registered devices
          },
        ],
      });

      vi.spyOn(attendanceNotificationService, 'persistInAppNotification').mockResolvedValue('notif-web-1');

      const log = await attendanceNotificationService.handleAttendanceEventAccepted({
        organizationId: 'org-joy-corp',
        punchId: 'punch-505',
        employeeId: 'emp-arjun-099',
        eventType: 'attendance.check_in.accepted',
        punchType: 'CHECK_IN',
        source: 'MOBILE',
        punchTime: '2026-10-21T09:10:00.000+05:30',
      });

      // In-app should be sent
      const inApp = log.deliveries.find((d) => d.channel === 'IN_APP');
      expect(inApp?.status).toBe('SENT');

      // Push should be recorded as SKIPPED_NO_DEVICE
      const push = log.deliveries.find((d) => d.channel === 'PUSH');
      expect(push?.status).toBe('SKIPPED_NO_DEVICE');
      expect(push?.errorMessage).toContain('no registered mobile app device');
    });
  });

  describe('6. Idempotency & Duplicate Punch Rejection', () => {
    it('does not re-dispatch notifications on idempotent event re-run', async () => {
      vi.spyOn(attendanceNotificationService, 'resolveAttendanceSupervisors').mockResolvedValue({
        punchingEmployee: {
          id: 'emp-arjun-099',
          code: 'JCS-099',
          name: 'Arjun Kumar',
        },
        supervisors: [
          {
            employeeId: 'mgr-dharun-017',
            employeeCode: 'JCS-017',
            name: 'Dharun B',
            role: 'REPORTING_MANAGER',
            fcmTokens: ['token_1'],
          },
        ],
      });

      vi.spyOn(attendanceNotificationService, 'dispatchPushToSupervisor').mockResolvedValue({
        success: true,
        messageId: 'msg-idempotent-1',
      });
      vi.spyOn(attendanceNotificationService, 'persistInAppNotification').mockResolvedValue('notif-1');

      const payload = {
        organizationId: 'org-joy-corp',
        punchId: 'punch-idem-777',
        employeeId: 'emp-arjun-099',
        eventType: 'attendance.check_in.accepted' as const,
        punchType: 'CHECK_IN' as const,
        source: 'MOBILE' as const,
        punchTime: '2026-10-21T09:15:00.000+05:30',
        idempotencyKey: 'idempotent-key-777',
      };

      const firstLog = await attendanceNotificationService.handleAttendanceEventAccepted(payload);
      const secondLog = await attendanceNotificationService.handleAttendanceEventAccepted(payload);

      expect(firstLog.id).toBe(secondLog.id);
      expect(attendanceNotificationService.getDiagnosticLogs().length).toBe(1);
    });

    it('rejected and duplicate check-in punches in attendanceIngestionService do NOT trigger supervisor notifications', async () => {
      const notifySpy = vi.spyOn(attendanceNotificationService, 'handleAttendanceEventAccepted');

      // 1. First valid check-in
      const firstRes = await attendanceIngestionService.ingestAttendanceEvent({
        organizationId: 'org-joy-corp',
        employeeId: 'emp-tester-01',
        source: 'MOBILE',
        punchType: 'CHECK_IN',
        punchTime: '2026-10-21T09:00:00.000+05:30',
      });
      expect(firstRes.accepted).toBe(true);
      expect(notifySpy).toHaveBeenCalledTimes(1);

      // 2. Duplicate second check-in attempt on same session
      const secondRes = await attendanceIngestionService.ingestAttendanceEvent({
        organizationId: 'org-joy-corp',
        employeeId: 'emp-tester-01',
        source: 'BIOMETRIC',
        punchType: 'CHECK_IN',
        punchTime: '2026-10-21T09:05:00.000+05:30',
      });

      // Second check-in must be rejected
      expect(secondRes.accepted).toBe(false);
      expect(secondRes.outcome).toBe('DUPLICATE_CHECK_IN');

      // Supervisor notification must NOT be called for the duplicate rejected check-in
      expect(notifySpy).toHaveBeenCalledTimes(1);
    });
  });
});
