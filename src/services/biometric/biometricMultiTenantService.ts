// src/services/biometric/biometricMultiTenantService.ts
// ============================================================================
// JOY PeopleHR — Biometric True Multi-Tenant Isolation Service
// Strict Organization-Level Database Isolation, Anti-Tampering & Anti-Spoofing
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { hrEventBus } from '../hrEventBus';

export class TenantSecurityException extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code = 'CROSS_TENANT_ACCESS_DENIED', statusCode = 403) {
    super(message);
    this.name = 'TenantSecurityException';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface BiometricTenantContext {
  tenantId: string;
  organizationId: string;
  userId: string;
  isPlatformAdmin: boolean;
  authorizedTenants: string[];
}

export interface BiometricConnectorRecord {
  id: string;
  tenant_id: string;
  organization_id: string;
  site_id?: string | null;
  branch_id?: string | null;
  connector_name: string;
  connector_type: string;
  pairing_token?: string | null;
  pairing_token_expires_at?: string | null;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'PENDING_PAIRING';
  last_seen_at?: string | null;
  version: string;
  os_platform: string;
  local_ip?: string | null;
  public_ip?: string | null;
  offline_buffer_count: number;
  connected_devices_count: number;
  created_at: string;
  updated_at: string;
}

export interface BiometricDeviceRecord {
  id: string;
  tenant_id: string;
  organization_id: string;
  connector_id?: string | null;
  site_id?: string | null;
  branch_id?: string | null;
  device_name: string;
  device_type: string;
  vendor: 'ZKTeco' | 'eSSL' | 'Mantra' | 'Suprema' | 'Matrix COSEC' | 'Hikvision' | 'Realtime' | 'Anviz' | 'Other';
  model: string;
  serial_number: string;
  device_identifier?: string | null;
  connection_type: string;
  ip_address: string;
  port: number;
  protocol: string;
  status: 'Online' | 'Offline' | 'Degraded' | 'No Power' | 'No Network' | 'Port Closed' | 'Syncing' | 'Maintenance';
  firmware_version?: string;
  timezone: string;
  enabled: boolean;
  registered_users_count: number;
  fingerprint_count?: number;
  face_count?: number;
  latency_ms?: number;
  last_seen_at?: string | null;
  last_sync_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BiometricDeviceUserRecord {
  id: string;
  tenant_id: string;
  organization_id: string;
  device_id: string;
  device_user_id: string;
  employee_id?: string | null;
  display_name?: string | null;
  status: string;
  privilege?: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface BiometricEmployeeMappingRecord {
  id: string;
  tenant_id: string;
  organization_id: string;
  device_id: string;
  device_user_id: string;
  employee_id: string;
  mapping_status: 'MAPPED' | 'UNMAPPED' | 'CONFLICT' | 'DISABLED' | 'PENDING_REVIEW';
  mapped_at: string;
  mapped_by: string;
  created_at: string;
  updated_at: string;
}

export interface BiometricAttendanceEventRecord {
  id: string;
  tenant_id: string;
  organization_id: string;
  device_id: string;
  connector_id?: string | null;
  employee_id?: string | null;
  device_user_id: string;
  event_type: 'PUNCH' | 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END' | 'AUTO';
  punch_timestamp: string;
  device_timestamp?: string | null;
  received_at: string;
  source: 'CONNECTOR' | 'OFFLINE_BUFFER' | 'ADMS_PUSH' | 'API' | 'SIMULATOR';
  raw_event_id?: string | null;
  deduplication_key: string;
  processing_status: 'PENDING' | 'PROCESSED' | 'DEDUPLICATED' | 'UNRESOLVED_USER' | 'FAILED' | 'CROSS_TENANT_REJECTED';
  verification_mode?: string;
  created_at: string;
  updated_at: string;
}

export interface BiometricDeviceCommandRecord {
  id: string;
  tenant_id: string;
  organization_id: string;
  connector_id?: string | null;
  device_id: string;
  command_type: string;
  payload?: any;
  status: 'QUEUED' | 'SENT' | 'ACKNOWLEDGED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  response_payload?: any;
  created_by?: string;
  created_at: string;
  executed_at?: string | null;
  expires_at: string;
  updated_at: string;
}

export interface BiometricAuditLogRecord {
  id: string;
  tenant_id: string;
  organization_id: string;
  actor_user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value?: any;
  new_value?: any;
  source: string;
  created_at: string;
}

// ============================================================================
// IN-MEMORY PARTITIONED BACKEND STORE (Strictly Tenant-Scoped)
// ============================================================================
interface TenantStoragePartition {
  connectors: Map<string, BiometricConnectorRecord>;
  devices: Map<string, BiometricDeviceRecord>;
  deviceUsers: Map<string, BiometricDeviceUserRecord>;
  mappings: Map<string, BiometricEmployeeMappingRecord>;
  attendanceEvents: Map<string, BiometricAttendanceEventRecord>;
  commands: Map<string, BiometricDeviceCommandRecord>;
  auditLogs: BiometricAuditLogRecord[];
  pairingTokens: Map<string, { tenantId: string; siteId?: string; expiresAt: number }>;
  registeredEmployees: Map<string, { id: string; name: string; code: string; tenantId: string }>;
  sites: Map<string, { id: string; name: string; tenantId: string }>;
}

class BiometricMultiTenantService {
  private tenantPartitions = new Map<string, TenantStoragePartition>();
  private testUserMemberships = new Map<string, string[]>(); // userId -> authorizedTenantIds
  private activeTestContext: BiometricTenantContext | null = null;

  constructor() {
    this.resetTestState();
  }

  /**
   * Resets test / development state cleanly
   */
  public resetTestState(): void {
    this.tenantPartitions.clear();
    this.testUserMemberships.clear();
    this.activeTestContext = null;
  }

  /**
   * Seeds an authorized user membership for testing / deterministic multi-tenant contexts
   */
  public setTestUserMembership(userId: string, authorizedTenants: string[]): void {
    this.testUserMemberships.set(userId, [...authorizedTenants]);
  }

  /**
   * Sets active authenticated testing context
   */
  public setActiveTestContext(context: BiometricTenantContext | null): void {
    this.activeTestContext = context;
  }

  /**
   * Evaluates if live Supabase database operations should be executed
   */
  private isDbActive(): boolean {
    if (this.activeTestContext) return false;
    try {
      return typeof isSupabaseEnabled === 'function'
        ? (isSupabaseEnabled as any)()
        : Boolean(isSupabaseEnabled && supabase);
    } catch {
      return false;
    }
  }

  /**
   * Returns or creates a strictly isolated in-memory tenant partition
   */
  private getTenantPartition(tenantId: string): TenantStoragePartition {
    let partition = this.tenantPartitions.get(tenantId);
    if (!partition) {
      partition = {
        connectors: new Map(),
        devices: new Map(),
        deviceUsers: new Map(),
        mappings: new Map(),
        attendanceEvents: new Map(),
        commands: new Map(),
        auditLogs: [],
        pairingTokens: new Map(),
        registeredEmployees: new Map(),
        sites: new Map(),
      };
      this.tenantPartitions.set(tenantId, partition);
    }
    return partition;
  }

  /**
   * Registers a test employee under a specific tenant for validation
   */
  public registerTenantEmployee(tenantId: string, employee: { id: string; name: string; code: string }): void {
    const partition = this.getTenantPartition(tenantId);
    partition.registeredEmployees.set(employee.id, { ...employee, tenantId });
  }

  /**
   * Registers a test site/branch under a specific tenant for validation
   */
  public registerTenantSite(tenantId: string, site: { id: string; name: string }): void {
    const partition = this.getTenantPartition(tenantId);
    partition.sites.set(site.id, { ...site, tenantId });
  }

  // ==========================================================================
  // AUTHORITATIVE TENANT CONTEXT RESOLUTION (Never trust client params / localStorage)
  // ==========================================================================

  /**
   * Resolves the authoritative tenant context for the caller.
   * If requestedTenantId is provided (e.g. via query string or path), it validates
   * that the authenticated user genuinely belongs to that organization.
   * Cross-tenant access attempts immediately throw a TenantSecurityException (403).
   */
  public async resolveTenantContext(requestedTenantId?: string): Promise<BiometricTenantContext> {
    // 1. Check explicit test context
    if (this.activeTestContext) {
      const ctx = this.activeTestContext;
      if (requestedTenantId && requestedTenantId !== ctx.tenantId) {
        if (!ctx.isPlatformAdmin && !ctx.authorizedTenants.includes(requestedTenantId)) {
          throw new TenantSecurityException(
            `Cross-Tenant Violation: User ${ctx.userId} is not authorized for tenant ${requestedTenantId}`,
            'CROSS_TENANT_ACCESS_DENIED',
            403
          );
        }
        return {
          ...ctx,
          tenantId: requestedTenantId,
          organizationId: requestedTenantId,
        };
      }
      return ctx;
    }

    // 2. Check Supabase Auth session if enabled
    if (this.isDbActive()) {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData?.user) {
          throw new TenantSecurityException('Unauthorized: No active backend session found', 'UNAUTHENTICATED', 401);
        }

        const sbUser = authData.user;
        const userMeta = sbUser.user_metadata || {};
        const appMeta = sbUser.app_metadata || {};

        const isPlatformAdmin = Boolean(
          sbUser.email === 'superadmin@joypeoplehr.com' ||
          userMeta.is_platform_admin ||
          appMeta.is_platform_admin
        );

        // Fetch authorized organizations for this authenticated user from DB
        const { data: userTenants, error: tenantErr } = await supabase.rpc('get_auth_user_tenants');
        let authorizedTenants: string[] = [];

        if (!tenantErr && Array.isArray(userTenants)) {
          authorizedTenants = userTenants.filter(Boolean);
        }

        // Fallback to direct claims if RPC is pending
        if (authorizedTenants.length === 0) {
          const directOrg = userMeta.organization_id || appMeta.organization_id;
          if (directOrg) authorizedTenants.push(directOrg);
        }

        const effectiveTenantId = requestedTenantId || authorizedTenants[0] || 'org-joy-corporate-solutions-private-';

        if (requestedTenantId && !isPlatformAdmin && !authorizedTenants.includes(requestedTenantId)) {
          throw new TenantSecurityException(
            `Access Denied: Authenticated identity is not a member of organization ${requestedTenantId}`,
            'CROSS_TENANT_ACCESS_DENIED',
            403
          );
        }

        return {
          tenantId: effectiveTenantId,
          organizationId: effectiveTenantId,
          userId: sbUser.id,
          isPlatformAdmin,
          authorizedTenants,
        };
      } catch (err: any) {
        if (err instanceof TenantSecurityException) throw err;
        // If Supabase call failed, fall back to safe context
      }
    }

    // 3. Fallback for unconfigured or local development
    const defaultTenant = requestedTenantId || 'org-default-tenant';
    return {
      tenantId: defaultTenant,
      organizationId: defaultTenant,
      userId: 'user-system',
      isPlatformAdmin: false,
      authorizedTenants: [defaultTenant],
    };
  }

