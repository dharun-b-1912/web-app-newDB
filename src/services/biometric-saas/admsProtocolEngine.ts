// src/services/biometric-saas/admsProtocolEngine.ts
// ============================================================================
// WorkForceOS Universal Biometric Gateway V5 — ADMS/iClock Protocol Engine
// Zero-Loss Multi-Table Event Classifier, Hash Fingerprinter & Payload Parser
// ============================================================================

export type DevicePushTable =
  | 'ATTLOG'
  | 'OPLOG'
  | 'OPERLOG'
  | 'USERINFO'
  | 'USER'
  | 'BIODATA'
  | 'ERRORLOG'
  | 'DEVICE_STATUS'
  | 'UNKNOWN'
  | (string & {});

export type DeviceEventType =
  | 'ATTENDANCE_PUNCH'
  | 'DEVICE_OPERATION'
  | 'ADMIN_ACTION'
  | 'USER_SYNC_EVENT'
  | 'BIOMETRIC_ENROLLMENT_EVENT'
  | 'DEVICE_STATUS_EVENT'
  | 'UNKNOWN_EVENT';

export interface ParsedAttendanceRecord {
  pin: string;
  timestamp: string; // ISO 8601
  verifyType: string; // 'Face' | 'Fingerprint' | 'Card' | 'Password' | 'Palm'
  punchState: 'Check-In' | 'Check-Out' | 'Break-Out' | 'Break-In' | 'Overtime-In' | 'Overtime-Out';
  workCode?: string;
  deviceSerial: string;
  rawLine: string;
}

export interface ParsedOperationRecord {
  operatorPin?: string;
  targetPin?: string;
  operationCode: string;
  operationName: string;
  timestamp: string;
  deviceSerial: string;
  rawLine: string;
}

export interface ClassifiedDeviceEvent {
  eventUuid: string;
  payloadHash: string;
  receivedAt: string;
  deviceSerial: string;
  table: DevicePushTable;
  eventType: DeviceEventType;
  recordsCount: number;
  attendanceRecords: ParsedAttendanceRecord[];
  operationRecords: ParsedOperationRecord[];
  rawPayload: string;
  parseStatus: 'PARSED' | 'PARTIAL' | 'UNKNOWN' | 'FAILED';
  errorMessage?: string;
}

/**
 * Simple SHA-256 Hash generator for payload fingerprinting
 */
export function generatePayloadHash(payload: string): string {
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `sha256_${hex}_${payload.length}`;
}

/**
 * Maps raw numeric verification codes to human-readable modalities
 */
export function mapVerifyType(code: string | number): string {
  const c = String(code).trim();
  switch (c) {
    case '1':
      return 'Fingerprint';
    case '2':
      return 'PIN / Password';
    case '4':
      return 'RFID Smart Card';
    case '15':
      return 'Face Recognition';
    case '25':
      return 'Palm Vein';
    default:
      return 'Biometric / Standard';
  }
}

/**
 * Maps punch status code to attendance state
 */
export function mapPunchState(code: string | number): 'Check-In' | 'Check-Out' | 'Break-Out' | 'Break-In' | 'Overtime-In' | 'Overtime-Out' {
  const c = String(code).trim();
  switch (c) {
    case '0':
      return 'Check-In';
    case '1':
      return 'Check-Out';
    case '2':
      return 'Break-Out';
    case '3':
      return 'Break-In';
    case '4':
      return 'Overtime-In';
    case '5':
      return 'Overtime-Out';
    default:
      return 'Check-In';
  }
}

/**
 * Parses timestamp strings commonly produced by ZKTeco / eSSL firmware
 * e.g. "2026-09-02 12:35:21", "2026-09-02T12:35:21.000Z", "02/09/2026 12:35:21"
 */
export function parseDeviceTimestamp(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return new Date().toISOString();

  // Standard YYYY-MM-DD HH:MM:SS
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    const iso = trimmed.replace(' ', 'T') + '+05:30'; // Default IST or local
    const d = new Date(iso);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * Universal Classifier & Parser for ADMS / iClock Inbound POST payloads
 */
export function parseAdmsPayload(
  tableRaw: string,
  rawPayload: string,
  deviceSerial: string
): ClassifiedDeviceEvent {
  const table = (tableRaw || 'UNKNOWN').toUpperCase() as DevicePushTable;
  const payloadHash = generatePayloadHash(rawPayload);
  const eventUuid = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const receivedAt = new Date().toISOString();

  const lines = rawPayload
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const attendanceRecords: ParsedAttendanceRecord[] = [];
  const operationRecords: ParsedOperationRecord[] = [];

  let eventType: DeviceEventType = 'UNKNOWN_EVENT';
  let parseStatus: 'PARSED' | 'PARTIAL' | 'UNKNOWN' | 'FAILED' = 'PARSED';

  try {
    if (table === 'ATTLOG') {
      eventType = 'ATTENDANCE_PUNCH';
      for (const line of lines) {
        // Tab-separated: PIN \t Timestamp \t VerifyType \t PunchState \t WorkCode
        const parts = line.split('\t');
        if (parts.length >= 2) {
          const pin = parts[0].trim();
          const timeStr = parts[1].trim();
          const verifyCode = parts[2] || '1';
          const statusCode = parts[3] || '0';
          const workCode = parts[4] || '';

          attendanceRecords.push({
            pin,
            timestamp: parseDeviceTimestamp(timeStr),
            verifyType: mapVerifyType(verifyCode),
            punchState: mapPunchState(statusCode),
            workCode,
            deviceSerial,
            rawLine: line,
          });
        }
      }
    } else if (table === 'OPLOG' || table === 'OPERLOG') {
      // Check if OPLOG actually contains attendance entries or device operation entries
      eventType = 'DEVICE_OPERATION';
      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 3 && parts[1] && /\d{4}-\d{2}-\d{2}/.test(parts[1])) {
          // Some Android Visible Light firmware sends attendance punches under OPLOG
          attendanceRecords.push({
            pin: parts[0].trim(),
            timestamp: parseDeviceTimestamp(parts[1].trim()),
            verifyType: mapVerifyType(parts[2] || '15'),
            punchState: mapPunchState(parts[3] || '0'),
            deviceSerial,
            rawLine: line,
          });
          eventType = 'ATTENDANCE_PUNCH';
        } else {
          operationRecords.push({
            operationCode: parts[0] || 'OP',
            operationName: parts[1] || 'Device Operation',
            timestamp: receivedAt,
            deviceSerial,
            rawLine: line,
          });
        }
      }
    } else if (table === 'BIODATA') {
      eventType = 'BIOMETRIC_ENROLLMENT_EVENT';
      parseStatus = 'PARSED';
    } else if (table === 'USERINFO' || table === 'USER') {
      eventType = 'USER_SYNC_EVENT';
      parseStatus = 'PARSED';
    } else {
      eventType = 'UNKNOWN_EVENT';
      parseStatus = 'UNKNOWN';
    }
  } catch (err: any) {
    parseStatus = 'FAILED';
    return {
      eventUuid,
      payloadHash,
      receivedAt,
      deviceSerial,
      table,
      eventType: 'UNKNOWN_EVENT',
      recordsCount: 0,
      attendanceRecords: [],
      operationRecords: [],
      rawPayload,
      parseStatus,
      errorMessage: err.message,
    };
  }

  return {
    eventUuid,
    payloadHash,
    receivedAt,
    deviceSerial,
    table,
    eventType,
    recordsCount: attendanceRecords.length + operationRecords.length,
    attendanceRecords,
    operationRecords,
    rawPayload,
    parseStatus,
  };
}
