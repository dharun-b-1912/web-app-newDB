// src/services/attendance/biometricEventPipelineService.ts
// ============================================================================
// JCS WorkforceOS — Multi-Biometric Device Ingestion Pipeline & Session Ledger
// Strict Separation: Biometric Devices produce Evidence -> Engine produces Meaning
// ============================================================================

import { hrEventBus } from '../hrEventBus';
import { getActiveOrgId } from './biometricCommandService';
import { api } from '../api';
import { Employee } from '../../types';

export type DeviceDirectionMode = 'CHECK_IN' | 'CHECK_OUT' | 'BOTH' | 'DISABLED';

export type PunchEventType = 'CHECK_IN' | 'CHECK_OUT' | 'UNKNOWN' | 'DEVICE_EVENT' | 'ERROR';

export type PunchProcessingStatus =
  | 'RECEIVED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'DUPLICATE'
  | 'MISMATCH'
  | 'FAILED'
  | 'RETRY_PENDING'
  | 'REQUIRES_REVIEW';

export interface RawBiometricPunchEvent {
  event_id: string;
  tenant_id: string;
  organisation_id: string;
  device_id: string;
  device_name: string;
  device_serial?: string;
  device_ip?: string;
  device_location?: string;
  device_branch?: string;
  device_direction_mode: DeviceDirectionMode;
  employee_id?: string;
  employee_name?: string;
  employee_code?: string;
  biometric_user_id: string;
  event_type: PunchEventType;
  device_timestamp: string;
  server_received_at: string;
  device_sequence?: number;
  source: 'BIOMETRIC_TCP' | 'BIOMETRIC_GATEWAY' | 'MANUAL_AUDIT' | 'MOBILE_GPS' | 'WEB_KIOSK' | 'DIAGNOSTIC_TEST';
  raw_payload?: Record<string, any>;
  event_hash: string;
  processing_status: PunchProcessingStatus;
  status_reason?: string;
  session_id?: string;
  work_date: string; // YYYY-MM-DD
  is_diagnostic_test?: boolean;
}

export interface AttendanceSession {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department?: string;
  work_date: string; // Shift work date (e.g. 2026-08-24)
  shift_id?: string;
  shift_name?: string;
  check_in_event_id: string;
  check_in_time: string;
  check_in_device_id: string;
  check_in_device_name: string;
  check_in_device_location: string;
  check_out_event_id?: string | null;
  check_out_time?: string | null;
  check_out_device_id?: string | null;
  check_out_device_name?: string | null;
  check_out_device_location?: string | null;
  duration_minutes: number;
  is_overnight: boolean;
  is_open: boolean; // True if checked in but awaiting check out
  status: 'OPEN' | 'COMPLETED' | 'EXCEPTION_MISSING_OUT' | 'ADJUSTED_MANUAL';
  created_at: string;
  updated_at: string;
}

export interface DailyAttendanceRecord {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department?: string;
  work_date: string; // YYYY-MM-DD
  shift_id?: string;
  shift_name?: string;
  first_check_in_time?: string;
  first_check_in_device?: string;
  last_check_out_time?: string;
  last_check_out_device?: string;
  total_work_minutes: number;
  total_break_minutes: number;
  session_count: number;
  sessions: AttendanceSession[];
  status: 'PRESENT' | 'HALF_DAY' | 'LATE_ENTRY' | 'EARLY_EXIT' | 'MISSING_PUNCH' | 'ABSENT' | 'OVERTIME';
  has_exceptions: boolean;
  exception_ids: string[];
  is_payroll_locked: boolean;
  last_recalculated_at: string;
}

export interface AttendanceLedgerAdjustment {
  id: string;
  tenant_id: string;
  session_id?: string;
  daily_record_id?: string;
  employee_id: string;
  work_date: string;
  adjustment_type: 'MANUAL_CHECK_OUT' | 'MANUAL_CHECK_IN' | 'APPROVE_INCOMPLETE' | 'OVERRIDE_DURATION' | 'EXCUSE_EXCEPTION';
  original_state: Record<string, any>;
  adjusted_state: Record<string, any>;
  reason: string;
  adjusted_by_id: string;
  adjusted_by_name: string;
  adjusted_at: string;
}