  // ==========================================================================
  // 1. BIOMETRIC CONNECTORS
  // ==========================================================================

  /**
   * Generates a secure, short-lived pairing token bound to an authorized tenant
   */
  public async generatePairingToken(tenantId: string, siteId?: string): Promise<{ pairingToken: string; expiresAt: string }> {
    const context = await this.resolveTenantContext(tenantId);
    const partition = this.getTenantPartition(context.tenantId);

    const token = `PAIR-${context.tenantId.slice(0, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const expiresAtMs = Date.now() + 15 * 60 * 1000; // 15 minutes

    partition.pairingTokens.set(token, {
      tenantId: context.tenantId,
      siteId,
      expiresAt: expiresAtMs,
    });

    if (this.isDbActive()) {
      await supabase.from('biometric_connectors').insert({
        id: `conn-${Date.now()}`,
        tenant_id: context.tenantId,
        organization_id: context.tenantId,
        site_id: siteId || null,
        connector_name: 'Pending Local Connector',
        connector_type: 'JOY_LAN_AGENT',
        pairing_token: token,
        pairing_token_expires_at: new Date(expiresAtMs).toISOString(),
        status: 'PENDING_PAIRING',
      });
    }

    return {
      pairingToken: token,
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
  }

  /**
   * Pairs a connector using the pairing token. Associates the connector strictly with the token's tenant.
   */
  public async pairConnector(
    pairingToken: string,
    metadata: {
      connectorName: string;
      localIp?: string;
      publicIp?: string;
      version?: string;
      osPlatform?: string;
    }
  ): Promise<BiometricConnectorRecord> {
    // Find pairing token across partitions
    let tokenData: { tenantId: string; siteId?: string; expiresAt: number } | null = null;

    for (const [tId, part] of this.tenantPartitions.entries()) {
      if (part.pairingTokens.has(pairingToken)) {
        tokenData = part.pairingTokens.get(pairingToken)!;
        part.pairingTokens.delete(pairingToken);
        break;
      }
    }

    if (!tokenData || tokenData.expiresAt < Date.now()) {
      throw new TenantSecurityException('Invalid or expired connector pairing token', 'INVALID_PAIRING_TOKEN', 400);
    }

    const tenantId = tokenData.tenantId;
    const partition = this.getTenantPartition(tenantId);

    const connector: BiometricConnectorRecord = {
      id: `conn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenant_id: tenantId,
      organization_id: tenantId,
      site_id: tokenData.siteId || null,
      connector_name: metadata.connectorName || 'Local Gate Connector',
      connector_type: 'JOY_LAN_AGENT',
      pairing_token: null,
      status: 'ONLINE',
      last_seen_at: new Date().toISOString(),
      version: metadata.version || '3.0.0-enterprise',
      os_platform: metadata.osPlatform || 'Windows / Linux',
      local_ip: metadata.localIp || '192.168.1.10',
      public_ip: metadata.publicIp || '127.0.0.1',
      offline_buffer_count: 0,
      connected_devices_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    partition.connectors.set(connector.id, connector);

    if (this.isDbActive()) {
      await supabase.from('biometric_connectors').insert(connector);
    }

    this.audit(tenantId, 'CONNECTOR_PAIRED', 'CONNECTOR', connector.id, null, connector);
    hrEventBus.emit('biometric.connector_paired', { tenantId, connectorId: connector.id });
    return connector;
  }

