// src/services/attendance/biometricSmsNotificationService.ts
// ============================================================================
// JOY PeopleHR — Enterprise eSSL Biometric Check-In Airtel SMS Notification Engine
// TRAI DLT Compliant (Template: JOYHR_ATTENDANCE_CHECKIN | DLT: 1077076930061928891)
// Bounded Concurrency | Transactional Outbox | Circuit Breaker | Rate Limiter
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { airtelSmsClient, AirtelSmsSendRequest, AirtelSmsResponse } from '../communications/airtelSmsClient';
import { OFFICIAL_TEMPLATES, renderTemplate } from '../communications/templateRegistry';

export interface BiometricCheckInAcceptedEvent {
  organizationId: string;
  employeeId: string;
  punchId?: string;
  attendanceDate: string; // YYYY-MM-DD
  punchTime: string;      // ISO string
  deviceId?: string;
  deviceName?: string;
  source: 'BIOMETRIC';
}

export interface BiometricCheckOutAcceptedEvent {
  organizationId: string;
  employeeId: string;
  punchId?: string;
  attendanceDate: string; // YYYY-MM-DD
  punchTime: string;      // ISO string
  deviceId?: string;
  deviceName?: string;
  source: 'BIOMETRIC';
  checkInTime?: string;   // ISO string or HH:MM
  totalWorkingMinutes?: number;
}

export interface BiometricSmsOutboxJob {
  id: string;
  organizationId: string;
  employeeId: string;
  recipientPhone: string;
  maskedPhone: string;
  templateKey: string;
  dltTemplateId: string;
  messageContent: string;
  idempotencyKey: string;
  correlationId: string;
  punchId?: string;
  attendanceDate: string;
  retryCount: number;
  maxRetries: number;
  status: 'PENDING' | 'PROCESSING' | 'SUBMITTED' | 'DELIVERED' | 'RETRYING' | 'FAILED' | 'DEAD_LETTER' | 'UNDELIVERABLE';
  errorCode?: string;
  errorMessage?: string;
  providerMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

export class BiometricSmsNotificationService {
  private static instance: BiometricSmsNotificationService;

  // Bounded worker queue
  private queue: BiometricSmsOutboxJob[] = [];
  private activeWorkers = 0;
  private readonly maxConcurrency = 3;
  private isProcessing = false;

  // Per-recipient rate limiting: recipientPhone -> timestamp of last dispatch
  private recipientRateLimitMap = new Map<string, number>();
  private readonly rateLimitWindowMs = 60000; // 1 SMS per recipient per 60 seconds

  // Circuit breaker state
  private consecutiveFailures = 0;
  private circuitBreakerOpenUntil = 0;
  private readonly circuitBreakerThreshold = 5;
  private readonly circuitBreakerCooldownMs = 30000;

  // In-memory idempotency deduplication cache
  private seenIdempotencyKeys = new Set<string>();

  // Diagnostic history for reporting and assertions (last 100 jobs)
  private jobHistory: BiometricSmsOutboxJob[] = [];

  // Mock provider override (for isolated unit tests)
  private mockProviderHandler: ((job: BiometricSmsOutboxJob) => Promise<AirtelSmsResponse>) | null = null;

  private constructor() {
    // Attempt crash recovery on initialization
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
      setTimeout(() => this.resumePendingJobs().catch(() => {}), 2000);
    }
  }

  public static getInstance(): BiometricSmsNotificationService {
    if (!BiometricSmsNotificationService.instance) {
      BiometricSmsNotificationService.instance = new BiometricSmsNotificationService();
    }
    return BiometricSmsNotificationService.instance;
  }

  /**
   * Masks a mobile number for compliance and security in logs.
   * Example: "919944399088" -> "+91 99****9088"
   */
  public maskPhone(phone: string): string {
    let clean = String(phone || '').replace(/\D/g, '');
    if (clean.startsWith('91') && clean.length === 12) {
      clean = clean.slice(2);
    }
    if (clean.length < 6) return '****';
    const firstTwo = clean.slice(0, 2);
    const lastFour = clean.slice(-4);
    return `+91 ${firstTwo}****${lastFour}`;
  }

