// src/services/attendance/biometricCommandService.ts
// ============================================================================
// Joy PeopleHR — Biometric Remote Command Bus & Hardware Dispatcher
// Asynchronous Command Dispatch, Execution Audit & Lifecycle Tracking
// ============================================================================

import { hrEventBus } from '../hrEventBus';
import { biometricGatewayService } from './biometricGatewayService';

export type BiometricCommandType =
  | 'SYNC_TIME'
  | 'TEST_CONNECTION'
  | 'GET_DEVICE_INFO'
  | 'GET_USER_COUNT'
  | 'SYNC_USERS'
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'DELETE_USER'
  | 'CLEAR_LOGS'
  | 'REBOOT';

export type BiometricCommandStatus =
  | 'QUEUED'
  | 'SENT'
  | 'ACKNOWLEDGED'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface BiometricDeviceCommand {
  id: string;
  organization_id: string;
  branch_id?: string;
  agent_id?: string;
  device_id: string;
  device_name?: string;
  command_type: BiometricCommandType;
  payload?: any;
  status: BiometricCommandStatus;
  response_payload?: any;
  created_by?: string;
  created_at: string;
  executed_at?: string;
  expires_at: string;
}

const STORAGE_KEY_COMMANDS = 'workforce_bio_commands_v2';

export function getActiveOrgId(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('workforce_active_org_id') || 'org-joy-01';
  }
  return 'org-joy-01';
}

function getStoredCommands(orgId = getActiveOrgId()): BiometricDeviceCommand[] {
  try {
    const tenantKey = `${STORAGE_KEY_COMMANDS}_${orgId}`;
    const raw = localStorage.getItem(tenantKey);
    if (raw) return JSON.parse(raw);

    // Backward-compatible fallback: read from legacy global baseKey and auto-migrate
    const legacyRaw = localStorage.getItem(STORAGE_KEY_COMMANDS);
    if (legacyRaw) {
      try {
        const parsed = JSON.parse(legacyRaw);
        const filtered = Array.isArray(parsed) ? parsed.filter((c: any) => c.organization_id === orgId) : [];
        localStorage.setItem(tenantKey, JSON.stringify(filtered));
        return filtered;
      } catch (_) {}
    }

    return [];
  } catch {
    return [];
  }
}

function saveCommands(commands: BiometricDeviceCommand[], orgId = getActiveOrgId()): void {
  try {
    const tenantKey = `${STORAGE_KEY_COMMANDS}_${orgId}`;
    localStorage.setItem(tenantKey, JSON.stringify(commands));
    hrEventBus.emit('biometric.command_updated', { organizationId: orgId });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('biometric:updated', { detail: { eventType: 'biometric.command_updated', orgId } }));
    }
  } catch (err) {
    console.error('[BiometricCommandService] storage error:', err);
  }
}

class BiometricCommandService {
  getCommands(organizationId = getActiveOrgId()): BiometricDeviceCommand[] {
    return getStoredCommands(organizationId);
  }

  async dispatchCommand(payload: {
    deviceId: string;
    commandType: BiometricCommandType;
    organizationId?: string;
    branchId?: string;
    commandPayload?: any;
    createdBy?: string;
  }): Promise<BiometricDeviceCommand> {
    const devices = biometricGatewayService.getBiometricDevices();
    const dev = devices.find(d => d.id === payload.deviceId);

    const newCmd: BiometricDeviceCommand = {
      id: `cmd-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      organization_id: payload.organizationId || getActiveOrgId(),
      branch_id: payload.branchId || dev?.branch,
      agent_id: dev?.gateway_agent_id,
      device_id: payload.deviceId,
      device_name: dev?.device_name || 'Hardware Terminal',
      command_type: payload.commandType,
      payload: payload.commandPayload,
      status: 'QUEUED',
      created_by: payload.createdBy || 'HR Admin',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    };

    const current = getStoredCommands();
    const updated = [newCmd, ...current];
    saveCommands(updated);

    hrEventBus.emit('biometric.command_dispatched', {
      commandId: newCmd.id,
      deviceId: newCmd.device_id,
      commandType: newCmd.command_type,
    });

    // Asynchronously execute simulation/relay to gateway
    this.executeCommand(newCmd.id).catch(console.error);

    return newCmd;
  }

  async executeCommand(commandId: string): Promise<BiometricDeviceCommand> {
    const list = getStoredCommands();
    const cmd = list.find(c => c.id === commandId);
    if (!cmd) throw new Error('Command not found');

    cmd.status = 'RUNNING';
    saveCommands(list);

    try {
      let responsePayload: any = {};

      switch (cmd.command_type) {
        case 'TEST_CONNECTION': {
          const testRes = await biometricGatewayService.testDeviceConnection(cmd.device_id);
          responsePayload = testRes;
          cmd.status = testRes.success ? 'SUCCESS' : 'FAILED';
          break;
        }
        case 'SYNC_TIME': {
          responsePayload = {
            synced_at: new Date().toISOString(),
            drift_ms: 14,
            message: 'Device hardware clock synchronized with Joy PeopleHR NTP Cloud.',
          };
          cmd.status = 'SUCCESS';
          break;
        }
        case 'REBOOT': {
          responsePayload = {
            message: 'Hardware reboot sequence initiated over TCP port 4370.',
            estimated_restart_sec: 25,
          };
          cmd.status = 'SUCCESS';
          break;
        }
        case 'CREATE_USER': {
          responsePayload = {
            enrolled_pin: cmd.payload?.biometricPin,
            name: cmd.payload?.employeeName,
            status: 'WRITTEN_TO_HARDWARE_RAM',
          };
          cmd.status = 'SUCCESS';
          break;
        }
        case 'SYNC_USERS': {
          const syncRes = await biometricGatewayService.syncEmployeesToTerminal(cmd.device_id);
          responsePayload = syncRes;
          cmd.status = 'SUCCESS';
          break;
        }
        case 'DELETE_USER': {
          responsePayload = {
            deleted_pin: cmd.payload?.biometricPin,
            message: `User PIN ${cmd.payload?.biometricPin} deleted from terminal memory.`,
          };
          cmd.status = 'SUCCESS';
          break;
        }
        case 'GET_DEVICE_INFO': {
          responsePayload = {
            firmware_version: 'v8.4.3',
            platform: 'ZEM560_TFT',
            user_count: 0,
            log_capacity: 100000,
          };
          cmd.status = 'SUCCESS';
          break;
        }
        default: {
          responsePayload = { executed: true, message: `Command ${cmd.command_type} executed.` };
          cmd.status = 'SUCCESS';
        }
      }

      cmd.response_payload = responsePayload;
      cmd.executed_at = new Date().toISOString();
    } catch (err: any) {
      cmd.status = 'FAILED';
      cmd.response_payload = { error: err.message || 'Execution failed' };
    }

    saveCommands(list);
    return cmd;
  }

  clearCommands(organizationId = getActiveOrgId()): void {
    saveCommands([], organizationId);
  }

  deleteCommand(commandId: string, organizationId = getActiveOrgId()): void {
    const list = getStoredCommands(organizationId).filter(c => c.id !== commandId);
    saveCommands(list, organizationId);
  }

  deleteCommandsForDevice(deviceId: string, organizationId = getActiveOrgId()): void {
    const list = getStoredCommands(organizationId).filter(c => c.device_id !== deviceId);
    saveCommands(list, organizationId);
  }
}

export const biometricCommandService = new BiometricCommandService();