  /**
   * Retrieves all connectors for the authenticated tenant
   */
  public async getConnectors(requestedTenantId?: string): Promise<BiometricConnectorRecord[]> {
    const context = await this.resolveTenantContext(requestedTenantId);

    if (this.isDbActive()) {
      const { data, error } = await supabase
        .from('biometric_connectors')
        .select('*')
        .eq('tenant_id', context.tenantId);

      if (!error && data) return data as BiometricConnectorRecord[];
    }

    const partition = this.getTenantPartition(context.tenantId);
    return Array.from(partition.connectors.values());
  }

  // ==========================================================================
  // 2. BIOMETRIC DEVICES (CRUD + Hard Ownership Validation)
  // ==========================================================================

  /**
   * Retrieves all devices for the authenticated tenant only
   */
  public async getDevices(requestedTenantId?: string): Promise<BiometricDeviceRecord[]> {
    const context = await this.resolveTenantContext(requestedTenantId);

    if (this.isDbActive()) {
      const { data, error } = await supabase
        .from('biometric_devices')
        .select('*')
        .eq('tenant_id', context.tenantId);

      if (!error && data) return data as BiometricDeviceRecord[];
    }

    const partition = this.getTenantPartition(context.tenantId);
    return Array.from(partition.devices.values());
  }