export interface PipelineIngestionConfig {
  duplicate_window_seconds: number; // default 60s
  cross_location_allowed: boolean;
  auto_create_overnight_sessions: boolean;
  max_session_hours: number; // default 16h
}

const STORAGE_KEYS_PIPELINE = {
  RAW_EVENTS: 'workforce_bio_raw_events_v3',
  SESSIONS: 'workforce_bio_sessions_v3',
  DAILY_RECORDS: 'workforce_bio_daily_attendance_v3',
  ADJUSTMENTS: 'workforce_bio_adjustments_v3',
  CONFIG: 'workforce_bio_pipeline_config_v3',
};

function getScopedKey(baseKey: string, orgId?: string): string {
  const activeOrg = orgId || getActiveOrgId();
  return `${baseKey}_${activeOrg}`;
}

function getStore<T>(baseKey: string, fallback: T, orgId?: string): T {
  try {
    const raw = localStorage.getItem(getScopedKey(baseKey, orgId));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStore<T>(baseKey: string, val: T, orgId?: string): void {
  try {
    localStorage.setItem(getScopedKey(baseKey, orgId), JSON.stringify(val));
  } catch (err) {
    console.error(`[PipelineStore] Error saving ${baseKey}:`, err);
  }
}

// In-memory queue mutex to serialize punch execution per employee + work_date
const employeeLockQueues = new Map<string, Promise<any>>();

class BiometricEventPipelineService {
  /**
   * Deterministic Idempotency Hash Generator
   */
  generateEventHash(
    tenantId: string,
    deviceId: string,
    biometricUserId: string,
    timestampIso: string,
    direction: string
  ): string {
    const cleanTime = new Date(timestampIso).toISOString().slice(0, 19); // 1-second resolution
    const str = `${tenantId}::${deviceId}::${biometricUserId.trim()}::${cleanTime}::${direction}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `hash-${Math.abs(hash).toString(16)}-${cleanTime.replace(/\D/g, '').slice(-8)}`;
  }

  /**
   * Get Pipeline Configuration
   */
  getConfig(): PipelineIngestionConfig {
    return getStore<PipelineIngestionConfig>(STORAGE_KEYS_PIPELINE.CONFIG, {
      duplicate_window_seconds: 60,
      cross_location_allowed: true,
      auto_create_overnight_sessions: true,
      max_session_hours: 16,
    });
  }

  /**
   * Update Pipeline Configuration
   */
  updateConfig(config: Partial<PipelineIngestionConfig>): void {
    const current = this.getConfig();
    const updated = { ...current, ...config };
    setStore(STORAGE_KEYS_PIPELINE.CONFIG, updated);
  }

  /**
   * Resolve Shift Work Date (Handles overnight shifts spanning across midnight)
   */
  resolveWorkDate(timestampIso: string, openSession?: AttendanceSession | null): string {
    const punchDate = new Date(timestampIso);
    if (openSession && openSession.is_open) {
      // If there is an active open session started within the last max_session_hours, pair it to the session work_date
      const sessionStart = new Date(openSession.check_in_time);
      const diffHours = (punchDate.getTime() - sessionStart.getTime()) / (1000 * 60 * 60);
      const config = this.getConfig();
      if (diffHours >= 0 && diffHours <= config.max_session_hours) {
        return openSession.work_date;
      }
    }
    // Default: calendar date string YYYY-MM-DD
    return punchDate.toISOString().split('T')[0];
  }

  /**
   * CORE INGESTION PIPELINE: Ingest Raw Biometric Punch Event
   */
  async ingestPunchEvent(payload: {
    deviceId: string;
    deviceName: string;
    deviceSerial?: string;
    deviceIp?: string;
    deviceLocation?: string;
    deviceBranch?: string;
    deviceDirectionMode: DeviceDirectionMode;
    biometricUserId: string;
    deviceTimestamp: string;
    source?: 'BIOMETRIC_TCP' | 'BIOMETRIC_GATEWAY' | 'MANUAL_AUDIT' | 'MOBILE_GPS' | 'WEB_KIOSK' | 'DIAGNOSTIC_TEST';
    isDiagnosticTest?: boolean;
    rawPayload?: Record<string, any>;
  }): Promise<{ event: RawBiometricPunchEvent; isDuplicate: boolean; sessionId?: string }> {
    const tenantId = getActiveOrgId();
    const source = payload.source || 'BIOMETRIC_TCP';
    const isTest = !!payload.isDiagnosticTest || source === 'DIAGNOSTIC_TEST';

    // 1. Determine Event Direction based on Device Direction Mode
    let resolvedEventType: PunchEventType = 'UNKNOWN';
    if (payload.deviceDirectionMode === 'CHECK_IN') {
      resolvedEventType = 'CHECK_IN';
    } else if (payload.deviceDirectionMode === 'CHECK_OUT') {
      resolvedEventType = 'CHECK_OUT';
    } else {
      // BOTH Mode: infer from payload or default to state evaluation
      resolvedEventType = payload.rawPayload?.punchState === 'Check-Out' ? 'CHECK_OUT' : 'CHECK_IN';
    }

    // 2. Deterministic Idempotency Key
    const eventHash = this.generateEventHash(
      tenantId,
      payload.deviceId,
      payload.biometricUserId,
      payload.deviceTimestamp,
      resolvedEventType
    );

    // 3. Check for exact duplicate event in immutable raw event ledger
    const rawLedger = getStore<RawBiometricPunchEvent[]>(STORAGE_KEYS_PIPELINE.RAW_EVENTS, []);
    const existingExact = rawLedger.find(e => e.event_hash === eventHash);
    if (existingExact) {
      console.log(`[PIPELINE] Idempotent duplicate event detected: ${eventHash}`);
      return { event: existingExact, isDuplicate: true, sessionId: existingExact.session_id };
    }

    // 4. Resolve Employee Identity from Multi-Tenant Directory
    let mappedEmp: any = null;
    try {
      const employees = await api.getEmployees();
      const pinStr = payload.biometricUserId.trim();
      const pinDigits = pinStr.replace(/\D/g, '');
      mappedEmp = employees.find(
        (e: any) =>
          e.employee_code === pinStr ||
          e.employee_code?.replace(/\D/g, '') === pinDigits ||
          e.id === pinStr ||
          e.user_id === pinStr
      );
    } catch (_) {}

    const empId = mappedEmp ? mappedEmp.id : `UNMAPPED-${payload.biometricUserId}`;
    const empName = mappedEmp
      ? mappedEmp.display_name || `${mappedEmp.first_name || ''} ${mappedEmp.last_name || ''}`.trim()
      : `Unmapped PIN #${payload.biometricUserId}`;
    const empCode = mappedEmp ? mappedEmp.employee_code : payload.biometricUserId;
    const empDept = mappedEmp?.department_name || mappedEmp?.department || 'General';

    // 5. Serialize processing for this employee to prevent concurrency race conditions
    const lockKey = `${tenantId}::${empId}`;
    const currentLock = employeeLockQueues.get(lockKey) || Promise.resolve();

    let resultEvent!: RawBiometricPunchEvent;
    let resultSessionId: string | undefined;
    let isDupe = false;

    const nextLock = currentLock
      .then(async () => {
        // If it's a diagnostic test event, record as TEST without writing to production attendance sessions
        if (isTest) {
          resultEvent = {
            event_id: `evt-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            tenant_id: tenantId,
            organisation_id: tenantId,
            device_id: payload.deviceId,
            device_name: payload.deviceName,
            device_serial: payload.deviceSerial,
            device_ip: payload.deviceIp,
            device_location: payload.deviceLocation,
            device_branch: payload.deviceBranch,
            device_direction_mode: payload.deviceDirectionMode,
            employee_id: empId,
            employee_name: empName,
            employee_code: empCode,
            biometric_user_id: payload.biometricUserId,
            event_type: resolvedEventType,
            device_timestamp: new Date(payload.deviceTimestamp).toISOString(),
            server_received_at: new Date().toISOString(),
            source: 'DIAGNOSTIC_TEST',
            raw_payload: payload.rawPayload,
            event_hash: eventHash,
            processing_status: 'PROCESSED',
            status_reason: 'Diagnostic test event (did not modify production attendance)',
            work_date: new Date(payload.deviceTimestamp).toISOString().split('T')[0],
            is_diagnostic_test: true,
          };
          rawLedger.unshift(resultEvent);
          setStore(STORAGE_KEYS_PIPELINE.RAW_EVENTS, rawLedger.slice(0, 2000));
          return;
        }

        // A. Load existing sessions for this employee
        const sessionsStore = getStore<AttendanceSession[]>(STORAGE_KEYS_PIPELINE.SESSIONS, []);
        const employeeSessions = sessionsStore.filter(s => s.employee_id === empId);
        const openSession = employeeSessions.find(s => s.is_open);

        const workDate = this.resolveWorkDate(payload.deviceTimestamp, openSession);
        const punchTime = new Date(payload.deviceTimestamp);
        const config = this.getConfig();

        // B. Check Duplicate Window Suppression
        const recentPunches = rawLedger.filter(
          e =>
            e.employee_id === empId &&
            e.event_type === resolvedEventType &&
            !e.is_diagnostic_test &&
            Math.abs(punchTime.getTime() - new Date(e.device_timestamp).getTime()) <=
              config.duplicate_window_seconds * 1000
        );

        if (recentPunches.length > 0) {
          isDupe = true;
          resultEvent = {
            event_id: `evt-dupe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            tenant_id: tenantId,
            organisation_id: tenantId,
            device_id: payload.deviceId,
            device_name: payload.deviceName,
            device_serial: payload.deviceSerial,
            device_ip: payload.deviceIp,
            device_location: payload.deviceLocation,
            device_branch: payload.deviceBranch,
            device_direction_mode: payload.deviceDirectionMode,
            employee_id: empId,
            employee_name: empName,
            employee_code: empCode,
            biometric_user_id: payload.biometricUserId,
            event_type: resolvedEventType,
            device_timestamp: punchTime.toISOString(),
            server_received_at: new Date().toISOString(),
            source,
            raw_payload: payload.rawPayload,
            event_hash: eventHash,
            processing_status: 'DUPLICATE',
            status_reason: `Suppressed duplicate punch within ${config.duplicate_window_seconds}s window.`,
            work_date: workDate,
          };
          rawLedger.unshift(resultEvent);
          setStore(STORAGE_KEYS_PIPELINE.RAW_EVENTS, rawLedger.slice(0, 2000));
          return;
        }

        // C. Process State Machine Transition
        const eventId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        if (resolvedEventType === 'CHECK_IN') {
          if (openSession) {
            resultEvent = {
              event_id: eventId,
              tenant_id: tenantId,
              organisation_id: tenantId,
              device_id: payload.deviceId,
              device_name: payload.deviceName,
              device_serial: payload.deviceSerial,
              device_ip: payload.deviceIp,
              device_location: payload.deviceLocation,
              device_branch: payload.deviceBranch,
              device_direction_mode: payload.deviceDirectionMode,
              employee_id: empId,
              employee_name: empName,
              employee_code: empCode,
              biometric_user_id: payload.biometricUserId,
              event_type: 'CHECK_IN',
              device_timestamp: punchTime.toISOString(),
              server_received_at: new Date().toISOString(),
              source,
              raw_payload: payload.rawPayload,
              event_hash: eventHash,
              processing_status: 'DUPLICATE',
              status_reason: 'Open attendance session already active. Check-in event recorded as evidence.',
              session_id: openSession.id,
              work_date: workDate,
            };
            resultSessionId = openSession.id;
          } else {
            // Create New Open Attendance Session
            const newSessionId = `ses-${Date.now()}-${empCode}`;
            resultSessionId = newSessionId;
            const newSession: AttendanceSession = {
              id: newSessionId,
              tenant_id: tenantId,
              employee_id: empId,
              employee_name: empName,
              employee_code: empCode,
              department: empDept,
              work_date: workDate,
              shift_name: 'General Shift (09:00 - 18:00)',
              check_in_event_id: eventId,
              check_in_time: punchTime.toISOString(),
              check_in_device_id: payload.deviceId,
              check_in_device_name: payload.deviceName,
              check_in_device_location: payload.deviceLocation || 'Main Gate',
              duration_minutes: 0,
              is_overnight: false,
              is_open: true,
              status: 'OPEN',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            sessionsStore.unshift(newSession);
            setStore(STORAGE_KEYS_PIPELINE.SESSIONS, sessionsStore);

            resultEvent = {
              event_id: eventId,
              tenant_id: tenantId,
              organisation_id: tenantId,
              device_id: payload.deviceId,
              device_name: payload.deviceName,
              device_serial: payload.deviceSerial,
              device_ip: payload.deviceIp,
              device_location: payload.deviceLocation,
              device_branch: payload.deviceBranch,
              device_direction_mode: payload.deviceDirectionMode,
              employee_id: empId,
              employee_name: empName,
              employee_code: empCode,
              biometric_user_id: payload.biometricUserId,
              event_type: 'CHECK_IN',
              device_timestamp: punchTime.toISOString(),
              server_received_at: new Date().toISOString(),
              source,
              raw_payload: payload.rawPayload,
              event_hash: eventHash,
              processing_status: 'PROCESSED',
              status_reason: `Opened new attendance session on ${payload.deviceName} (${payload.deviceLocation || 'Ingress'})`,
              session_id: newSessionId,
              work_date: workDate,
            };
          }
        } else if (resolvedEventType === 'CHECK_OUT') {
          // Pair with open session (Even from separate device!)
          if (openSession) {
            const inTime = new Date(openSession.check_in_time);
            const durationMins = Math.max(0, Math.round((punchTime.getTime() - inTime.getTime()) / (1000 * 60)));
            const isOvernight = punchTime.getDate() !== inTime.getDate();

            openSession.check_out_event_id = eventId;
            openSession.check_out_time = punchTime.toISOString();
            openSession.check_out_device_id = payload.deviceId;
            openSession.check_out_device_name = payload.deviceName;
            openSession.check_out_device_location = payload.deviceLocation || 'Exit Gate';
            openSession.duration_minutes = durationMins;
            openSession.is_overnight = isOvernight;
            openSession.is_open = false;
            openSession.status = 'COMPLETED';
            openSession.updated_at = new Date().toISOString();

            setStore(STORAGE_KEYS_PIPELINE.SESSIONS, sessionsStore);
            resultSessionId = openSession.id;

            resultEvent = {
              event_id: eventId,
              tenant_id: tenantId,
              organisation_id: tenantId,
              device_id: payload.deviceId,
              device_name: payload.deviceName,
              device_serial: payload.deviceSerial,
              device_ip: payload.deviceIp,
              device_location: payload.deviceLocation,
              device_branch: payload.deviceBranch,
              device_direction_mode: payload.deviceDirectionMode,
              employee_id: empId,
              employee_name: empName,
              employee_code: empCode,
              biometric_user_id: payload.biometricUserId,
              event_type: 'CHECK_OUT',
              device_timestamp: punchTime.toISOString(),
              server_received_at: new Date().toISOString(),
              source,
              raw_payload: payload.rawPayload,
              event_hash: eventHash,
              processing_status: 'PROCESSED',
              status_reason: `Closed session #${openSession.id} (Check-In: ${openSession.check_in_device_name}, Check-Out: ${payload.deviceName}, Worked: ${Math.floor(durationMins / 60)}h ${durationMins % 60}m)`,
              session_id: openSession.id,
              work_date: workDate,
            };
          } else {
            // Check-out received with no open session
            resultEvent = {
              event_id: eventId,
              tenant_id: tenantId,
              organisation_id: tenantId,
              device_id: payload.deviceId,
              device_name: payload.deviceName,
              device_serial: payload.deviceSerial,
              device_ip: payload.deviceIp,
              device_location: payload.deviceLocation,
              device_branch: payload.deviceBranch,
              device_direction_mode: payload.deviceDirectionMode,
              employee_id: empId,
              employee_name: empName,
              employee_code: empCode,
              biometric_user_id: payload.biometricUserId,
              event_type: 'CHECK_OUT',
              device_timestamp: punchTime.toISOString(),
              server_received_at: new Date().toISOString(),
              source,
              raw_payload: payload.rawPayload,
              event_hash: eventHash,
              processing_status: 'REQUIRES_REVIEW',
              status_reason: 'Check-out event received with no prior open Check-In session (MISSING_CHECK_IN exception).',
              work_date: workDate,
            };
          }
        }

        // D. Save to Immutable Raw Event Ledger
        rawLedger.unshift(resultEvent);
        setStore(STORAGE_KEYS_PIPELINE.RAW_EVENTS, rawLedger.slice(0, 3000));

        // E. Recalculate Daily Attendance Summary
        this.recalculateDailyAttendance(tenantId, empId, workDate);

        // F. Broadcast Real-time Bus Event
        hrEventBus.emit('biometric.punch_received', {
          event: resultEvent,
          sessionId: resultSessionId,
        });
      })
      .catch(err => {
        console.error('[PIPELINE] Ingestion processing failure:', err);
      });

    employeeLockQueues.set(lockKey, nextLock);
    await nextLock;

    return {
      event: resultEvent,
      isDuplicate: isDupe,
      sessionId: resultSessionId,
    };
  }

  /**
   * Recalculate Daily Attendance Record for an Employee & Work Date
   */
  recalculateDailyAttendance(tenantId: string, employeeId: string, workDate: string): DailyAttendanceRecord | null {
    const sessionsStore = getStore<AttendanceSession[]>(STORAGE_KEYS_PIPELINE.SESSIONS, [], tenantId);
    const daySessions = sessionsStore.filter(s => s.employee_id === employeeId && s.work_date === workDate);

    if (daySessions.length === 0) return null;

    const dailyStore = getStore<DailyAttendanceRecord[]>(STORAGE_KEYS_PIPELINE.DAILY_RECORDS, [], tenantId);
    const existingIndex = dailyStore.findIndex(d => d.employee_id === employeeId && d.work_date === workDate);

    let totalMins = 0;
    for (const s of daySessions) {
      totalMins += s.duration_minutes || 0;
    }

    const firstSession = [...daySessions].sort(
      (a, b) => new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime()
    )[0];
    const completedSessions = daySessions.filter(s => !!s.check_out_time);
    const lastSession = [...completedSessions].sort(
      (a, b) => new Date(a.check_out_time!).getTime() - new Date(b.check_out_time!).getTime()
    ).pop();

    const hasOpenSession = daySessions.some(s => s.is_open);

    let status: DailyAttendanceRecord['status'] = 'PRESENT';
    if (hasOpenSession) {
      status = 'PRESENT';
    } else if (totalMins >= 480) {
      status = 'PRESENT';
    } else if (totalMins >= 240) {
      status = 'HALF_DAY';
    } else if (totalMins > 0) {
      status = 'MISSING_PUNCH';
    } else {
      status = 'ABSENT';
    }

    const dailyRecord: DailyAttendanceRecord = {
      id: `daily-${workDate}-${employeeId}`,
      tenant_id: tenantId,
      employee_id: employeeId,
      employee_name: firstSession.employee_name,
      employee_code: firstSession.employee_code,
      department: firstSession.department,
      work_date: workDate,
      shift_name: firstSession.shift_name,
      first_check_in_time: firstSession.check_in_time,
      first_check_in_device: firstSession.check_in_device_name,
      last_check_out_time: lastSession?.check_out_time || undefined,
      last_check_out_device: lastSession?.check_out_device_name || undefined,
      total_work_minutes: totalMins,
      total_break_minutes: 0,
      session_count: daySessions.length,
      sessions: daySessions,
      status,
      has_exceptions: hasOpenSession,
      exception_ids: [],
      is_payroll_locked: false,
      last_recalculated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      dailyStore[existingIndex] = dailyRecord;
    } else {
      dailyStore.unshift(dailyRecord);
    }

    setStore(STORAGE_KEYS_PIPELINE.DAILY_RECORDS, dailyStore, tenantId);
    return dailyRecord;
  }

  /**
   * Get Immutable Raw Punch Event Ledger
   */
  getRawPunchLedger(options?: {
    deviceId?: string;
    employeeId?: string;
    status?: PunchProcessingStatus;
    limit?: number;
  }): RawBiometricPunchEvent[] {
    let list = getStore<RawBiometricPunchEvent[]>(STORAGE_KEYS_PIPELINE.RAW_EVENTS, []);
    if (options?.deviceId) {
      list = list.filter(e => e.device_id === options.deviceId);
    }
    if (options?.employeeId) {
      list = list.filter(e => e.employee_id === options.employeeId || e.biometric_user_id === options.employeeId);
    }
    if (options?.status) {
      list = list.filter(e => e.processing_status === options.status);
    }
    return list.slice(0, options?.limit || 200);
  }

  /**
   * Get All Attendance Sessions
   */
  getAttendanceSessions(options?: {
    workDate?: string;
    employeeId?: string;
    isOpenOnly?: boolean;
  }): AttendanceSession[] {
    let list = getStore<AttendanceSession[]>(STORAGE_KEYS_PIPELINE.SESSIONS, []);
    if (options?.workDate) {
      list = list.filter(s => s.work_date === options.workDate);
    }
    if (options?.employeeId) {
      list = list.filter(s => s.employee_id === options.employeeId);
    }
    if (options?.isOpenOnly) {
      list = list.filter(s => s.is_open);
    }
    return list;
  }

  /**
   * Get Daily Attendance Records
   */
  getDailyAttendanceRecords(workDate?: string): DailyAttendanceRecord[] {
    let list = getStore<DailyAttendanceRecord[]>(STORAGE_KEYS_PIPELINE.DAILY_RECORDS, []);
    if (workDate) {
      list = list.filter(d => d.work_date === workDate);
    }
    return list;
  }

  /**
   * Record Non-Destructive Ledger Adjustment (HR or Manager Resolution)
   */
  recordAdjustment(payload: {
    sessionId?: string;
    dailyRecordId?: string;
    employeeId: string;
    workDate: string;
    adjustmentType: AttendanceLedgerAdjustment['adjustment_type'];
    reason: string;
    adjustedState: Record<string, any>;
    adjustedByName?: string;
  }): AttendanceLedgerAdjustment {
    const tenantId = getActiveOrgId();
    const adjustments = getStore<AttendanceLedgerAdjustment[]>(STORAGE_KEYS_PIPELINE.ADJUSTMENTS, []);

    const adj: AttendanceLedgerAdjustment = {
      id: `adj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tenant_id: tenantId,
      session_id: payload.sessionId,
      daily_record_id: payload.dailyRecordId,
      employee_id: payload.employeeId,
      work_date: payload.workDate,
      adjustment_type: payload.adjustmentType,
      original_state: {},
      adjusted_state: payload.adjustedState,
      reason: payload.reason,
      adjusted_by_id: 'usr-admin',
      adjusted_by_name: payload.adjustedByName || 'HR Administrator',
      adjusted_at: new Date().toISOString(),
    };

    adjustments.unshift(adj);
    setStore(STORAGE_KEYS_PIPELINE.ADJUSTMENTS, adjustments);

    // Apply adjustment to session if applicable
    if (payload.sessionId) {
      const sessionsStore = getStore<AttendanceSession[]>(STORAGE_KEYS_PIPELINE.SESSIONS, []);
      const session = sessionsStore.find(s => s.id === payload.sessionId);
      if (session) {
        if (payload.adjustedState.check_out_time) {
          session.check_out_time = payload.adjustedState.check_out_time;
          session.check_out_device_name = payload.adjustedState.check_out_device_name || 'Manual HR Adjustment';
          session.is_open = false;
          session.status = 'ADJUSTED_MANUAL';
          const inTime = new Date(session.check_in_time).getTime();
          const outTime = new Date(payload.adjustedState.check_out_time).getTime();
          session.duration_minutes = Math.max(0, Math.round((outTime - inTime) / (1000 * 60)));
          session.updated_at = new Date().toISOString();
          setStore(STORAGE_KEYS_PIPELINE.SESSIONS, sessionsStore);
          this.recalculateDailyAttendance(tenantId, session.employee_id, session.work_date);
        }
      }
    }

    hrEventBus.emit('attendance.updated', { adjustmentId: adj.id, employeeId: payload.employeeId });
    return adj;
  }
}

export const biometricEventPipelineService = new BiometricEventPipelineService();
