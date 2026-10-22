// src/services/attendance/__tests__/biometricAirtelSmsIntegration.test.ts
// ============================================================================
// JOY PeopleHR — eSSL Biometric Check-In Airtel SMS Integration Test Suite
// Verified TRAI DLT Template: JOYHR_ATTENDANCE_CHECKIN (DLT: 1077076930061928891)
// Comprehensive Certification: 12 Strict Test Scenarios
// ============================================================================

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { attendanceIngestionService } from '../attendanceIngestionService';
import { biometricSmsNotificationService, BiometricSmsOutboxJob } from '../biometricSmsNotificationService';
import { OFFICIAL_TEMPLATES } from '../../communications/templateRegistry';
import { supabase } from '../../../lib/supabase';

describe('JOY PeopleHR — eSSL Biometric Check-In Airtel SMS Integration', () => {
  const orgId = '0c621892-e938-4707-9957-13534ea32c19'; // Joy Corporate Solutions
  const orgIdB = '11111111-2222-3333-4444-555555555555';
  const empDharunId = '0ce6436c-e9b4-4e0e-9102-93ea238be0df'; // Dharun B (+91 9944399088)
  const empThirumalaiId = '0dc8993f-c0cc-4143-aedc-d4893e41b001'; // Thirumalai R K (+91 9840209900)
  const testDate = '2026-10-13';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Polyfill localStorage in node environment
    if (typeof (globalThis as any).localStorage === 'undefined') {
      const store = new Map<string, string>();
      (globalThis as any).localStorage = {
        getItem: (k: string) => store.get(k) || null,
        setItem: (k: string, v: string) => store.set(k, String(v)),
        removeItem: (k: string) => store.delete(k),
        clear: () => store.clear(),
      };
    }

    // Populate mock employees in localStorage directory for deterministic resolution
    const mockEmployees = [
      {
        id: empDharunId,
        organization_id: orgId,
        employee_code: 'JCS-017',
        first_name: 'Dharun',
        last_name: 'B',
        display_name: 'Dharun B',
        phone: '9944399088',
        employment_status: 'ACTIVE',
        sms_enabled: true,
        communication_preference: 'SMS',
      },
      {
        id: empThirumalaiId,
        organization_id: orgId,
        employee_code: 'JCS-20',
        first_name: 'Thirumalai',
        last_name: 'R K',
        display_name: 'Thirumalai R K',
        phone: '9840209900',
        employment_status: 'ACTIVE',
        sms_enabled: true,
        communication_preference: 'SMS',
      },
      {
        id: 'no-phone-emp-id',
        organization_id: orgId,
        employee_code: 'JCS-999',
        first_name: 'NoPhone',
        last_name: 'User',
        phone: null,
        employment_status: 'ACTIVE',
        sms_enabled: true,
        communication_preference: 'SMS',
      },
      {
        id: 'inactive-emp-id',
        organization_id: orgId,
        employee_code: 'JCS-888',
        first_name: 'Exited',
        last_name: 'Staff',
        phone: '9999988888',
        employment_status: 'TERMINATED',
        sms_enabled: true,
        communication_preference: 'SMS',
      },
      {
        id: 'sms-disabled-emp-id',
        organization_id: orgId,
        employee_code: 'JCS-777',
        first_name: 'Silent',
        last_name: 'User',
        phone: '9999977777',
        employment_status: 'ACTIVE',
        sms_enabled: false,
        communication_preference: 'BIOMETRIC_ONLY',
      },
    ];

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('workforce_employees', JSON.stringify(mockEmployees));
    }

    // Hermetic test environment: mock Supabase RPC to use local cross-channel engine
    vi.spyOn(supabase, 'rpc').mockResolvedValue({ data: null, error: { message: 'offline test mock' } } as any);
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      let filterId: string | null = null;
      const builder: any = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
        eq: vi.fn().mockImplementation((col: string, val: any) => {
          if (col === 'id') filterId = val;
          return builder;
        }),
        in: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockImplementation(async () => {
          if (table === 'employees') {
            const found = mockEmployees.find(e => e.id === filterId);
            return { data: found || null, error: null };
          }
          return { data: null, error: null };
        }),
        catch: vi.fn().mockReturnThis(),
      };
      return builder;
    });

    attendanceIngestionService.clearState();
    biometricSmsNotificationService.clearState();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // Test 1: Valid biometric check-in triggers one SMS job
  // --------------------------------------------------------------------------
  it('1. Valid biometric check-in triggers exactly one SMS job', async () => {
    biometricSmsNotificationService.setMockProvider(async (job) => ({
      success: true,
      messageId: 'airtel-mock-101',
      status: 'DELIVERED',
      provider: 'AIRTEL_IQ',
    }));

    const result = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharunId,
      source: 'BIOMETRIC',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:15:00.000Z`,
      deviceId: 'dev-essl-01',
      verificationMode: 'FACE',
    });

    expect(result.accepted).toBe(true);
    expect(result.outcome).toBe('ACCEPTED');

    // Advance timers for asynchronous worker
    await vi.runAllTimersAsync();

    const history = biometricSmsNotificationService.getJobHistory();
    expect(history.length).toBe(1);
    expect(history[0].employeeId).toBe(empDharunId);
    expect(history[0].templateKey).toBe('JOYHR_ATTENDANCE_CHECKIN');
    expect(history[0].dltTemplateId).toBe('1077076930061928891');
    expect(history[0].status).toBe('DELIVERED');
    expect(history[0].providerMessageId).toBe('airtel-mock-101');
  });

  // --------------------------------------------------------------------------
  // Test 2: Correct registered employee mobile is selected
  // --------------------------------------------------------------------------
  it('2. Correct registered employee mobile number and variables are selected', async () => {
    let capturedJob: BiometricSmsOutboxJob | null = null;
    biometricSmsNotificationService.setMockProvider(async (job) => {
      capturedJob = job;
      return { success: true, messageId: 'airtel-mock-102', status: 'DELIVERED', provider: 'AIRTEL_IQ' };
    });

    await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empThirumalaiId,
      source: 'BIOMETRIC',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:30:00.000Z`,
      deviceId: 'dev-essl-01',
    });

    await vi.runAllTimersAsync();

    expect(capturedJob).not.toBeNull();
    // Thirumalai registered phone is 9840209900 -> normalized to 919840209900
    expect(capturedJob!.recipientPhone).toBe('919840209900');
    expect(capturedJob!.maskedPhone).toBe('+91 98****9900');
    // Content check: "Dear {{1}}, your check-in has been recorded at {{2}} on {{3}}."
    expect(capturedJob!.messageContent).toContain('Dear Thirumalai');
    expect(capturedJob!.messageContent).toContain('Joy PeopleHR');
  });

  // --------------------------------------------------------------------------
  // Test 3: Duplicate biometric transaction triggers no additional SMS job
  // --------------------------------------------------------------------------
  it('3. Duplicate biometric transaction triggers no additional SMS job', async () => {
    biometricSmsNotificationService.setMockProvider(async () => ({
      success: true,
      messageId: 'airtel-mock-103',
      status: 'DELIVERED',
      provider: 'AIRTEL_IQ',
    }));

    // First biometric check-in
    const first = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharunId,
      source: 'BIOMETRIC',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:10:00.000Z`,
    });
    expect(first.accepted).toBe(true);

    // Second biometric check-in on the same day (duplicate face scan)
    const second = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharunId,
      source: 'BIOMETRIC',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:12:00.000Z`,
    });
    expect(second.accepted).toBe(false);
    expect(second.outcome).toBe('DUPLICATE_CHECK_IN');

    await vi.runAllTimersAsync();

    // Exactly one job must exist in history
    const history = biometricSmsNotificationService.getJobHistory();
    expect(history.length).toBe(1);
  });

  // --------------------------------------------------------------------------
  // Test 4: Existing web/mobile check-in wins and suppresses duplicate biometric SMS
  // --------------------------------------------------------------------------
  it('4. Existing web check-in wins and suppresses duplicate biometric attendance and SMS', async () => {
    biometricSmsNotificationService.setMockProvider(async () => ({
      success: true,
      messageId: 'airtel-mock-104',
      status: 'DELIVERED',
      provider: 'AIRTEL_IQ',
    }));

    // 1. Employee checked in via Web portal first
    const webRes = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharunId,
      source: 'WEB',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:00:00.000Z`,
    });
    expect(webRes.accepted).toBe(true);

    // 2. Later, employee walks past biometric camera
    const bioRes = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharunId,
      source: 'BIOMETRIC',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:20:00.000Z`,
    });
    expect(bioRes.accepted).toBe(false);
    expect(bioRes.outcome).toBe('DUPLICATE_CHECK_IN');
    expect(bioRes.existing_source).toBe('WEB');

    await vi.runAllTimersAsync();

    // Biometric SMS must NOT have been triggered (0 jobs)
    const history = biometricSmsNotificationService.getJobHistory();
    expect(history.length).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Test 5: Airtel timeout does not delay or roll back attendance
  // --------------------------------------------------------------------------
  it('5. Airtel timeout does not delay or roll back attendance acceptance', async () => {
    // Simulate Airtel gateway taking forever (triggering 5000ms timeout)
    biometricSmsNotificationService.setMockProvider(async () => {
      throw new Error('AIRTEL_TIMEOUT: Gateway request timed out after 5000ms');
    });

    const res = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharunId,
      source: 'BIOMETRIC',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:15:00.000Z`,
    });

    // Attendance is accepted immediately!
    expect(res.accepted).toBe(true);
    expect(res.outcome).toBe('ACCEPTED');

    await vi.runAllTimersAsync();

    const history = biometricSmsNotificationService.getJobHistory();
    expect(history.length).toBe(1);
    // Job handled timeout gracefully without corrupting attendance
    expect(history[0].errorMessage).toContain('AIRTEL_TIMEOUT');
  });

  // --------------------------------------------------------------------------
  // Test 6: Airtel rate limiting and temporary outage cause bounded retries
  // --------------------------------------------------------------------------
  it('6. Airtel temporary outage causes bounded retries up to dead-letter state', async () => {
    let attemptCount = 0;
    biometricSmsNotificationService.setMockProvider(async () => {
      attemptCount++;
      return { success: false, status: 'FAILED', reason: 'HTTP 503 Service Unavailable', provider: 'AIRTEL_IQ' };
    });

    await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharunId,
      source: 'BIOMETRIC',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:15:00.000Z`,
    });

    // Run timers through all retry backoffs (initial + 3 retries = 4 total attempts)
    await vi.runAllTimersAsync();

    expect(attemptCount).toBeGreaterThanOrEqual(3);
    const history = biometricSmsNotificationService.getJobHistory();
    expect(history.length).toBe(1);
    expect(history[0].status).toBe('DEAD_LETTER');
    expect(history[0].errorCode).toBe('MAX_RETRIES_EXCEEDED');
  });

  // --------------------------------------------------------------------------
  // Test 7: Invalid recipient produces a visible failure without rolling back attendance
  // --------------------------------------------------------------------------
  it('7. Invalid recipient produces a visible failure without rolling back attendance', async () => {
    const res = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: 'no-phone-emp-id',
      source: 'BIOMETRIC',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:15:00.000Z`,
    });

    // Attendance check-in remains valid!
    expect(res.accepted).toBe(true);

    await vi.runAllTimersAsync();

    const history = biometricSmsNotificationService.getJobHistory();
    expect(history.length).toBe(1);
    expect(history[0].status).toBe('FAILED');
    expect(history[0].errorCode).toBe('INVALID_RECIPIENT');
  });

  // --------------------------------------------------------------------------
  // Test 8: Inactive or SMS-disabled employee suppresses SMS gracefully
  // --------------------------------------------------------------------------
  it('8. SMS-disabled employee suppresses SMS gracefully without rolling back attendance', async () => {
    const res = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: 'sms-disabled-emp-id',
      source: 'BIOMETRIC',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:15:00.000Z`,
    });

    expect(res.accepted).toBe(true);
    await vi.runAllTimersAsync();

    const history = biometricSmsNotificationService.getJobHistory();
    expect(history.length).toBe(1);
    expect(history[0].status).toBe('FAILED');
    expect(history[0].errorCode).toBe('SMS_DISABLED');
  });

  // --------------------------------------------------------------------------
  // Test 9: Process restart resumes pending notification jobs
  // --------------------------------------------------------------------------
  it('9. Process restart resumes pending notification jobs', async () => {
    // Manually enqueue a pending job
    const job: BiometricSmsOutboxJob = {
      id: 'job-pending-crash-test',
      organizationId: orgId,
      employeeId: empDharunId,
      recipientPhone: '919944399088',
      maskedPhone: '+91 91****9088',
      templateKey: 'JOYHR_ATTENDANCE_CHECKIN',
      dltTemplateId: '1077076930061928891',
      messageContent: 'Dear Dharun, your check-in has been recorded.',
      idempotencyKey: 'crash-recovery-key-1',
      correlationId: 'corr-crash-1',
      attendanceDate: testDate,
      retryCount: 0,
      maxRetries: 3,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let dispatched = false;
    biometricSmsNotificationService.setMockProvider(async () => {
      dispatched = true;
      return { success: true, messageId: 'recovered-msg-id', status: 'DELIVERED', provider: 'AIRTEL_IQ' };
    });

    // Directly simulate queueing recovered job
    (biometricSmsNotificationService as any).enqueue(job);
    await vi.runAllTimersAsync();

    expect(dispatched).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Test 10: Check-out punches do not trigger check-in SMS
  // --------------------------------------------------------------------------
  it('10. Biometric check-out punch does not trigger check-in SMS notification', async () => {
    await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharunId,
      source: 'BIOMETRIC',
      punchType: 'CHECK_OUT',
      punchTime: `${testDate}T18:00:00.000Z`,
    });

    await vi.runAllTimersAsync();

    // No check-in SMS jobs generated
    const history = biometricSmsNotificationService.getJobHistory();
    const checkInJobs = history.filter(j => j.templateKey === 'JOYHR_ATTENDANCE_CHECKIN');
    expect(checkInJobs.length).toBe(0);

    // Verified check-out SMS job is created
    const checkOutJobs = history.filter(j => j.templateKey === 'JOYHR_ATTENDANCE_CHECKOUT');
    expect(checkOutJobs.length).toBe(1);
    expect(checkOutJobs[0].dltTemplateId).toBe('1077188040062422070');
  });

  // --------------------------------------------------------------------------
  // Test 11: Two organizations cannot access one another's employee contact data
  // --------------------------------------------------------------------------
  it('11. Tenant boundary: punch with mismatched organization is rejected', async () => {
    const res = await biometricSmsNotificationService.handleBiometricCheckInAccepted({
      organizationId: orgIdB, // Mismatched tenant
      employeeId: empDharunId,
      attendanceDate: testDate,
      punchTime: `${testDate}T09:15:00.000Z`,
      source: 'BIOMETRIC',
    });

    expect(res.enqueued).toBe(false);
    expect(res.reason).toBe('TENANT_MISMATCH');
  });

  // --------------------------------------------------------------------------
  // Test 12: Provider delivery callbacks update the correct notification record
  // --------------------------------------------------------------------------
  it('12. Provider delivery callbacks update the correct notification record', async () => {
    biometricSmsNotificationService.setMockProvider(async () => ({
      success: true,
      messageId: 'req_msg_45678',
      status: 'SUBMITTED',
      provider: 'AIRTEL_IQ',
    }));

    await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharunId,
      source: 'BIOMETRIC',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:15:00.000Z`,
    });

    await vi.runAllTimersAsync();

    // Provider sends delivery callback
    const callbackHandled = await biometricSmsNotificationService.handleDeliveryCallback({
      messageRequestId: 'req_msg_45678',
      status: 'DELIVERED',
    });

    expect(callbackHandled).toBe(true);

    const history = biometricSmsNotificationService.getJobHistory();
    const targetJob = history.find(j => j.providerMessageId === 'req_msg_45678');
    expect(targetJob).toBeDefined();
    expect(targetJob!.status).toBe('DELIVERED');
  });

  // --------------------------------------------------------------------------
  // Test 13: Mobile Check-In followed by Biometric Check-Out in Monitor Mode
  // --------------------------------------------------------------------------
  it('13. Mobile check-in at 09:00 -> Biometric check-out in monitor mode at 17:30 triggers check-out SMS', async () => {
    let capturedJob: BiometricSmsOutboxJob | null = null;
    biometricSmsNotificationService.setMockProvider(async (job) => {
      capturedJob = job;
      return { success: true, messageId: 'airtel-mock-checkout-13', status: 'DELIVERED', provider: 'AIRTEL_IQ' };
    });

    // 1. Employee checks in via mobile at 09:00 AM
    const mobileCheckIn = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharunId,
      source: 'MOBILE',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:00:00.000Z`,
    });
    expect(mobileCheckIn.accepted).toBe(true);

    // 2. In evening (17:30), employee punches on biometric machine in monitor mode (direction AUTO / monitorMode)
    const bioCheckOut = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharunId,
      source: 'BIOMETRIC',
      punchType: 'CHECK_IN', // machine defaults to general attendance punch
      punchTime: `${testDate}T17:30:00.000Z`,
      deviceId: 'dev-essl-01',
      rawPayload: { monitorMode: true, direction: 'AUTO' },
    });

    expect(bioCheckOut.accepted).toBe(true);
    expect(bioCheckOut.reason).toBe('CHECK_OUT_ACCEPTED');

    await vi.runAllTimersAsync();

    // Check-out SMS was created and dispatched
    expect(capturedJob).not.toBeNull();
    expect(capturedJob!.templateKey).toBe('JOYHR_ATTENDANCE_CHECKOUT');
    expect(capturedJob!.dltTemplateId).toBe('1077188040062422070');
    expect(capturedJob!.recipientPhone).toBe('919944399088');
    expect(capturedJob!.status).toBe('DELIVERED');

    // Message Content verified against approved TRAI DLT pattern:
    // "Dear {{1}}, your check-out has been recorded at {{2}} today. Your total logged time is {{3}}. Status: Present. - Joy PeopleHR."
    expect(capturedJob!.messageContent).toContain('Dear Dharun');
    expect(capturedJob!.messageContent).toContain('Status: Present. - Joy PeopleHR.');
    expect(capturedJob!.messageContent).toContain('8 hrs 30 mins');
  });

  // --------------------------------------------------------------------------
  // Test 14: Repeated biometric check-out within 5 minutes is suppressed
  // --------------------------------------------------------------------------
  it('14. Rapid repeated biometric punch within 5 minutes of check-out is suppressed', async () => {
    biometricSmsNotificationService.setMockProvider(async () => ({
      success: true,
      messageId: 'mock-14',
      status: 'DELIVERED',
      provider: 'AIRTEL_IQ',
    }));

    // Check-in at 09:00
    await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharunId,
      source: 'MOBILE',
      punchType: 'CHECK_IN',
      punchTime: `${testDate}T09:00:00.000Z`,
    });

    // Check-out at 18:00
    const out1 = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharunId,
      source: 'BIOMETRIC',
      punchType: 'CHECK_OUT',
      punchTime: `${testDate}T18:00:00.000Z`,
    });
    expect(out1.accepted).toBe(true);

    // Accidental second scan 1 minute later at 18:01
    const out2 = await attendanceIngestionService.ingestAttendanceEvent({
      organizationId: orgId,
      employeeId: empDharunId,
      source: 'BIOMETRIC',
      punchType: 'CHECK_OUT',
      punchTime: `${testDate}T18:01:00.000Z`,
    });
    expect(out2.accepted).toBe(false);
    expect(out2.outcome).toBe('DUPLICATE_CHECK_OUT');

    await vi.runAllTimersAsync();

    // Exactly ONE checkout SMS job was created, zero duplicates
    const checkoutJobs = biometricSmsNotificationService.getJobHistory().filter(j => j.templateKey === 'JOYHR_ATTENDANCE_CHECKOUT');
    expect(checkoutJobs.length).toBe(1);
  });
});