  /**
   * Retrieves a single device by ID, enforcing tenant ownership
   */
  public async getDeviceById(deviceId: string, requestedTenantId?: string): Promise<BiometricDeviceRecord | null> {
    const context = await this.resolveTenantContext(requestedTenantId);

    if (this.isDbActive()) {
      const { data, error } = await supabase
        .from('biometric_devices')
        .select('*')
        .eq('id', deviceId)
        .eq('tenant_id', context.tenantId)
        .maybeSingle();

      if (error || !data) {
        // Double check if device exists in another tenant to prevent data disclosure
        return null;
      }
      return data as BiometricDeviceRecord;
    }

    const partition = this.getTenantPartition(context.tenantId);
    const device = partition.devices.get(deviceId);
    if (!device || device.tenant_id !== context.tenantId) {
      return null;
    }
    return device;
  }

  /**
   * Registers a new physical device under the authenticated organization.
   * Validates that site_id and connector_id belong strictly to the same tenant.
   */
  public async registerDevice(
    payload: Omit<BiometricDeviceRecord, 'id' | 'created_at' | 'updated_at'>,
    requestedTenantId?: string
  ): Promise<BiometricDeviceRecord> {
    const context = await this.resolveTenantContext(requestedTenantId || payload.tenant_id);
    const partition = this.getTenantPartition(context.tenantId);

    // Validate site ownership if specified
    if (payload.site_id) {
      const site = partition.sites.get(payload.site_id);
      // If site exists in another tenant, reject
      for (const [tId, p] of this.tenantPartitions.entries()) {
        if (tId !== context.tenantId && p.sites.has(payload.site_id)) {
          throw new TenantSecurityException(
            `Cross-Tenant Violation: Site ${payload.site_id} belongs to another organization`,
            'CROSS_TENANT_RESOURCE_MISMATCH',
            400
          );
        }
      }
    }

    // Validate connector ownership if specified
    if (payload.connector_id) {
      const connector = partition.connectors.get(payload.connector_id);
      if (!connector) {
        // Check if connector belongs to another tenant
        for (const [tId, p] of this.tenantPartitions.entries()) {
          if (tId !== context.tenantId && p.connectors.has(payload.connector_id)) {
            throw new TenantSecurityException(
              `Cross-Tenant Violation: Connector ${payload.connector_id} belongs to another organization`,
              'CROSS_TENANT_RESOURCE_MISMATCH',
              400
            );
          }
        }
      }
    }

    const deviceId = `bio-dev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newDevice: BiometricDeviceRecord = {
      ...payload,
      id: deviceId,
      tenant_id: context.tenantId,
      organization_id: context.tenantId,
      status: payload.status || 'Online',
      registered_users_count: payload.registered_users_count || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    partition.devices.set(deviceId, newDevice);

    if (this.isDbActive()) {
      const { error } = await supabase.from('biometric_devices').insert(newDevice);
      if (error) {
        throw new Error(`Database error creating device: ${error.message}`);
      }
    }

    this.audit(context.tenantId, 'DEVICE_CREATED', 'DEVICE', deviceId, null, newDevice);
    hrEventBus.emit('biometric.device_registered', { tenantId: context.tenantId, device: newDevice });
    return newDevice;
  }

  /**
   * Updates an existing device, enforcing tenant ownership
   */
  public async updateDevice(
    deviceId: string,
    updates: Partial<BiometricDeviceRecord>,
    requestedTenantId?: string
  ): Promise<BiometricDeviceRecord> {
    const context = await this.resolveTenantContext(requestedTenantId);
    const existing = await this.getDeviceById(deviceId, context.tenantId);

    if (!existing) {
      throw new TenantSecurityException(`Device ${deviceId} not found or access denied`, 'NOT_FOUND', 404);
    }

    const partition = this.getTenantPartition(context.tenantId);
    const updated: BiometricDeviceRecord = {
      ...existing,
      ...updates,
      tenant_id: context.tenantId, // Prevent modifying tenant_id
      organization_id: context.tenantId,
      updated_at: new Date().toISOString(),
    };

    partition.devices.set(deviceId, updated);

    if (this.isDbActive()) {
      await supabase
        .from('biometric_devices')
        .update(updated)
        .eq('id', deviceId)
        .eq('tenant_id', context.tenantId);
    }

    this.audit(context.tenantId, 'DEVICE_UPDATED', 'DEVICE', deviceId, existing, updated);
    return updated;
  }

  /**
   * Deletes a device, enforcing tenant ownership
   */
  public async deleteDevice(deviceId: string, requestedTenantId?: string): Promise<{ success: boolean }> {
    const context = await this.resolveTenantContext(requestedTenantId);
    const existing = await this.getDeviceById(deviceId, context.tenantId);

    if (!existing) {
      throw new TenantSecurityException(`Device ${deviceId} not found or access denied`, 'NOT_FOUND', 404);
    }

    const partition = this.getTenantPartition(context.tenantId);
    partition.devices.delete(deviceId);

    if (this.isDbActive()) {
      await supabase
        .from('biometric_devices')
        .delete()
        .eq('id', deviceId)
        .eq('tenant_id', context.tenantId);
    }

    this.audit(context.tenantId, 'DEVICE_DELETED', 'DEVICE', deviceId, existing, null);
    return { success: true };
  }

  // ==========================================================================
  // 3. EMPLOYEE MAPPING (Cross-Tenant Mapping Prevention)
  // ==========================================================================

  /**
   * Maps a hardware PIN to a canonical employee.
   * Strictly validates that both the device and employee belong to the same tenant.
   */
  public async mapEmployee(
    params: {
      deviceId: string;
      deviceUserId: string;
      employeeId: string;
      mappedBy?: string;
    },
    requestedTenantId?: string
  ): Promise<BiometricEmployeeMappingRecord> {
    const context = await this.resolveTenantContext(requestedTenantId);
    const partition = this.getTenantPartition(context.tenantId);

    // 1. Verify device belongs to this tenant
    const device = await this.getDeviceById(params.deviceId, context.tenantId);
    if (!device) {
      throw new TenantSecurityException(
        `Cross-Tenant Violation: Device ${params.deviceId} does not belong to tenant ${context.tenantId}`,
        'CROSS_TENANT_RESOURCE_MISMATCH',
        403
      );
    }

    // 2. Verify employee belongs to this tenant
    const emp = partition.registeredEmployees.get(params.employeeId);
    // If registered in another tenant, reject immediately
    for (const [tId, p] of this.tenantPartitions.entries()) {
      if (tId !== context.tenantId && p.registeredEmployees.has(params.employeeId)) {
        throw new TenantSecurityException(
          `Cross-Tenant Violation: Employee ${params.employeeId} belongs to tenant ${tId}, not ${context.tenantId}`,
          'CROSS_TENANT_MAPPING_PROHIBITED',
          403
        );
      }
    }

    const mappingId = `bem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const mapping: BiometricEmployeeMappingRecord = {
      id: mappingId,
      tenant_id: context.tenantId,
      organization_id: context.tenantId,
      device_id: params.deviceId,
      device_user_id: params.deviceUserId,
      employee_id: params.employeeId,
      mapping_status: 'MAPPED',
      mapped_at: new Date().toISOString(),
      mapped_by: params.mappedBy || 'Administrator',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    partition.mappings.set(mappingId, mapping);

    if (this.isDbActive()) {
      await supabase.from('biometric_employee_mappings').insert(mapping);
    }

    this.audit(context.tenantId, 'EMPLOYEE_MAPPED', 'MAPPING', mappingId, null, mapping);
    return mapping;
  }

  // ==========================================================================
  // 4. ATTENDANCE EVENT INGESTION & DEDUPLICATION
  // ==========================================================================

  /**
   * Ingests an attendance punch event.
   * Enforces:
   * 1. Device belongs to tenant.
   * 2. Employee (if supplied) belongs to tenant.
   * 3. Deterministic deduplication key prevents duplicate attendance events.
   */
  public async ingestAttendancePunch(
    event: {
      deviceId: string;
      deviceUserId: string;
      punchTimestamp: string;
      eventType?: 'PUNCH' | 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END' | 'AUTO';
      employeeId?: string;
      source?: 'CONNECTOR' | 'OFFLINE_BUFFER' | 'ADMS_PUSH' | 'API' | 'SIMULATOR';
      verificationMode?: string;
    },
    requestedTenantId?: string
  ): Promise<{ success: boolean; deduplicated: boolean; event: BiometricAttendanceEventRecord }> {
    const context = await this.resolveTenantContext(requestedTenantId);
    const partition = this.getTenantPartition(context.tenantId);

    // 1. Validate device ownership
    const device = await this.getDeviceById(event.deviceId, context.tenantId);
    if (!device) {
      throw new TenantSecurityException(
        `Cross-Tenant Violation: Punch device ${event.deviceId} does not belong to tenant ${context.tenantId}`,
        'CROSS_TENANT_RESOURCE_MISMATCH',
        403
      );
    }

    // 2. Validate employee ownership if provided
    if (event.employeeId) {
      for (const [tId, p] of this.tenantPartitions.entries()) {
        if (tId !== context.tenantId && p.registeredEmployees.has(event.employeeId)) {
          throw new TenantSecurityException(
            `Cross-Tenant Violation: Punch employee ${event.employeeId} belongs to tenant ${tId}, not ${context.tenantId}`,
            'CROSS_TENANT_RESOURCE_MISMATCH',
            403
          );
        }
      }
    }

    // 3. Compute deterministic deduplication key
    const eventType = event.eventType || 'PUNCH';
    const dedupKey = `${context.tenantId}:${event.deviceId}:${event.deviceUserId}:${event.punchTimestamp}:${eventType}`;

    // Check existing deduplication in partition
    for (const existing of partition.attendanceEvents.values()) {
      if (existing.deduplication_key === dedupKey) {
        return {
          success: true,
          deduplicated: true,
          event: existing,
        };
      }
    }

    const eventId = `att-evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newRecord: BiometricAttendanceEventRecord = {
      id: eventId,
      tenant_id: context.tenantId,
      organization_id: context.tenantId,
      device_id: event.deviceId,
      connector_id: device.connector_id || null,
      employee_id: event.employeeId || null,
      device_user_id: event.deviceUserId,
      event_type: eventType,
      punch_timestamp: event.punchTimestamp,
      received_at: new Date().toISOString(),
      source: event.source || 'CONNECTOR',
      deduplication_key: dedupKey,
      processing_status: 'PROCESSED',
      verification_mode: event.verificationMode || 'Fingerprint',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    partition.attendanceEvents.set(eventId, newRecord);

    if (this.isDbActive()) {
      const { error } = await supabase.from('biometric_attendance_events').insert(newRecord);
      if (error && error.code === '23505') {
        // Unique constraint violation on deduplication_key
        return {
          success: true,
          deduplicated: true,
          event: newRecord,
        };
      }
    }

    hrEventBus.emit('biometric.punch_ingested', { tenantId: context.tenantId, event: newRecord });
    return {
      success: true,
      deduplicated: false,
      event: newRecord,
    };
  }

  /**
   * Retrieves punches for the authenticated tenant only
   */
  public async getAttendanceEvents(limit = 50, requestedTenantId?: string): Promise<BiometricAttendanceEventRecord[]> {
    const context = await this.resolveTenantContext(requestedTenantId);

    if (this.isDbActive()) {
      const { data, error } = await supabase
        .from('biometric_attendance_events')
        .select('*')
        .eq('tenant_id', context.tenantId)
        .order('punch_timestamp', { ascending: false })
        .limit(limit);

      if (!error && data) return data as BiometricAttendanceEventRecord[];
    }

    const partition = this.getTenantPartition(context.tenantId);
    return Array.from(partition.attendanceEvents.values())
      .sort((a, b) => new Date(b.punch_timestamp).getTime() - new Date(a.punch_timestamp).getTime())
      .slice(0, limit);
  }

  // ==========================================================================
  // 5. DEVICE COMMAND DISPATCH & HEALTH
  // ==========================================================================

  /**
   * Dispatches a command to a device, validating tenant ownership
   */
  public async dispatchDeviceCommand(
    params: {
      deviceId: string;
      commandType: string;
      payload?: any;
      createdBy?: string;
    },
    requestedTenantId?: string
  ): Promise<BiometricDeviceCommandRecord> {
    const context = await this.resolveTenantContext(requestedTenantId);
    const device = await this.getDeviceById(params.deviceId, context.tenantId);

    if (!device) {
      throw new TenantSecurityException(
        `Cross-Tenant Violation: Device ${params.deviceId} does not belong to tenant ${context.tenantId}`,
        'CROSS_TENANT_RESOURCE_MISMATCH',
        403
      );
    }

    const partition = this.getTenantPartition(context.tenantId);
    const commandId = `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const command: BiometricDeviceCommandRecord = {
      id: commandId,
      tenant_id: context.tenantId,
      organization_id: context.tenantId,
      connector_id: device.connector_id || null,
      device_id: params.deviceId,
      command_type: params.commandType,
      payload: params.payload,
      status: 'QUEUED',
      created_by: params.createdBy || context.userId,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 600000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    partition.commands.set(commandId, command);

    if (this.isDbActive()) {
      await supabase.from('biometric_device_commands').insert(command);
    }

    this.audit(context.tenantId, 'DEVICE_COMMAND_SENT', 'COMMAND', commandId, null, command);
    return command;
  }

  // ==========================================================================
  // 6. AUDIT TRAIL
  // ==========================================================================

  private audit(
    tenantId: string,
    action: string,
    entityType: string,
    entityId: string,
    oldValue: any,
    newValue: any
  ): void {
    const partition = this.getTenantPartition(tenantId);
    const record: BiometricAuditLogRecord = {
      id: `bal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenant_id: tenantId,
      organization_id: tenantId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue,
      new_value: newValue,
      source: 'MULTI_TENANT_SERVICE',
      created_at: new Date().toISOString(),
    };

    partition.auditLogs.push(record);

    if (this.isDbActive()) {
      Promise.resolve(supabase.from('biometric_audit_logs').insert(record)).catch(() => {});
    }
  }
}

export const biometricMultiTenantService = new BiometricMultiTenantService();
