// src/services/attendance/attendanceIngestionService.ts
// ============================================================================
// JOY PeopleHR — Centralized Cross-Channel Attendance Ingestion Service
// "First Valid Check-In Wins Across Biometric, Mobile and Web"
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { getActiveOrgId } from './biometricCommandService';
import { attendanceTimeService } from './attendanceTimeService';
import { biometricSmsNotificationService } from './biometricSmsNotificationService';
import { attendanceNotificationService } from './attendanceNotificationService';

export type AttendanceChannelSource = 'BIOMETRIC' | 'MOBILE' | 'WEB' | 'MANUAL';
export type PunchDirection = 'CHECK_IN' | 'CHECK_OUT' | 'AUTO';
export type VerificationMode = 'BIOMETRIC' | 'FACE' | 'FINGERPRINT' | 'GPS' | 'CARD' | 'MANUAL';

export interface IngestAttendanceEventRequest {
  organizationId?: string;
  employeeId: string;
  source: AttendanceChannelSource;
  punchType?: PunchDirection;
  verificationMode?: VerificationMode;
  punchTime?: string; // ISO timestamp
  deviceId?: string;
  idempotencyKey?: string;
  latitude?: number;
  longitude?: number;
  rawPayload?: Record<string, any>;
}

export interface AttendanceIngestionResult {
  accepted: boolean;
  outcome:
    | 'ACCEPTED'
    | 'DUPLICATE_CHECK_IN'
    | 'DUPLICATE_CHECK_OUT'
    | 'IDEMPOTENT_REPLAY'
    | 'TENANT_MISMATCH'
    | 'UNKNOWN_EMPLOYEE'
    | 'EMPLOYEE_INACTIVE'
    | 'ERROR';
  reason: string;
  source: AttendanceChannelSource;
  employee_id?: string;
  existing_source?: string;
  existing_punch_time?: string;
  punch_id?: string;
  attendance_session_id?: string;
  attendance_date?: string;
  user_message?: string;
}

export interface IngestionAuditLogEntry {
  id: string;
  organizationId: string;
  employeeId: string;
  source: AttendanceChannelSource;
  punchType: PunchDirection;
  verificationMode: VerificationMode;
  idempotencyKey?: string;
  deviceId?: string;
  eventTimestamp: string;
  receivedAt: string;
  accepted: boolean;
  outcome: string;
  reason: string;
  existingSource?: string;
  existingPunchTime?: string;
  rawPayload?: Record<string, any>;
}

class AttendanceIngestionService {
  // Diagnostic audit log in memory (synced to Supabase when active)
  private auditLogs: IngestionAuditLogEntry[] = [];

  // Local authoritative session registry for offline/hybrid fallback
  // Map key: `${orgId}:${empId}:${sessionDate}`
  private localSessions: Map<
    string,
    {
      sessionId: string;
      sessionDate: string;
      checkInSource: AttendanceChannelSource;
      checkInTime: string;
      lastOutSource?: AttendanceChannelSource;
      lastOutTime?: string;
    }
  > = new Map();

  // Local idempotency registry: idempotencyKey -> result
  private idempotencyRegistry: Map<string, AttendanceIngestionResult> = new Map();

  /**
   * Determine session date formatted as YYYY-MM-DD (Asia/Kolkata timezone standard)
   * Morning punches (before cutoff, default 12:00 noon) during overnight shifts belong to previous day's shift date.
   */
  public determineSessionDate(punchTimeIso: string, isOvernight = false, cutoffTime = '12:00'): string {
    const d = new Date(punchTimeIso);
    const istTimeStr = d.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
    const istDateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    if (isOvernight && istTimeStr < cutoffTime) {
      const prevDate = new Date(d.getTime() - 24 * 60 * 60 * 1000);
      return prevDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    }

    return istDateStr;
  }

  /**
   * Format human-friendly time for feedback messages
   */
  private formatDisplayTime(isoString?: string): string {
    if (!isoString) return 'earlier';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  }

  /**
   * Capitalize channel name for UI messages
   */
  private formatChannelName(ch?: string): string {
    if (!ch) return 'another channel';
    switch (ch.toUpperCase()) {
      case 'WEB':
        return 'Web';
      case 'MOBILE':
        return 'Mobile';
      case 'BIOMETRIC':
        return 'Biometric device';
      default:
        return ch;
    }
  }

