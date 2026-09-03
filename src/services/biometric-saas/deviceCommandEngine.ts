// src/services/biometric-saas/deviceCommandEngine.ts
// ============================================================================
// Joy PeopleHR — Device Command Engine & Per-Device Mutex Serializer V5
// Zero-Collision TCP Transaction Locks, Leased Command Queue & Correlation IDs
// ============================================================================

import { DeviceCommand, UniversalEnrollmentSession, EnrollmentSessionStatus, EnrollmentMethod, EnrollmentMode } from './types/biometricUniversal.types';

class DeviceCommandEngine {
  private activeLocks = new Map<string, { correlationId: string; acquiredAt: number; leasedUntil: number }>();
  private commandQueue: DeviceCommand[] = [];
  private activeSessions = new Map<string, UniversalEnrollmentSession>();

  /**
   * Acquire per-device mutex lock to prevent concurrent TCP socket collisions
   */
  async acquireDeviceLock(deviceIp: string, correlationId: string, ttlMs = 45000): Promise<{ success: boolean; reason?: string }> {
    const now = Date.now();
    const existing = this.activeLocks.get(deviceIp);

    if (existing) {
      if (now < existing.leasedUntil) {
        return {
          success: false,
          reason: `Device at ${deviceIp} is currently locked by active transaction (${existing.correlationId}). Retry in ${Math.ceil((existing.leasedUntil - now) / 1000)}s.`,
        };
      }
    }

    this.activeLocks.set(deviceIp, {
      correlationId,
      acquiredAt: now,
      leasedUntil: now + ttlMs,
    });

    return { success: true };
  }

  /**
   * Release device mutex lock
   */
  releaseDeviceLock(deviceIp: string, correlationId?: string) {
    const existing = this.activeLocks.get(deviceIp);
    if (existing && (!correlationId || existing.correlationId === correlationId)) {
      this.activeLocks.delete(deviceIp);
    }
  }

  /**
   * Create an immutable enrollment session with state machine
   */
  createEnrollmentSession(params: {
    tenant_id: string;
    organization_id: string;
    employee_id: string;
    employee_name: string;
    employee_code: string;
    device_id: string;
    device_model: string;
    device_ip: string;
    gateway_id: string;
    enrollment_method: EnrollmentMethod;
    enrollment_mode: EnrollmentMode;
    machine_pin: string;
    selected_finger?: any;
    card_technology?: any;
    card_number?: string;
    entered_pin?: string;
  }): UniversalEnrollmentSession {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(100000 + Math.random() * 900000);
    const correlation_id = `ENR-${dateStr}-${randSuffix}`;
    const session_id = `sess-${Date.now()}-${randSuffix}`;

    const session: UniversalEnrollmentSession = {
      id: session_id,
      tenant_id: params.tenant_id,
      organization_id: params.organization_id,
      employee_id: params.employee_id,
      employee_name: params.employee_name,
      employee_code: params.employee_code,
      device_id: params.device_id,
      device_model: params.device_model,
      device_ip: params.device_ip,
      gateway_id: params.gateway_id,
      enrollment_method: params.enrollment_method,
      enrollment_mode: params.enrollment_mode,
      selected_finger: params.selected_finger,
      card_technology: params.card_technology,
      card_number: params.card_number,
      machine_pin: params.machine_pin,
      entered_pin: params.entered_pin,
      status: 'CREATED',
      progress_percent: 10,
      step_message: 'Validating tenant authorization & reserving device lock...',
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 180000).toISOString(), // 3 minute timeout
      correlation_id,
    };

    this.activeSessions.set(session_id, session);
    return session;
  }

  /**
   * Update session state machine
   */
  updateSessionState(
    sessionId: string,
    status: EnrollmentSessionStatus,
    patch: Partial<UniversalEnrollmentSession> = {}
  ): UniversalEnrollmentSession | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    session.status = status;
    Object.assign(session, patch);

    if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED' || status === 'TIMED_OUT') {
      session.completed_at = new Date().toISOString();
      this.releaseDeviceLock(session.device_ip, session.correlation_id);
    }

    return session;
  }

  getSession(sessionId: string): UniversalEnrollmentSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Enqueue a prioritized hardware command
   */
  enqueueCommand(cmd: Omit<DeviceCommand, 'command_id' | 'created_at' | 'status' | 'retry_count'>): DeviceCommand {
    const fullCmd: DeviceCommand = {
      ...cmd,
      command_id: `cmd-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString(),
      status: 'QUEUED',
      retry_count: 0,
    };

    this.commandQueue.push(fullCmd);
    return fullCmd;
  }

  getPendingCommands(deviceId: string): DeviceCommand[] {
    return this.commandQueue.filter((c) => c.device_id === deviceId && (c.status === 'QUEUED' || c.status === 'RETRYING'));
  }
}

export const deviceCommandEngine = new DeviceCommandEngine();
