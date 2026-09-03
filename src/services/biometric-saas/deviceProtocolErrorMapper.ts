// src/services/biometric-saas/deviceProtocolErrorMapper.ts
// ============================================================================
// Joy PeopleHR — Device Protocol Error & Response Mapping Engine V5
// Handles Raw Return Codes (e.g. Return=-1002, Return=0, Return=-1) with Zero Ambiguity
// ============================================================================

export type ProtocolResponseStatus =
  | 'SUCCESS'
  | 'UNSUPPORTED_REMOTE_COMMAND'
  | 'DEVICE_BUSY'
  | 'COMMUNICATION_TIMEOUT'
  | 'PARAMETER_ERROR'
  | 'MEMORY_FULL'
  | 'DUPLICATE_RECORD'
  | 'AUTH_FAILED'
  | 'UNKNOWN_RESPONSE';

export interface MappedProtocolResponse {
  rawCode: number | string;
  status: ProtocolResponseStatus;
  isCommandDelivered: boolean;
  isEnrollmentComplete: boolean;
  userFacingMessage: string;
  technicalDetails: string;
  recommendedAction: string;
}

export class DeviceProtocolErrorMapper {
  /**
   * Maps ADMS / iClock / TCP return codes to strict enterprise response semantics
   * 
   * CRITICAL PRODUCTION RULE:
   * Return=0 means Command Delivered & Stored in Command Log.
   * Return=0 DOES NOT MEAN Biometric Template Verified!
   */
  public static mapReturnCode(
    commandType: string,
    rawCode: number | string,
    rawResponse?: string
  ): MappedProtocolResponse {
    const numericCode = typeof rawCode === 'number' ? rawCode : parseInt(String(rawCode), 10);

    // 1. Success (Command Delivered / Executed)
    if (numericCode === 0) {
      return {
        rawCode,
        status: 'SUCCESS',
        isCommandDelivered: true,
        isEnrollmentComplete: commandType === 'DATA_USER_CARD' || commandType === 'DATA_USER_PIN',
        userFacingMessage:
          commandType === 'DATA_USER'
            ? 'Employee identity provisioned successfully on terminal.'
            : 'Device command executed successfully.',
        technicalDetails: `Terminal acknowledged command '${commandType}' with Return=0.`,
        recommendedAction: 'Proceed to biometric template registration.',
      };
    }

    // 2. Return = -1002 (Unsupported Remote Command / Feature Not in Firmware)
    if (numericCode === -1002) {
      return {
        rawCode,
        status: 'UNSUPPORTED_REMOTE_COMMAND',
        isCommandDelivered: true,
        isEnrollmentComplete: false,
        userFacingMessage:
          'This terminal firmware does not support remote sensor triggering for this modality. Switched to Device-Assisted flow.',
        technicalDetails: `Terminal returned Return=-1002 for command '${commandType}'. Feature not exposed in device firmware.`,
        recommendedAction: 'Use Device-Assisted enrollment (register directly via terminal screen/camera).',
      };
    }

    // 3. Return = -1 (Generic Device Error / Syntax Failure)
    if (numericCode === -1) {
      return {
        rawCode,
        status: 'PARAMETER_ERROR',
        isCommandDelivered: true,
        isEnrollmentComplete: false,
        userFacingMessage: 'Terminal rejected command syntax or parameters.',
        technicalDetails: `Terminal returned Return=-1 for command '${commandType}'.`,
        recommendedAction: 'Check PIN length, encoding, and user parameter constraints.',
      };
    }

    // 4. Return = -2 (Device Busy / Capture in Progress)
    if (numericCode === -2) {
      return {
        rawCode,
        status: 'DEVICE_BUSY',
        isCommandDelivered: true,
        isEnrollmentComplete: false,
        userFacingMessage: 'Terminal is currently busy processing another scan.',
        technicalDetails: `Terminal returned Return=-2. Hardware sensor lock is occupied.`,
        recommendedAction: 'Wait 3 seconds and retry.',
      };
    }

    // 5. Return = -1001 (Memory Full / Capacity Exceeded)
    if (numericCode === -1001) {
      return {
        rawCode,
        status: 'MEMORY_FULL',
        isCommandDelivered: true,
        isEnrollmentComplete: false,
        userFacingMessage: 'Terminal biometric template memory is full.',
        technicalDetails: `Terminal returned Return=-1001. Hardware slot limit reached.`,
        recommendedAction: 'De-provision inactive employees or upgrade terminal capacity.',
      };
    }

    return {
      rawCode,
      status: 'UNKNOWN_RESPONSE',
      isCommandDelivered: false,
      isEnrollmentComplete: false,
      userFacingMessage: `Terminal returned response code: ${rawCode}`,
      technicalDetails: `Unrecognized return code '${rawCode}' for command '${commandType}'. Raw: ${rawResponse || ''}`,
      recommendedAction: 'Inspect device system logs and verify firmware version.',
    };
  }
}
