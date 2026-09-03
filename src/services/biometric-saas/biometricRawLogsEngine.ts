// ============================================================
// Joy PeopleHR — Biometric Raw Logs & Attendance Processor Engine
// ============================================================
// Enforces the strict 2-tier architecture:
// raw device logs -> deduplication / validation -> employee attendance
// ============================================================

export interface BiometricRawLogRecord {
  id: string;
  organizationId: string;
  deviceId: string;
  deviceUserId: string;
  punchTime: string; // ISO 8601
  verificationType: 'FACE' | 'FINGERPRINT' | 'CARD' | 'PASSWORD' | 'UNKNOWN';
  punchDirection: 'IN' | 'OUT' | 'AUTO';
  rawPayload?: Record<string, any>;
  processedStatus: 'PENDING' | 'PROCESSED' | 'DEDUPLICATED' | 'UNRESOLVED_EMPLOYEE' | 'FAILED';
  processedAt?: string;
  receivedAt: string;
}

export interface ProcessedAttendanceOutput {
  attendanceId: string;
  organizationId: string;
  employeeId: string;
  punchTime: string;
  punchType: 'CHECK_IN' | 'CHECK_OUT';
  sourceDeviceId: string;
  verificationMode: string;
  processedAt: string;
}

export class BiometricRawLogsEngine {
  private static rawLogsStore: Map<string, BiometricRawLogRecord> = new Map();
  private static processedAttendance: ProcessedAttendanceOutput[] = [];

  /**
   * Stage 1: Ingest raw log into biometric_raw_logs table with UNIQUE constraint
   * UNIQUE(device_id, device_user_id, punch_time)
   */
  public static ingestRawLog(params: {
    organizationId: string;
    deviceId: string;
    deviceUserId: string;
    punchTime: string;
    verificationType: 'FACE' | 'FINGERPRINT' | 'CARD' | 'PASSWORD';
    punchDirection?: 'IN' | 'OUT' | 'AUTO';
    rawPayload?: Record<string, any>;
  }): { record: BiometricRawLogRecord; isDuplicate: boolean } {
    const uniqueKey = `${params.deviceId}_${params.deviceUserId}_${params.punchTime}`;

    if (this.rawLogsStore.has(uniqueKey)) {
      const existing = this.rawLogsStore.get(uniqueKey)!;
      return { record: existing, isDuplicate: true };
    }

    const newLog: BiometricRawLogRecord = {
      id: `raw_log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      organizationId: params.organizationId,
      deviceId: params.deviceId,
      deviceUserId: params.deviceUserId,
      punchTime: params.punchTime,
      verificationType: params.verificationType,
      punchDirection: params.punchDirection || 'AUTO',
      rawPayload: params.rawPayload,
      processedStatus: 'PENDING',
      receivedAt: new Date().toISOString(),
    };

    this.rawLogsStore.set(uniqueKey, newLog);
    return { record: newLog, isDuplicate: false };
  }

  /**
   * Stage 2: Asynchronous Attendance Processor
   * biometric_raw_logs -> attendance_processor -> employee_attendance
   */
  public static processPendingLogs(
    userResolver: (orgId: string, pin: string) => string | undefined
  ): {
    processedCount: number;
    unresolvedCount: number;
    outputs: ProcessedAttendanceOutput[];
  } {
    let processed = 0;
    let unresolved = 0;
    const newOutputs: ProcessedAttendanceOutput[] = [];

    for (const log of this.rawLogsStore.values()) {
      if (log.processedStatus !== 'PENDING') continue;

      const employeeId = userResolver(log.organizationId, log.deviceUserId);
      if (!employeeId) {
        log.processedStatus = 'UNRESOLVED_EMPLOYEE';
        unresolved++;
        continue;
      }

      const out: ProcessedAttendanceOutput = {
        attendanceId: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        organizationId: log.organizationId,
        employeeId,
        punchTime: log.punchTime,
        punchType: log.punchDirection === 'OUT' ? 'CHECK_OUT' : 'CHECK_IN',
        sourceDeviceId: log.deviceId,
        verificationMode: log.verificationType,
        processedAt: new Date().toISOString(),
      };

      log.processedStatus = 'PROCESSED';
      log.processedAt = new Date().toISOString();
      this.processedAttendance.push(out);
      newOutputs.push(out);
      processed++;
    }

    return {
      processedCount: processed,
      unresolvedCount: unresolved,
      outputs: newOutputs,
    };
  }

  public static getRawLogs(): BiometricRawLogRecord[] {
    return Array.from(this.rawLogsStore.values());
  }

  public static getProcessedAttendance(): ProcessedAttendanceOutput[] {
    return this.processedAttendance;
  }
}