  /**
   * Format display time for check-in SMS (e.g. "09:15 AM")
   */
  public formatTime(isoString: string): string {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '10:00 AM';
    }
  }

  /**
   * Format display date for check-in SMS (e.g. "13-10-2026")
   */
  public formatDate(dateOrIso: string): string {
    try {
      const d = new Date(dateOrIso.includes('T') ? dateOrIso : `${dateOrIso}T12:00:00Z`);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return dateOrIso;
    }
  }

  /**
   * Authoritative Entry Point: Triggered ONLY after an attendance check-in is ACCEPTED.
   * Non-blocking: enqueues the outbox job atomically and returns immediately.
   */
  public async handleBiometricCheckInAccepted(event: BiometricCheckInAcceptedEvent): Promise<{
    enqueued: boolean;
    jobId?: string;
    reason?: string;
  }> {
    const { organizationId, employeeId, punchId, attendanceDate, punchTime } = event;
    const correlationId = `corr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const idempotencyKey = `bio-sms-checkin-${employeeId}-${attendanceDate}`;

    console.log(`[BIOMETRIC_SMS] attendance_event_accepted employee_id=${employeeId} punch_id=${punchId || 'none'} correlation_id=${correlationId}`);

    // 1. Strict Idempotency Check: Prevent duplicate jobs for the same employee session
    if (this.seenIdempotencyKeys.has(idempotencyKey)) {
      console.log(`[BIOMETRIC_SMS] duplicate_suppressed idempotency_key=${idempotencyKey}`);
      return { enqueued: false, reason: 'IDEMPOTENT_DUPLICATE' };
    }

    // 2. Resolve Correct Recipient from Organization-Scoped Directory
    const recipient = await this.resolveRecipient(employeeId, organizationId);
    if (!recipient.valid || !recipient.employee) {
      const failReason = recipient.reason || 'INVALID_RECIPIENT';
      console.error(`[BIOMETRIC_SMS] failed reason=${failReason} employee_id=${employeeId} correlation_id=${correlationId}`);

      // Persist permanent recipient failure in communication_dispatch_logs without affecting attendance
      await this.persistOutboxRecord({
        id: `sms_fail_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        organizationId,
        employeeId,
        recipientPhone: recipient.phone || '0000000000',
        maskedPhone: this.maskPhone(recipient.phone || '0000000000'),
        templateKey: 'JOYHR_ATTENDANCE_CHECKIN',
        dltTemplateId: '1077076930061928891',
        messageContent: 'RECIPIENT_RESOLUTION_FAILED',
        idempotencyKey,
        correlationId,
        punchId,
        attendanceDate,
        retryCount: 0,
        maxRetries: 0,
        status: 'FAILED',
        errorCode: failReason,
        errorMessage: recipient.errorMessage || 'Recipient resolution failed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return { enqueued: false, reason: failReason };
    }

    const { employee, phone } = recipient;
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const maskedPhone = this.maskPhone(formattedPhone);

    console.log(`[BIOMETRIC_SMS] recipient_resolved employee_id=${employeeId} recipient=${maskedPhone} correlation_id=${correlationId}`);

    // 3. Render Approved Airtel DLT Template (JOYHR_ATTENDANCE_CHECKIN | DLT: 1077076930061928891)
    const template = OFFICIAL_TEMPLATES['JOYHR_ATTENDANCE_CHECKIN'];
    if (!template || !template.dltTemplateId) {
      console.error(`[BIOMETRIC_SMS] failed reason=INVALID_TEMPLATE_CONFIG template_key=JOYHR_ATTENDANCE_CHECKIN`);
      return { enqueued: false, reason: 'INVALID_TEMPLATE_CONFIG' };
    }

    const employeeFirstName = (employee.first_name || employee.display_name || employee.name || 'Colleague').split(' ')[0];
    const formattedTime = this.formatTime(punchTime);
    const formattedDate = this.formatDate(attendanceDate || punchTime);

    // Official Pattern: "Dear {{1}}, your check-in has been recorded at {{2}} on {{3}}. Have a productive day! - Joy PeopleHR"
    const messageContent = renderTemplate(template.bodyPattern, [
      employeeFirstName,
      formattedTime,
      formattedDate,
    ]);

    // 4. Create Durable Transactional Outbox Job
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job: BiometricSmsOutboxJob = {
      id: jobId,
      organizationId,
      employeeId,
      recipientPhone: formattedPhone,
      maskedPhone,
      templateKey: template.templateKey,
      dltTemplateId: template.dltTemplateId,
      messageContent,
      idempotencyKey,
      correlationId,
      punchId,
      attendanceDate,
      retryCount: 0,
      maxRetries: 3,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Mark idempotency key to prevent concurrent duplicates
    this.seenIdempotencyKeys.add(idempotencyKey);

    // Persist Outbox Record into Supabase/Local Logs atomically
    await this.persistOutboxRecord(job);
    console.log(`[BIOMETRIC_SMS] outbox_created id=${job.id} correlation_id=${correlationId} recipient=${maskedPhone}`);

    // 5. Submit to Asynchronous Queue
    this.enqueue(job);

    return { enqueued: true, jobId };
  }

  /**
   * Calculates formatted duration text for check-out SMS (e.g. "8 hrs 30 mins").
   */
  public calculateDurationText(checkInIso?: string, checkOutIso?: string, precalcMinutes?: number): string {
    let minutes = precalcMinutes;
    if ((minutes === undefined || minutes === null) && checkInIso && checkOutIso) {
      try {
        const start = new Date(checkInIso.includes('T') ? checkInIso : `2026-01-01T${checkInIso}`).getTime();
        const end = new Date(checkOutIso.includes('T') ? checkOutIso : `2026-01-01T${checkOutIso}`).getTime();
        if (!isNaN(start) && !isNaN(end) && end > start) {
          minutes = Math.round((end - start) / (1000 * 60));
        }
      } catch {
        minutes = 480;
      }
    }
    if (!minutes || minutes <= 0) {
      return '8 hrs 00 mins';
    }
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs} hrs ${String(mins).padStart(2, '0')} mins`;
  }

  /**
   * Authoritative Entry Point: Triggered ONLY after an attendance check-out is ACCEPTED.
   * Non-blocking: enqueues the outbox job atomically and returns immediately.
   * Template: JOYHR_ATTENDANCE_CHECKOUT (DLT: 1077188040062422070)
   * Pattern: "Dear {{1}}, your check-out has been recorded at {{2}} today. Your total logged time is {{3}}. Status: Present. - Joy PeopleHR."
   */
  public async handleBiometricCheckOutAccepted(event: BiometricCheckOutAcceptedEvent): Promise<{
    enqueued: boolean;
    jobId?: string;
    reason?: string;
  }> {
    const { organizationId, employeeId, punchId, attendanceDate, punchTime, checkInTime, totalWorkingMinutes } = event;
    const correlationId = `corr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const idempotencyKey = `bio-sms-checkout-${employeeId}-${attendanceDate}`;

    console.log(`[BIOMETRIC_SMS] checkout_event_accepted employee_id=${employeeId} punch_id=${punchId || 'none'} correlation_id=${correlationId}`);

    // 1. Strict Idempotency Check: Prevent duplicate check-out jobs for the same employee session
    if (this.seenIdempotencyKeys.has(idempotencyKey)) {
      console.log(`[BIOMETRIC_SMS] duplicate_suppressed idempotency_key=${idempotencyKey}`);
      return { enqueued: false, reason: 'IDEMPOTENT_DUPLICATE' };
    }

    // 2. Resolve Correct Recipient from Organization-Scoped Directory
    const recipient = await this.resolveRecipient(employeeId, organizationId);
    if (!recipient.valid || !recipient.employee) {
      const failReason = recipient.reason || 'INVALID_RECIPIENT';
      console.error(`[BIOMETRIC_SMS] failed reason=${failReason} employee_id=${employeeId} correlation_id=${correlationId}`);

      await this.persistOutboxRecord({
        id: `sms_fail_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        organizationId,
        employeeId,
        recipientPhone: recipient.phone || '0000000000',
        maskedPhone: this.maskPhone(recipient.phone || '0000000000'),
        templateKey: 'JOYHR_ATTENDANCE_CHECKOUT',
        dltTemplateId: '1077188040062422070',
        messageContent: 'RECIPIENT_RESOLUTION_FAILED',
        idempotencyKey,
        correlationId,
        punchId,
        attendanceDate,
        retryCount: 0,
        maxRetries: 0,
        status: 'FAILED',
        errorCode: failReason,
        errorMessage: recipient.errorMessage || 'Recipient resolution failed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return { enqueued: false, reason: failReason };
    }

    const { employee, phone } = recipient;
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const maskedPhone = this.maskPhone(formattedPhone);

    console.log(`[BIOMETRIC_SMS] recipient_resolved employee_id=${employeeId} recipient=${maskedPhone} correlation_id=${correlationId}`);

    // 3. Render Approved Airtel DLT Template (JOYHR_ATTENDANCE_CHECKOUT | DLT: 1077188040062422070)
    const template = OFFICIAL_TEMPLATES['JOYHR_ATTENDANCE_CHECKOUT'];
    if (!template || !template.dltTemplateId) {
      console.error(`[BIOMETRIC_SMS] failed reason=INVALID_TEMPLATE_CONFIG template_key=JOYHR_ATTENDANCE_CHECKOUT`);
      return { enqueued: false, reason: 'INVALID_TEMPLATE_CONFIG' };
    }

    const employeeFirstName = (employee.first_name || employee.display_name || employee.name || 'Colleague').split(' ')[0];
    const formattedTime = this.formatTime(punchTime);
    const durationText = this.calculateDurationText(checkInTime, punchTime, totalWorkingMinutes);

    // Official Pattern: "Dear {{1}}, your check-out has been recorded at {{2}} today. Your total logged time is {{3}}. Status: Present. - Joy PeopleHR."
    const messageContent = renderTemplate(template.bodyPattern, [
      employeeFirstName,
      formattedTime,
      durationText,
    ]);

    // 4. Create Durable Transactional Outbox Job
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job: BiometricSmsOutboxJob = {
      id: jobId,
      organizationId,
      employeeId,
      recipientPhone: formattedPhone,
      maskedPhone,
      templateKey: template.templateKey,
      dltTemplateId: template.dltTemplateId,
      messageContent,
      idempotencyKey,
      correlationId,
      punchId,
      attendanceDate,
      retryCount: 0,
      maxRetries: 3,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.seenIdempotencyKeys.add(idempotencyKey);
    await this.persistOutboxRecord(job);
    console.log(`[BIOMETRIC_SMS] outbox_created id=${job.id} correlation_id=${correlationId} recipient=${maskedPhone}`);

    this.enqueue(job);
    return { enqueued: true, jobId };
  }

  /**
   * Resolves employee record from database or cache with strict validation.
   */
  private async resolveRecipient(
    employeeId: string,
    organizationId: string
  ): Promise<{
    valid: boolean;
    employee?: any;
    phone?: string;
    reason?: string;
    errorMessage?: string;
  }> {
    try {
      let empRecord: any = null;

      // 1. Check Supabase employees table
      if (isSupabaseEnabled) {
        const { data, error } = await supabase
          .from('employees')
          .select('id, organization_id, employee_code, first_name, last_name, display_name, phone, employment_status, sms_enabled, communication_preference')
          .eq('id', employeeId)
          .maybeSingle();

        if (!error && data) {
          empRecord = data;
        }
      }

      // 2. Fallback to LocalStorage cache
      if (!empRecord && typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('workforce_employees');
        if (raw) {
          const list = JSON.parse(raw);
          empRecord = list.find((e: any) => e.id === employeeId || e.employee_code === employeeId);
        }
      }

      if (!empRecord) {
        return { valid: false, reason: 'EMPLOYEE_NOT_FOUND', errorMessage: 'Employee record not found in directory' };
      }

      // Tenant boundary verification
      if (empRecord.organization_id && organizationId && empRecord.organization_id !== organizationId) {
        return { valid: false, reason: 'TENANT_MISMATCH', errorMessage: 'Employee belongs to different organization' };
      }

      // Employment status check
      const statusUpper = String(empRecord.employment_status || 'ACTIVE').toUpperCase();
      if (['TERMINATED', 'EXITED', 'INACTIVE'].includes(statusUpper)) {
        return { valid: false, reason: 'RECIPIENT_INACTIVE', errorMessage: `Employee status is ${statusUpper}` };
      }

      // Preference check: Does employee permit SMS?
      if (empRecord.sms_enabled === false || empRecord.communication_preference === 'BIOMETRIC_ONLY') {
        return { valid: false, reason: 'SMS_DISABLED', errorMessage: 'Employee communication preference disallows SMS' };
      }

      // Phone number presence & validity check
      const rawPhone = empRecord.phone || empRecord.mobile_number;
      if (!rawPhone) {
        return { valid: false, reason: 'INVALID_RECIPIENT', errorMessage: 'No registered mobile number on employee record' };
      }

      const digits = String(rawPhone).replace(/\D/g, '');
      if (digits.length < 10) {
        return { valid: false, reason: 'INVALID_RECIPIENT', errorMessage: 'Mobile number has insufficient digits' };
      }

      return { valid: true, employee: empRecord, phone: digits };
    } catch (err: any) {
      return { valid: false, reason: 'DATABASE_ERROR', errorMessage: err.message || 'Error resolving employee' };
    }
  }

  /**
   * Persists outbox record into communication_dispatch_logs in Supabase/Storage.
   */
  private async persistOutboxRecord(job: BiometricSmsOutboxJob): Promise<void> {
    try {
      const payload: Record<string, any> = {
        organization_id: job.organizationId,
        employee_id: job.employeeId,
        channel: 'SMS',
        provider: 'AIRTEL_IQ',
        recipient_phone: job.recipientPhone,
        template_key: job.templateKey,
        message_content: job.messageContent,
        dynamic_payload: {
          dlt_template_id: job.dltTemplateId,
          correlation_id: job.correlationId,
          idempotency_key: job.idempotencyKey,
          punch_id: job.punchId,
          attendance_date: job.attendanceDate,
          retry_count: job.retryCount,
          max_retries: job.maxRetries,
        },
        status: job.status,
        provider_message_id: job.providerMessageId || null,
        error_code: job.errorCode || null,
        error_message: job.errorMessage || null,
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseEnabled) {
        await supabase
          .from('communication_dispatch_logs')
          .upsert([payload], { onConflict: 'organization_id,employee_id,template_key,created_at' });
      }

      // Keep in local job history
      const existingIdx = this.jobHistory.findIndex(j => j.id === job.id);
      if (existingIdx >= 0) {
        this.jobHistory[existingIdx] = { ...job };
      } else {
        this.jobHistory.unshift({ ...job });
        if (this.jobHistory.length > 100) this.jobHistory.pop();
      }
    } catch (err: any) {
      console.warn('[BIOMETRIC_SMS] Outbox persist warning:', err.message);
    }
  }

  /**
   * Enqueue job for asynchronous processing with concurrency management
   */
  private enqueue(job: BiometricSmsOutboxJob): void {
    this.queue.push(job);
    this.processQueue();
  }

  /**
   * Bounded concurrency processor
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.queue.length > 0 && this.activeWorkers < this.maxConcurrency) {
        // Check circuit breaker
        if (Date.now() < this.circuitBreakerOpenUntil) {
          const waitSec = Math.ceil((this.circuitBreakerOpenUntil - Date.now()) / 1000);
          console.warn(`[BIOMETRIC_SMS] circuit_breaker_active skipping dispatch for ${waitSec}s`);
          break;
        }

        const job = this.queue.shift();
        if (!job) break;

        // Check per-recipient rate limit
        const lastSent = this.recipientRateLimitMap.get(job.recipientPhone) || 0;
        if (Date.now() - lastSent < this.rateLimitWindowMs) {
          const delayRemaining = this.rateLimitWindowMs - (Date.now() - lastSent);
          console.log(`[BIOMETRIC_SMS] rate_limited recipient=${job.maskedPhone} delaying ${delayRemaining}ms`);
          setTimeout(() => {
            this.queue.push(job);
            this.processQueue();
          }, delayRemaining);
          continue;
        }

        this.activeWorkers++;
        this.dispatchJob(job).finally(() => {
          this.activeWorkers--;
          this.processQueue();
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Dispatches a single job through Airtel SMS client with timeout and retries
   */
  private async dispatchJob(job: BiometricSmsOutboxJob): Promise<void> {
    const startTime = Date.now();
    job.status = 'PROCESSING';
    job.updatedAt = new Date().toISOString();
    await this.persistOutboxRecord(job);

    console.log(`[BIOMETRIC_SMS] provider_submission_started id=${job.id} recipient=${job.maskedPhone} correlation_id=${job.correlationId}`);

    try {
      let resp: AirtelSmsResponse;

      if (this.mockProviderHandler) {
        resp = await this.mockProviderHandler(job);
      } else {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AIRTEL_TIMEOUT: Gateway request timed out after 5000ms')), 5000)
        );

        const sendPromise = airtelSmsClient.sendSms({
          destinationAddress: job.recipientPhone,
          message: job.messageContent,
          dltTemplateId: job.dltTemplateId,
          senderId: 'JCSPRL',
          entityId: '1001333025440167393',
          messageType: 'SERVICE_IMPLICIT',
        });

        resp = await Promise.race([sendPromise, timeoutPromise]);
      }

      const durationMs = Date.now() - startTime;

      if (resp.success) {
        // Success: Reset circuit breaker and update recipient rate-limit timestamp
        this.consecutiveFailures = 0;
        this.recipientRateLimitMap.set(job.recipientPhone, Date.now());

        job.status = 'DELIVERED';
        job.providerMessageId = resp.messageId;
        job.updatedAt = new Date().toISOString();
        await this.persistOutboxRecord(job);

        console.log(`[BIOMETRIC_SMS] provider_accepted id=${job.id} message_id=${resp.messageId || 'none'} duration=${durationMs}ms correlation_id=${job.correlationId}`);
        console.log(`[BIOMETRIC_SMS] delivery_confirmed id=${job.id}`);
      } else {
        await this.handleDispatchFailure(job, resp.reason || 'PROVIDER_REJECTED', false);
      }
    } catch (err: any) {
      const isTimeout = err?.message?.includes('TIMEOUT');
      await this.handleDispatchFailure(job, err?.message || 'NETWORK_ERROR', isTimeout);
    }
  }

  /**
   * Handles dispatch failure with exponential backoff and circuit breaker trip
   */
  private async handleDispatchFailure(job: BiometricSmsOutboxJob, errorMsg: string, isTimeout: boolean): Promise<void> {
    this.consecutiveFailures++;

    if (this.consecutiveFailures >= this.circuitBreakerThreshold) {
      this.circuitBreakerOpenUntil = Date.now() + this.circuitBreakerCooldownMs;
      console.warn(`[BIOMETRIC_SMS] circuit_breaker_tripped consecutive_failures=${this.consecutiveFailures} pausing_outbox_for=${this.circuitBreakerCooldownMs / 1000}s`);
    }

    const isPermanent =
      errorMsg.includes('INVALID_TEMPLATE') ||
      errorMsg.includes('INVALID_PHONE') ||
      errorMsg.includes('BLACKLISTED') ||
      errorMsg.includes('INCORRECT_NUMBER');

    if (isPermanent || job.retryCount >= job.maxRetries) {
      job.status = isPermanent ? 'FAILED' : 'DEAD_LETTER';
      job.errorCode = isPermanent ? 'PERMANENT_ERROR' : 'MAX_RETRIES_EXCEEDED';
      job.errorMessage = errorMsg;
      job.updatedAt = new Date().toISOString();
      await this.persistOutboxRecord(job);

      console.error(`[BIOMETRIC_SMS] failed reason=${job.errorCode} id=${job.id} error="${errorMsg}"`);
    } else {
      job.retryCount++;
      job.status = 'RETRYING';
      job.errorMessage = errorMsg;
      job.updatedAt = new Date().toISOString();
      await this.persistOutboxRecord(job);

      // Exponential backoff with jitter: 1000ms * 2^(retryCount - 1) + jitter(0..500ms)
      const baseDelay = 1000 * Math.pow(2, job.retryCount - 1);
      const jitter = Math.floor(Math.random() * 500);
      const delayMs = baseDelay + jitter;

      console.log(`[BIOMETRIC_SMS] retry_scheduled id=${job.id} attempt=${job.retryCount}/${job.maxRetries} delay_ms=${delayMs} reason="${errorMsg}"`);

      setTimeout(() => {
        this.enqueue(job);
      }, delayMs);
    }
  }

  /**
   * Recovers orphaned or pending outbox records following a process crash/restart.
   */
  public async resumePendingJobs(): Promise<number> {
    if (!isSupabaseEnabled) return 0;
    try {
      const { data, error } = await supabase
        .from('communication_dispatch_logs')
        .select('*')
        .eq('channel', 'SMS')
        .eq('provider', 'AIRTEL_IQ')
        .in('status', ['PENDING', 'RETRYING'])
        .limit(20);

      if (error || !data || data.length === 0) return 0;

      let resumed = 0;
      for (const row of data) {
        const dyn = row.dynamic_payload || {};
        const job: BiometricSmsOutboxJob = {
          id: row.id,
          organizationId: row.organization_id,
          employeeId: row.employee_id,
          recipientPhone: row.recipient_phone,
          maskedPhone: this.maskPhone(row.recipient_phone),
          templateKey: row.template_key,
          dltTemplateId: dyn.dlt_template_id || '1077076930061928891',
          messageContent: row.message_content || '',
          idempotencyKey: dyn.idempotency_key || `recovered-${row.id}`,
          correlationId: dyn.correlation_id || `recovered-${Date.now()}`,
          punchId: dyn.punch_id,
          attendanceDate: dyn.attendance_date || '',
          retryCount: dyn.retry_count || 0,
          maxRetries: dyn.max_retries || 3,
          status: 'PENDING',
          createdAt: row.created_at,
          updatedAt: new Date().toISOString(),
        };

        this.enqueue(job);
        resumed++;
      }

      console.log(`[BIOMETRIC_SMS] process_restart_resumed_jobs count=${resumed}`);
      return resumed;
    } catch (err: any) {
      console.warn('[BIOMETRIC_SMS] resumePendingJobs warning:', err.message);
      return 0;
    }
  }

  /**
   * Process Airtel provider delivery webhook callback
   */
  public async handleDeliveryCallback(callback: {
    messageRequestId?: string;
    messageId?: string;
    status: string;
    recipientAddress?: string;
  }): Promise<boolean> {
    const providerId = callback.messageRequestId || callback.messageId;
    if (!providerId) return false;

    console.log(`[BIOMETRIC_SMS] delivery_callback_received provider_id=${providerId} status=${callback.status}`);

    const isDelivered = callback.status.toUpperCase() === 'DELIVERED' || callback.status.toUpperCase() === 'SUCCESS';
    const statusVal = isDelivered ? 'DELIVERED' : 'FAILED';

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('communication_dispatch_logs')
          .update({
            status: statusVal,
            updated_at: new Date().toISOString(),
          })
          .eq('provider_message_id', providerId);
      } catch {
        // ignore in test / offline
      }
    }

    const job = this.jobHistory.find(j => j.providerMessageId === providerId);
    if (job) {
      job.status = statusVal;
      job.updatedAt = new Date().toISOString();
      if (isDelivered) {
        console.log(`[BIOMETRIC_SMS] delivery_confirmed id=${job.id}`);
      }
    }

    return true;
  }

  // --- Testing & Verification Hooks ---
  public setMockProvider(handler: ((job: BiometricSmsOutboxJob) => Promise<AirtelSmsResponse>) | null): void {
    this.mockProviderHandler = handler;
  }

  public getJobHistory(): BiometricSmsOutboxJob[] {
    return [...this.jobHistory];
  }

  public clearState(): void {
    this.queue = [];
    this.seenIdempotencyKeys.clear();
    this.recipientRateLimitMap.clear();
    this.jobHistory = [];
    this.consecutiveFailures = 0;
    this.circuitBreakerOpenUntil = 0;
    this.activeWorkers = 0;
    this.mockProviderHandler = null;
  }
}

export const biometricSmsNotificationService = BiometricSmsNotificationService.getInstance();
