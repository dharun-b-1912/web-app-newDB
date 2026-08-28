// src/lib/biometric/zktecoStandaloneSdk.ts
// ============================================================================
// Joy PeopleHR — ZKTeco Standalone SDK & Push Protocol Binary Engine
// Compliant with official ZKTeco Standalone SDK & Push/ADMS Communication Specs
// ============================================================================

export const ZK_COMMANDS = {
  // Connection & Session
  CMD_CONNECT: 1000,
  CMD_EXIT: 1001,
  CMD_ENABLEDEVICE: 1008,
  CMD_DISABLEDEVICE: 1007,
  CMD_RESTART: 1004,
  CMD_POWEROFF: 1005,
  CMD_SLEEP: 1006,

  // Device Info & Clock
  CMD_GET_TIME: 201,
  CMD_SET_TIME: 202,
  CMD_GET_VERSION: 1100,
  CMD_DEVICE_STATUS: 1010,
  CMD_GET_OPTIONS: 11,

  // User Management
  CMD_USER_RRQ: 9,
  CMD_USERTEMP_RRQ: 9,
  CMD_SET_USER_INFO: 8,
  CMD_DELETE_USER: 18,
  CMD_DELETE_USERTEMP: 19,

  // Attendance Records & Real-Time Events
  CMD_ATTLOG_RRQ: 500,
  CMD_CLEAR_ATTLOG: 501,
  CMD_CLEAR_DATA: 503,
  CMD_REG_EVENT: 500,

  // Acknowledgements & Returns
  CMD_ACK_OK: 2000,
  CMD_ACK_ERROR: 2001,
  CMD_ACK_DATA: 2002,
  CMD_ACK_RETRY: 2003,
  CMD_ACK_REPEAT: 2004,
  CMD_ACK_UNAUTH: 2005,
} as const;

export interface ZkAttendanceRecord {
  user_pin: string;
  verify_type: number; // 0: Password, 1: Fingerprint, 2: Card, 15: Face
  verify_mode_str: 'Password' | 'Fingerprint' | 'RFID Card' | 'Face' | 'Unknown';
  in_out_state: number; // 0: Check-In, 1: Check-Out, 2: Break-Out, 3: Break-In, 4: OT-In, 5: OT-Out
  in_out_state_str: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_OUT' | 'BREAK_IN' | 'OVERTIME_IN' | 'OVERTIME_OUT' | 'AUTO';
  timestamp_iso: string;
  work_code: number;
}

export interface ZkDeviceInfo {
  firmware_version: string;
  serial_number: string;
  device_name: string;
  mac_address: string;
  platform: string;
  user_count: number;
  fingerprint_count: number;
  face_count: number;
  attendance_count: number;
  log_capacity: number;
}

export class ZkTecoStandaloneProtocol {
  /**
   * Calculates 16-bit 1's complement checksum for ZKTeco binary packet
   */
  static createChecksum(buffer: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i += 2) {
      if (i + 1 < buffer.length) {
        sum += buffer[i] + (buffer[i + 1] << 8);
      } else {
        sum += buffer[i];
      }
      while (sum > 0xffff) {
        sum = (sum & 0xffff) + (sum >> 16);
      }
    }
    return ~sum & 0xffff;
  }

  /**
   * Decodes ZKTeco packed 32-bit timestamp bitfield into ISO 8601 string
   * Formula: (((year % 100) * 12 * 31 + ((month - 1) * 31) + day - 1) * (24 * 60 * 60) + (hour * 60 + minute) * 60 + second)
   */
  static decodeZkTime(rawTime: number): string {
    const second = rawTime % 60;
    rawTime = Math.floor(rawTime / 60);

    const minute = rawTime % 60;
    rawTime = Math.floor(rawTime / 60);

    const hour = rawTime % 24;
    rawTime = Math.floor(rawTime / 24);

    const day = (rawTime % 31) + 1;
    rawTime = Math.floor(rawTime / 31);

    const month = (rawTime % 12) + 1;
    rawTime = Math.floor(rawTime / 12);

    const year = Math.floor(rawTime + 2000);

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}.000Z`;
  }

  /**
   * Encodes Date into ZKTeco 32-bit packed timestamp bitfield
   */
  static encodeZkTime(date: Date): number {
    const year = date.getUTCFullYear() % 100;
    const month = date.getUTCMonth(); // 0-indexed
    const day = date.getUTCDate() - 1; // 0-indexed
    const hour = date.getUTCHours();
    const minute = date.getUTCMinutes();
    const second = date.getUTCSeconds();

    return ((year * 12 * 31 + month * 31 + day) * 86400) + (hour * 3600 + minute * 60 + second);
  }

  /**
   * Resolves verify type code to human string
   */
  static resolveVerifyMode(mode: number): 'Password' | 'Fingerprint' | 'RFID Card' | 'Face' | 'Unknown' {
    switch (mode) {
      case 0:
        return 'Password';
      case 1:
        return 'Fingerprint';
      case 2:
        return 'RFID Card';
      case 15:
        return 'Face';
      default:
        return 'Fingerprint';
    }
  }

  /**
   * Resolves in/out status code to direction
   */
  static resolveInOutState(state: number): 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_OUT' | 'BREAK_IN' | 'OVERTIME_IN' | 'OVERTIME_OUT' | 'AUTO' {
    switch (state) {
      case 0:
        return 'CHECK_IN';
      case 1:
        return 'CHECK_OUT';
      case 2:
        return 'BREAK_OUT';
      case 3:
        return 'BREAK_IN';
      case 4:
        return 'OVERTIME_IN';
      case 5:
        return 'OVERTIME_OUT';
      default:
        return 'AUTO';
    }
  }

  /**
   * Parses standard Push / ADMS tab-separated ATTLOG payload
   * Format: PIN\tCHECKTIME\tSTATUS\tVERIFY\tWORKCODE\tRESERVED
   */
  static parseAdmsPushAttLog(rawPayload: string): ZkAttendanceRecord[] {
    const lines = rawPayload.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const records: ZkAttendanceRecord[] = [];

    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const pin = parts[0];
        const timeStr = parts[1]; // e.g. "2026-08-18 09:30:00"
        const status = parts[2] ? parseInt(parts[2], 10) : 0;
        const verify = parts[3] ? parseInt(parts[3], 10) : 1;
        const workcode = parts[4] ? parseInt(parts[4], 10) : 0;

        const isoDate = new Date(timeStr.replace(' ', 'T') + '+05:30').toISOString();

        records.push({
          user_pin: pin,
          verify_type: verify,
          verify_mode_str: this.resolveVerifyMode(verify),
          in_out_state: status,
          in_out_state_str: this.resolveInOutState(status),
          timestamp_iso: isoDate,
          work_code: workcode,
        });
      }
    }

    return records;
  }
}