  /**
   * Authoritative Central Ingestion Method
   * All channels (Web, Mobile, Biometric) MUST call this function.
   */
  public async ingestAttendanceEvent(
    request: IngestAttendanceEventRequest
  ): Promise<AttendanceIngestionResult> {
    const orgId = request.organizationId || getActiveOrgId() || '00000000-0000-0000-0000-000000000000';
    const punchTime = request.punchTime || new Date().toISOString();
    let punchType: PunchDirection = request.punchType || 'CHECK_IN';
    const source: AttendanceChannelSource = request.source || 'WEB';
    const mode: VerificationMode = request.verificationMode || (source === 'BIOMETRIC' ? 'BIOMETRIC' : source === 'MOBILE' ? 'GPS' : 'MANUAL');
    const isOvernight = !!request.rawPayload?.isOvernight;
    const sessionDate = this.determineSessionDate(punchTime, isOvernight);
    const sessionId = `sess-${sessionDate}-${request.employeeId}`;

    // 1. Check idempotency in memory first
    if (request.idempotencyKey && this.idempotencyRegistry.has(request.idempotencyKey)) {
      const cached = this.idempotencyRegistry.get(request.idempotencyKey)!;
      return {
        ...cached,
        outcome: 'IDEMPOTENT_REPLAY',
        user_message: cached.accepted
          ? `Check-in already accepted at ${this.formatDisplayTime(punchTime)}.`
          : cached.user_message || `Request already processed.`,
      };
    }

    // Pre-check for Biometric: If punchType is CHECK_IN or AUTO, check if employee already checked in today (e.g. via Mobile GPS or Web)
    let priorCheckInTime: string | null = request.rawPayload?.checkInTime || request.rawPayload?.first_check_in_time || null;

    // 2. Database-backed RPC execution when Supabase is enabled
    if (isSupabaseEnabled) {
      try {
        if (source === 'BIOMETRIC' && !priorCheckInTime) {
          try {
            const { data: dailyRow } = await supabase
              .from('attendance_daily')
              .select('first_check_in')
              .eq('employee_id', request.employeeId)
              .eq('attendance_date', sessionDate)
              .maybeSingle();
            if (dailyRow?.first_check_in) {
              priorCheckInTime = dailyRow.first_check_in;
            }
          } catch (_) {}
        }

        // Only promote to CHECK_OUT if at least 4.0 hours (240 mins) have elapsed AND it's afternoon/shift exit window
        if (source === 'BIOMETRIC' && priorCheckInTime && punchType !== 'CHECK_OUT') {
          const cInMs = new Date(priorCheckInTime).getTime();
          const pMs = new Date(punchTime).getTime();
          const diffMins = !isNaN(cInMs) && !isNaN(pMs) ? (pMs - cInMs) / 60000 : 0;
          const punchDt = new Date(punchTime);
          const istHour = (punchDt.getUTCHours() + 5.5 + punchDt.getUTCMinutes() / 60) % 24;
          if (diffMins >= 240 && istHour >= 13.0) {
            punchType = 'CHECK_OUT';
          }
        }

        const { data, error } = await supabase.rpc('ingest_attendance_event', {
          p_organization_id: orgId,
          p_employee_id: request.employeeId,
          p_source: source,
          p_punch_type: punchType,
          p_verification_mode: mode,
          p_punch_time: punchTime,
          p_device_id: request.deviceId || null,
          p_idempotency_key: request.idempotencyKey || null,
          p_latitude: request.latitude ?? null,
          p_longitude: request.longitude ?? null,
          p_raw_payload: request.rawPayload || {},
        });

        if (!error && data) {
          const res: AttendanceIngestionResult = {
            accepted: !!data.accepted,
            outcome: data.outcome || (data.accepted ? 'ACCEPTED' : 'DUPLICATE_CHECK_IN'),
            reason: data.reason || '',
            source,
            employee_id: request.employeeId,
            existing_source: data.existing_source,
            existing_punch_time: data.existing_punch_time || priorCheckInTime || undefined,
            punch_id: data.punch_id,
            attendance_session_id: data.attendance_session_id || sessionId,
            attendance_date: data.attendance_date || sessionDate,
          };

          // Monitor mode smart check-out resolution for Biometric:
          // If RPC returned DUPLICATE_CHECK_IN for biometric scan, but employee checked in >= 4 hours (240 mins) ago and it's afternoon (>= 13:00 IST):
          if (
            !res.accepted &&
            source === 'BIOMETRIC' &&
            res.outcome === 'DUPLICATE_CHECK_IN' &&
            (data.existing_punch_time || priorCheckInTime)
          ) {
            const effectiveCheckIn = data.existing_punch_time || priorCheckInTime!;
            const checkInMs = new Date(effectiveCheckIn).getTime();
            const punchMs = new Date(punchTime).getTime();
            const elapsedMinutes = !isNaN(checkInMs) && !isNaN(punchMs) ? (punchMs - checkInMs) / (1000 * 60) : 0;
            const punchDt = new Date(punchTime);
            const istHour = (punchDt.getUTCHours() + 5.5 + punchDt.getUTCMinutes() / 60) % 24;

            if (elapsedMinutes >= 240 && istHour >= 13.0) {
              const { data: outData, error: outError } = await supabase.rpc('ingest_attendance_event', {
                p_organization_id: orgId,
                p_employee_id: request.employeeId,
                p_source: source,
                p_punch_type: 'CHECK_OUT',
                p_verification_mode: mode,
                p_punch_time: punchTime,
                p_device_id: request.deviceId || null,
                p_idempotency_key: request.idempotencyKey ? `${request.idempotencyKey}-out` : null,
                p_latitude: request.latitude ?? null,
                p_longitude: request.longitude ?? null,
                p_raw_payload: { ...request.rawPayload, monitor_mode: true, first_check_in_time: effectiveCheckIn },
              });

              if (!outError && outData && outData.accepted) {
                res.accepted = true;
                res.outcome = 'ACCEPTED';
                res.reason = 'MONITOR_MODE_CHECK_OUT_ACCEPTED';
                res.punch_id = outData.punch_id;
                res.user_message = `Check-out recorded successfully at ${this.formatDisplayTime(punchTime)} via Biometric device.`;

                biometricSmsNotificationService.handleBiometricCheckOutAccepted({
                  organizationId: orgId,
                  employeeId: request.employeeId,
                  punchId: res.punch_id,
                  attendanceDate: res.attendance_date || sessionDate,
                  punchTime,
                  deviceId: request.deviceId,
                  deviceName: request.rawPayload?.deviceName,
                  source: 'BIOMETRIC',
                  checkInTime: effectiveCheckIn,
                }).catch(err => console.warn('[attendanceIngestionService] Biometric check-out SMS notice:', err));

                // Dispatch real-time In-App + Remote Push notifications to Reporting Manager & TL/Supervisor
                attendanceNotificationService.handleAttendanceEventAccepted({
                  organizationId: orgId,
                  punchId: res.punch_id,
                  employeeId: request.employeeId,
                  eventType: 'attendance.check_out.accepted',
                  punchType: 'CHECK_OUT',
                  source: 'BIOMETRIC',
                  punchTime,
                  deviceId: request.deviceId,
                  deviceName: request.rawPayload?.deviceName,
                  latitude: request.latitude,
                  longitude: request.longitude,
                  idempotencyKey: request.idempotencyKey ? `${request.idempotencyKey}-notif-out` : undefined,
                }).catch(err => console.warn('[attendanceIngestionService] Monitor mode check-out notification notice:', err));

                if (request.idempotencyKey) {
                  this.idempotencyRegistry.set(request.idempotencyKey, res);
                }
                return res;
              }
            }
          }

          if (res.outcome === 'DUPLICATE_CHECK_IN') {
            const timeStr = this.formatDisplayTime(res.existing_punch_time);
            const chStr = this.formatChannelName(res.existing_source);
            res.user_message = `Check-in already recorded at ${timeStr} via ${chStr}.`;
          } else if (res.accepted) {
            res.user_message = `${punchType === 'CHECK_IN' ? 'Check-in' : 'Check-out'} recorded successfully.`;

            // Trigger Supervisor In-App and Push Notifications across all channels (Mobile, Biometric, Web, Manual)
            attendanceNotificationService.handleAttendanceEventAccepted({
              organizationId: orgId,
              punchId: res.punch_id,
              employeeId: request.employeeId,
              eventType: punchType === 'CHECK_IN' ? 'attendance.check_in.accepted' : 'attendance.check_out.accepted',
              punchType,
              source,
              punchTime,
              deviceId: request.deviceId,
              deviceName: request.rawPayload?.deviceName,
              latitude: request.latitude,
              longitude: request.longitude,
              idempotencyKey: request.idempotencyKey,
            }).catch(err => console.warn('[attendanceIngestionService] Supervisor notification notice:', err));

            // Trigger Airtel SMS notification asynchronously for accepted BIOMETRIC punch
            if (source === 'BIOMETRIC') {
              if (punchType === 'CHECK_IN') {
                biometricSmsNotificationService.handleBiometricCheckInAccepted({
                  organizationId: orgId,
                  employeeId: request.employeeId,
                  punchId: res.punch_id,
                  attendanceDate: res.attendance_date || sessionDate,
                  punchTime,
                  deviceId: request.deviceId,
                  deviceName: request.rawPayload?.deviceName,
                  source: 'BIOMETRIC',
                }).catch(err => console.warn('[attendanceIngestionService] Biometric SMS enqueue notice:', err));
              } else if (punchType === 'CHECK_OUT') {
                biometricSmsNotificationService.handleBiometricCheckOutAccepted({
                  organizationId: orgId,
                  employeeId: request.employeeId,
                  punchId: res.punch_id,
                  attendanceDate: res.attendance_date || sessionDate,
                  punchTime,
                  deviceId: request.deviceId,
                  deviceName: request.rawPayload?.deviceName,
                  source: 'BIOMETRIC',
                  checkInTime: res.existing_punch_time || priorCheckInTime || undefined,
                }).catch(err => console.warn('[attendanceIngestionService] Biometric check-out SMS enqueue notice:', err));
              }
            }
          } else {
            res.user_message = res.reason;
          }

          if (request.idempotencyKey) {
            this.idempotencyRegistry.set(request.idempotencyKey, res);
          }

          return res;
        }

        console.warn('[attendanceIngestionService] Supabase RPC notice, evaluating local engine:', error);
      } catch (err) {
        console.warn('[attendanceIngestionService] RPC network error, fallback to local engine:', err);
      }
    }

    // 3. Fallback Engine (Offline / Local / Hybrid Mode)
    // Strictly replicates the database concurrency & session rules
    const sessionKey = `${orgId}:${request.employeeId}:${sessionDate}`;
    const existing = this.localSessions.get(sessionKey);

    if (punchType === 'CHECK_IN') {
      if (existing) {
        // Monitor mode evaluation:
        // If employee already has a check-in, and this punch is from BIOMETRIC in monitor mode >= 3.5 hours after check-in and afternoon:
        const checkInMs = new Date(existing.checkInTime).getTime();
        const punchMs = new Date(punchTime).getTime();
        const elapsedMinutes = !isNaN(checkInMs) && !isNaN(punchMs) ? (punchMs - checkInMs) / (1000 * 60) : 0;
        const isMonitorMode = request.punchType === 'AUTO' || !!request.rawPayload?.monitorMode || request.rawPayload?.direction === 'AUTO';
        const punchDt = new Date(punchTime);
        const istHour = (punchDt.getUTCHours() + 5.5 + punchDt.getUTCMinutes() / 60) % 24;

        if (source === 'BIOMETRIC' && isMonitorMode && elapsedMinutes >= 210 && istHour >= 13.0) {
          // Monitor mode: proceed directly to CHECK_OUT handler
          punchType = 'CHECK_OUT';
        } else {
          // Cross-channel duplicate check-in! First valid check-in wins!
          const timeStr = this.formatDisplayTime(existing.checkInTime);
          const chStr = this.formatChannelName(existing.checkInSource);
          const result: AttendanceIngestionResult = {
            accepted: false,
            outcome: 'DUPLICATE_CHECK_IN',
            reason: 'ATTENDANCE_SESSION_ALREADY_HAS_CHECK_IN',
            source,
            employee_id: request.employeeId,
            existing_source: existing.checkInSource,
            existing_punch_time: existing.checkInTime,
            attendance_session_id: sessionId,
            attendance_date: sessionDate,
            user_message: `Check-in already recorded at ${timeStr} via ${chStr}.`,
          };

          this.recordAuditLog({
            id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            organizationId: orgId,
            employeeId: request.employeeId,
            source,
            punchType,
            verificationMode: mode,
            idempotencyKey: request.idempotencyKey,
            deviceId: request.deviceId,
            eventTimestamp: punchTime,
            receivedAt: new Date().toISOString(),
            accepted: false,
            outcome: 'DUPLICATE_CHECK_IN',
            reason: 'ATTENDANCE_SESSION_ALREADY_HAS_CHECK_IN',
            existingSource: existing.checkInSource,
            existingPunchTime: existing.checkInTime,
            rawPayload: request.rawPayload,
          });

          if (request.idempotencyKey) {
            this.idempotencyRegistry.set(request.idempotencyKey, result);
          }

          return result;
        }
      } else {
        // First valid check-in of the session: ACCEPT
        this.localSessions.set(sessionKey, {
          sessionId,
          sessionDate,
          checkInSource: source,
          checkInTime: punchTime,
        });

        const punchId = `punch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const result: AttendanceIngestionResult = {
          accepted: true,
          outcome: 'ACCEPTED',
          reason: 'FIRST_VALID_CHECK_IN_ACCEPTED',
          source,
          employee_id: request.employeeId,
          punch_id: punchId,
          attendance_session_id: sessionId,
          attendance_date: sessionDate,
          user_message: `Check-in recorded successfully at ${this.formatDisplayTime(punchTime)} via ${this.formatChannelName(source)}.`,
        };

        this.recordAuditLog({
          id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          organizationId: orgId,
          employeeId: request.employeeId,
          source,
          punchType,
          verificationMode: mode,
          idempotencyKey: request.idempotencyKey,
          deviceId: request.deviceId,
          eventTimestamp: punchTime,
          receivedAt: new Date().toISOString(),
          accepted: true,
          outcome: 'ACCEPTED',
          reason: 'FIRST_VALID_CHECK_IN_ACCEPTED',
          rawPayload: request.rawPayload,
        });

        // Trigger Supervisor In-App and Remote Push Notifications across all sources
        attendanceNotificationService.handleAttendanceEventAccepted({
          organizationId: orgId,
          punchId,
          employeeId: request.employeeId,
          eventType: 'attendance.check_in.accepted',
          punchType: 'CHECK_IN',
          source,
          punchTime,
          deviceId: request.deviceId,
          deviceName: request.rawPayload?.deviceName,
          latitude: request.latitude,
          longitude: request.longitude,
          idempotencyKey: request.idempotencyKey,
        }).catch(err => console.warn('[attendanceIngestionService] Fallback supervisor check-in notice:', err));

        // Trigger Airtel SMS notification asynchronously ONLY for accepted BIOMETRIC CHECK_IN
        if (source === 'BIOMETRIC') {
          biometricSmsNotificationService.handleBiometricCheckInAccepted({
            organizationId: orgId,
            employeeId: request.employeeId,
            punchId,
            attendanceDate: sessionDate,
            punchTime,
            deviceId: request.deviceId,
            deviceName: request.rawPayload?.deviceName,
            source: 'BIOMETRIC',
          }).catch(err => console.warn('[attendanceIngestionService] Biometric SMS enqueue notice:', err));
        }

        if (request.idempotencyKey) {
          this.idempotencyRegistry.set(request.idempotencyKey, result);
        }

        return result;
      }
    }

    // CHECK_OUT punch handling:
    // If existing check-out exists, check for rapid duplicate (< 5 mins):
    if (existing && existing.lastOutTime) {
      const lastOutMs = new Date(existing.lastOutTime).getTime();
      const currentPunchMs = new Date(punchTime).getTime();
      const elapsedSinceOut = !isNaN(lastOutMs) && !isNaN(currentPunchMs) ? (currentPunchMs - lastOutMs) / (1000 * 60) : 0;

      if (elapsedSinceOut < 5) {
        // Rapid duplicate check-out: suppress
        const res: AttendanceIngestionResult = {
          accepted: false,
          outcome: 'DUPLICATE_CHECK_OUT',
          reason: 'ATTENDANCE_SESSION_RECENT_CHECK_OUT',
          source,
          employee_id: request.employeeId,
          existing_source: existing.lastOutSource,
          existing_punch_time: existing.lastOutTime,
          attendance_session_id: sessionId,
          attendance_date: sessionDate,
          user_message: `Check-out already recorded at ${this.formatDisplayTime(existing.lastOutTime)}.`,
        };
        if (request.idempotencyKey) {
          this.idempotencyRegistry.set(request.idempotencyKey, res);
        }
        return res;
      }
    }

    if (existing) {
      existing.lastOutSource = source;
      existing.lastOutTime = punchTime;
      this.localSessions.set(sessionKey, existing);
    } else {
      this.localSessions.set(sessionKey, {
        sessionId,
        sessionDate,
        checkInSource: source,
        checkInTime: punchTime,
        lastOutSource: source,
        lastOutTime: punchTime,
      });
    }

    const punchId = `punch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const result: AttendanceIngestionResult = {
      accepted: true,
      outcome: 'ACCEPTED',
      reason: 'CHECK_OUT_ACCEPTED',
      source,
      employee_id: request.employeeId,
      punch_id: punchId,
      attendance_session_id: sessionId,
      attendance_date: sessionDate,
      existing_punch_time: existing?.checkInTime,
      existing_source: existing?.checkInSource,
      user_message: `Check-out recorded successfully at ${this.formatDisplayTime(punchTime)} via ${this.formatChannelName(source)}.`,
    };

    this.recordAuditLog({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      organizationId: orgId,
      employeeId: request.employeeId,
      source,
      punchType: 'CHECK_OUT',
      verificationMode: mode,
      idempotencyKey: request.idempotencyKey,
      deviceId: request.deviceId,
      eventTimestamp: punchTime,
      receivedAt: new Date().toISOString(),
      accepted: true,
      outcome: 'ACCEPTED',
      reason: 'CHECK_OUT_ACCEPTED',
      rawPayload: request.rawPayload,
    });

    // Trigger Supervisor In-App and Remote Push Notifications across all sources
    attendanceNotificationService.handleAttendanceEventAccepted({
      organizationId: orgId,
      punchId,
      employeeId: request.employeeId,
      eventType: 'attendance.check_out.accepted',
      punchType: 'CHECK_OUT',
      source,
      punchTime,
      deviceId: request.deviceId,
      deviceName: request.rawPayload?.deviceName,
      latitude: request.latitude,
      longitude: request.longitude,
      idempotencyKey: request.idempotencyKey,
    }).catch(err => console.warn('[attendanceIngestionService] Fallback supervisor check-out notice:', err));

    if (source === 'BIOMETRIC') {
      biometricSmsNotificationService.handleBiometricCheckOutAccepted({
        organizationId: orgId,
        employeeId: request.employeeId,
        punchId,
        attendanceDate: sessionDate,
        punchTime,
        deviceId: request.deviceId,
        deviceName: request.rawPayload?.deviceName,
        source: 'BIOMETRIC',
        checkInTime: existing?.checkInTime,
      }).catch(err => console.warn('[attendanceIngestionService] Biometric check-out SMS enqueue notice:', err));
    }

    if (request.idempotencyKey) {
      this.idempotencyRegistry.set(request.idempotencyKey, result);
    }

    return result;
  }

  private recordAuditLog(entry: IngestionAuditLogEntry) {
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 500) {
      this.auditLogs = this.auditLogs.slice(0, 500);
    }
  }

  public getDiagnosticLogs(organizationId?: string, employeeId?: string): IngestionAuditLogEntry[] {
    return this.auditLogs.filter(l => {
      if (organizationId && l.organizationId !== organizationId) return false;
      if (employeeId && l.employeeId !== employeeId) return false;
      return true;
    });
  }

  public clearState() {
    this.localSessions.clear();
    this.idempotencyRegistry.clear();
    this.auditLogs = [];
  }
}

export const attendanceIngestionService = new AttendanceIngestionService();
