// src/services/platform/platformIntegrationsService.ts
// ============================================================
// WorkForceOS — Integration Control Center Unified Service
// ============================================================
// Production Architecture: Common Integration Adapter Framework
// COMMON PLATFORM ➔ INTEGRATION ADAPTER ➔ PROVIDER
// ============================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import {
  IntegrationEnvironment,
  IntegrationCategory,
  Integration,
  IntegrationConnection,
  IntegrationApiKey,
  OAuthApplication,
  BiometricDevice,
  DeviceGateway,
  WhatsAppAccount,
  MetaConnection,
  SyncJob,
  IntegrationLog,
  SecurityAlert,
  IntegrationMetrics,
  IntegrationProviderMeta,
  IntegrationStatus,
} from '../../types/integrations';
import { platformAuditService } from './platformAuditService';

// -------------------------------------------------------------
// Common Integration Adapter Interface
// -------------------------------------------------------------
export interface IntegrationAdapter<TConfig = any> {
  adapterKey: string;
  name: string;
  category: IntegrationCategory;
  testConnection(config: TConfig, env: IntegrationEnvironment): Promise<{
    success: boolean;
    latency_ms: number;
    message: string;
    details?: Record<string, any>;
  }>;
  sync?(config: TConfig, cursor?: string): Promise<{
    recordsProcessed: number;
    recordsFailed: number;
    durationMs: number;
    nextCursor?: string;
  }>;
  refreshToken?(config: TConfig): Promise<{
    newExpiresAt: string;
    refreshed: boolean;
  }>;
}

// -------------------------------------------------------------
// Provider Metadata Registry
// -------------------------------------------------------------
export const INTEGRATION_PROVIDERS_META: IntegrationProviderMeta[] = [
  {
    id: 'prov-whatsapp',
    name: 'WhatsApp Business Cloud API',
    provider_key: 'whatsapp_business',
    category: 'Communication',
    description: 'Official Meta Cloud API for candidate interviews, payslip broadcasts, and attendance OTPs.',
    icon_name: 'MessageSquare',
    supported_auth: ['OAuth 2.0', 'Client ID + Secret'],
    is_popular: true,
    required_permissions: ['whatsapp_business_messaging', 'whatsapp_business_management'],
    optional_permissions: ['read_analytics', 'manage_templates'],
  },
  {
    id: 'prov-meta',
    name: 'Meta / Facebook & Instagram',
    provider_key: 'meta_platform',
    category: 'Social',
    description: 'Connect Facebook Pages, Instagram DM, and Meta Lead Ads directly into WorkForce recruitment & HR.',
    icon_name: 'Share2',
    supported_auth: ['OAuth 2.0'],
    is_popular: true,
    required_permissions: ['pages_show_list', 'pages_read_engagement', 'leads_retrieval'],
    optional_permissions: ['instagram_basic', 'instagram_manage_messages'],
  },
  {
    id: 'prov-mantra',
    name: 'Mantra Biometrics Gateway',
    provider_key: 'mantra_biometrics',
    category: 'Workforce',
    description: 'Hardware adapter for Mantra MFS100, MAPRO, and Iris scanners deployed across factory gates.',
    icon_name: 'Fingerprint',
    supported_auth: ['Device Gateway Token', 'Mutual TLS Certificate'],
    is_popular: true,
    required_permissions: ['biometrics:sync', 'devices:heartbeat'],
    optional_permissions: ['firmware:push'],
  },
  {
    id: 'prov-essl',
    name: 'eSSL Attendance Fleet',
    provider_key: 'essl_fleet',
    category: 'Workforce',
    description: 'Multi-location eSSL biometric time-attendance and face recognition terminal controller.',
    icon_name: 'Clock',
    supported_auth: ['Device Gateway Token', 'API Key'],
    is_popular: true,
    required_permissions: ['attendance:pull_punches', 'device:status'],
    optional_permissions: ['user_template:sync'],
  },
  {
    id: 'prov-suprema',
    name: 'Suprema BioStar 2',
    provider_key: 'suprema_biostar',
    category: 'Workforce',
    description: 'High-security turnstile access control and multi-modal biometric readers for enterprise offices.',
    icon_name: 'Shield',
    supported_auth: ['Client ID + Secret', 'API Key'],
    required_permissions: ['access_control:manage', 'logs:read'],
    optional_permissions: ['emergency:lockdown'],
  },
  {
    id: 'prov-sendgrid',
    name: 'SendGrid Email Engine',
    provider_key: 'sendgrid_email',
    category: 'Communication',
    description: 'High-throughput transactional email delivery for offer letters, payroll PDFs, and security alerts.',
    icon_name: 'Mail',
    supported_auth: ['API Key'],
    is_popular: true,
    required_permissions: ['mail.send', 'templates.read'],
    optional_permissions: ['analytics.read'],
  },
  {
    id: 'prov-twilio',
    name: 'Twilio SMS & Voice Gateway',
    provider_key: 'twilio_sms',
    category: 'Communication',
    description: 'Global SMS carrier network for two-factor authentication and urgent workforce shift broadcasts.',
    icon_name: 'Phone',
    supported_auth: ['Client ID + Secret', 'API Key'],
    required_permissions: ['sms:send', 'messages:read'],
    optional_permissions: ['voice:call'],
  },
  {
    id: 'prov-slack',
    name: 'Slack Enterprise Grid Bot',
    provider_key: 'slack_bot',
    category: 'Communication',
    description: 'Interactive Slack notifications for leave approvals, expense sign-offs, and company celebrations.',
    icon_name: 'Hash',
    supported_auth: ['OAuth 2.0'],
    is_popular: true,
    required_permissions: ['chat:write', 'commands', 'users:read'],
    optional_permissions: ['channels:read'],
  },
  {
    id: 'prov-teams',
    name: 'Microsoft Teams Integration',
    provider_key: 'ms_teams',
    category: 'Communication',
    description: 'Azure AD SSO, Microsoft Graph sync, and Teams bot cards for employee self-service.',
    icon_name: 'Users',
    supported_auth: ['OAuth 2.0', 'Client ID + Secret'],
    required_permissions: ['User.Read', 'Chat.Create'],
    optional_permissions: ['Presence.Read'],
  },
  {
    id: 'prov-razorpay',
    name: 'Razorpay Enterprise Billing',
    provider_key: 'razorpay_billing',
    category: 'Finance',
    description: 'Recurring tenant subscriptions, corporate card billing, and automated payroll bank transfers in India.',
    icon_name: 'CreditCard',
    supported_auth: ['API Key', 'HMAC'],
    is_popular: true,
    required_permissions: ['subscriptions:charge', 'payouts:create'],
    optional_permissions: ['invoices:read'],
  },
  {
    id: 'prov-stripe',
    name: 'Stripe International Billing',
    provider_key: 'stripe_billing',
    category: 'Finance',
    description: 'Global multi-currency billing, automated tax filing, and customer portal webhooks.',
    icon_name: 'DollarSign',
    supported_auth: ['API Key', 'HMAC'],
    required_permissions: ['charges.write', 'customers.read'],
    optional_permissions: ['tax.calculate'],
  },
  {
    id: 'prov-sap',
    name: 'SAP S/4HANA ERP Bridge',
    provider_key: 'sap_s4hana',
    category: 'HR',
    description: 'Real-time two-way synchronization of employee master records, cost centers, and payroll ledger.',
    icon_name: 'Layers',
    supported_auth: ['OAuth 2.0', 'Mutual TLS Certificate', 'Basic Auth'],
    required_permissions: ['sap.personnel:read', 'sap.personnel:write'],
    optional_permissions: ['sap.financials:post'],
  },
  {
    id: 'prov-workday',
    name: 'Workday Core HR Sync',
    provider_key: 'workday_core',
    category: 'HR',
    description: 'Enterprise integration gateway bridging WorkForceOS attendance and field tracking into Workday.',
    icon_name: 'Briefcase',
    supported_auth: ['OAuth 2.0', 'Client ID + Secret'],
    required_permissions: ['Human_Resources:Read', 'Staffing:Write'],
    optional_permissions: ['Time_Tracking:Sync'],
  },
  {
    id: 'prov-gdrive',
    name: 'Google Workspace & Drive',
    provider_key: 'google_drive',
    category: 'Storage',
    description: 'Secure archiving of employee contracts, tax documents, and e-signed onboarding files.',
    icon_name: 'HardDrive',
    supported_auth: ['OAuth 2.0'],
    required_permissions: ['drive.file', 'userinfo.email'],
    optional_permissions: ['admin.directory.user.readonly'],
  },
  {
    id: 'prov-s3',
    name: 'AWS S3 Encrypted Storage',
    provider_key: 'aws_s3',
    category: 'Storage',
    description: 'Zero-knowledge AES-256 compliant cloud object store for biometric snapshots and audit trails.',
    icon_name: 'Database',
    supported_auth: ['Client ID + Secret', 'API Key'],
    required_permissions: ['s3:PutObject', 's3:GetObject'],
    optional_permissions: ['s3:ListBucket'],
  },
  {
    id: 'prov-rest-api',
    name: 'WorkForceOS REST Developer API',
    provider_key: 'rest_api_gateway',
    category: 'Developer',
    description: 'OpenAPI 3.1 RESTful platform gateway for third-party developer integrations and custom apps.',
    icon_name: 'Terminal',
    supported_auth: ['API Key', 'OAuth 2.0'],
    is_popular: true,
    required_permissions: ['platform:read'],
    optional_permissions: ['platform:write', 'platform:admin'],
  },
];

// -------------------------------------------------------------
// Initial Data Sets
// -------------------------------------------------------------
let initialIntegrations: Integration[] = [
  {
    id: 'int-01',
    provider_key: 'whatsapp_business',
    name: 'WhatsApp Business Cloud API',
    category: 'Communication',
    description: 'Meta Cloud API for employee alerts, attendance OTPs, and candidate notifications.',
    status: 'Connected',
    environment: 'Production',
    scope: 'Platform-wide',
    tenants_count: 84,
    health_score: 99,
    last_sync_at: '2 mins ago',
    auth_type: 'OAuth 2.0',
    webhook_url: 'https://api.workforceos.com/webhooks/whatsapp/live-pipe',
    webhook_status: 'Active',
    created_at: '2025-02-10T08:00:00Z',
    updated_at: '2026-08-14T09:30:00Z',
    config_summary: { business_id: 'meta_biz_882910', phone_numbers: 12, quality: 'High' },
  },
  {
    id: 'int-02',
    provider_key: 'meta_platform',
    name: 'Meta / Facebook & Instagram',
    category: 'Social',
    description: 'Facebook Pages, Instagram HR branding, and recruitment lead form sync.',
    status: 'Connected',
    environment: 'Production',
    scope: 'Platform-wide',
    tenants_count: 52,
    health_score: 98,
    last_sync_at: '6 mins ago',
    auth_type: 'OAuth 2.0',
    webhook_url: 'https://api.workforceos.com/webhooks/meta/recruitment',
    webhook_status: 'Active',
    created_at: '2025-03-15T10:00:00Z',
    updated_at: '2026-08-14T09:24:00Z',
    config_summary: { pages_connected: 48, ig_accounts: 31, lead_forms: 22 },
  },
  {
    id: 'int-03',
    provider_key: 'mantra_biometrics',
    name: 'Mantra Biometrics Gateway',
    category: 'Workforce',
    description: 'Local device agents and IoT gateway for factory gate biometric attendance.',
    status: 'Healthy',
    environment: 'Production',
    scope: 'Platform-wide',
    tenants_count: 68,
    health_score: 96,
    last_sync_at: '30 sec ago',
    auth_type: 'Device Gateway Token',
    webhook_status: 'Active',
    created_at: '2025-01-20T12:00:00Z',
    updated_at: '2026-08-14T09:44:00Z',
    config_summary: { devices_total: 124, online: 118, offline: 6 },
  },
  {
    id: 'int-04',
    provider_key: 'sendgrid_email',
    name: 'SendGrid Email Engine',
    category: 'Communication',
    description: 'Enterprise transactional email delivery for payslips, offers, and compliance notices.',
    status: 'Connected',
    environment: 'Production',
    scope: 'Platform-wide',
    tenants_count: 186,
    health_score: 100,
    last_sync_at: '1 min ago',
    auth_type: 'API Key',
    webhook_status: 'Active',
    created_at: '2024-11-01T08:00:00Z',
    updated_at: '2026-08-14T09:40:00Z',
    config_summary: { monthly_volume: '4.2M emails', delivery_rate: '99.94%' },
  },
  {
    id: 'int-05',
    provider_key: 'twilio_sms',
    name: 'Twilio SMS & Voice Gateway',
    category: 'Communication',
    description: 'Carrier SMS network for 2FA verification and urgent factory emergency broadcasts.',
    status: 'Degraded',
    environment: 'Production',
    scope: 'Platform-wide',
    tenants_count: 42,
    health_score: 78,
    last_sync_at: '14 mins ago',
    auth_type: 'API Key',
    webhook_status: 'Active',
    created_at: '2025-04-12T09:00:00Z',
    updated_at: '2026-08-14T08:15:00Z',
    error_message: 'Elevated carrier latency on Asia-Pacific routing cluster',
    config_summary: { balance_remaining: '$1,420.50', failure_rate: '4.8%' },
  },
  {
    id: 'int-06',
    provider_key: 'razorpay_billing',
    name: 'Razorpay Enterprise Billing',
    category: 'Finance',
    description: 'Automated subscription recurring charges, GST invoices, and vendor payouts.',
    status: 'Connected',
    environment: 'Production',
    scope: 'Platform-wide',
    tenants_count: 142,
    health_score: 100,
    last_sync_at: '5 mins ago',
    auth_type: 'API Key',
    webhook_url: 'https://api.workforceos.com/webhooks/razorpay/sync',
    webhook_status: 'Active',
    created_at: '2025-01-05T09:00:00Z',
    updated_at: '2026-08-14T09:10:00Z',
    config_summary: { active_mandates: 1840, monthly_processed: '₹4.8 Cr' },
  },
  {
    id: 'int-07',
    provider_key: 'sap_s4hana',
    name: 'SAP S/4HANA ERP Bridge',
    category: 'HR',
    description: 'Enterprise ERP synchronization for employee master records and general ledger payroll.',
    status: 'Authentication Required',
    environment: 'Production',
    scope: 'Tenant-specific',
    tenants_count: 14,
    health_score: 62,
    last_sync_at: '4 hours ago',
    auth_type: 'OAuth 2.0',
    webhook_status: 'Failing',
    created_at: '2025-06-18T14:00:00Z',
    updated_at: '2026-08-14T05:30:00Z',
    error_message: 'OAuth Client Certificate expired on Acme ERP gateway (Renew Required)',
  },
  {
    id: 'int-08',
    provider_key: 'slack_bot',
    name: 'Slack Enterprise Grid Bot',
    category: 'Communication',
    description: 'Daily birthday milestones, leave approval interactive buttons, and shift change alerts.',
    status: 'Connected',
    environment: 'Production',
    scope: 'Platform-wide',
    tenants_count: 76,
    health_score: 100,
    last_sync_at: '3 mins ago',
    auth_type: 'OAuth 2.0',
    webhook_status: 'Active',
    created_at: '2025-03-20T11:00:00Z',
    updated_at: '2026-08-14T09:40:00Z',
  },
];

let initialApiKeys: IntegrationApiKey[] = [
  {
    id: 'key-01',
    name: 'WorkForce Production Mobile Client Key',
    key_prefix: 'wk_live_9918',
    tenant_name: 'All Tenants (Platform)',
    scopes: ['employees:read', 'attendance:read', 'attendance:write', 'messages:send'],
    environment: 'Production',
    rate_limit_per_min: 2000,
    ip_restrictions: ['0.0.0.0/0'],
    created_by: 'Platform Lead Anand',
    created_at: '2025-08-01 10:00 AM',
    last_used_at: '2 mins ago',
    expires_at: '2027-08-01',
    status: 'Active',
  },
  {
    id: 'key-02',
    name: 'Acme Technologies SAP Ingestion Token',
    key_prefix: 'wk_live_4412',
    tenant_id: 'org-acme-01',
    tenant_name: 'Acme Technologies',
    scopes: ['employees:read', 'employees:write', 'payroll:read'],
    environment: 'Production',
    rate_limit_per_min: 1000,
    ip_restrictions: ['54.210.12.88', '54.210.12.89'],
    created_by: 'DevOps Lead Vikram',
    created_at: '2026-01-15 09:30 AM',
    last_used_at: '12 mins ago',
    expires_at: '2027-01-15',
    status: 'Active',
  },
  {
    id: 'key-03',
    name: 'Biometric Gateway Edge Agent Secret',
    key_prefix: 'wk_live_7710',
    tenant_name: 'Zenith Logistics',
    scopes: ['devices:read', 'devices:write', 'attendance:write'],
    environment: 'Production',
    rate_limit_per_min: 5000,
    ip_restrictions: ['103.44.120.10'],
    created_by: 'Super Admin',
    created_at: '2025-05-10 11:20 AM',
    last_used_at: 'Just now',
    expires_at: '2026-11-10',
    status: 'Active',
  },
  {
    id: 'key-04',
    name: 'Legacy Staging QA Automation Runner',
    key_prefix: 'wk_stg_0021',
    tenant_name: 'Staging Sandbox',
    scopes: ['platform:read'],
    environment: 'Staging',
    rate_limit_per_min: 500,
    created_by: 'QA Engineer Rohit',
    created_at: '2025-09-01 02:00 PM',
    last_used_at: '94 days ago', // Unused > 90 days!
    expires_at: '2026-09-01',
    status: 'Active',
  },
];

let initialOAuthApps: OAuthApplication[] = [
  {
    id: 'app-01',
    name: 'WorkForce Mobile App (iOS / Android)',
    client_id: 'wfos_app_client_mobile_9981',
    client_secret_masked: '••••••••••••••••33a1',
    redirect_uris: ['workforceos://oauth/callback', 'https://app.workforceos.com/oauth/callback'],
    allowed_scopes: ['openid', 'profile', 'email', 'attendance', 'leaves', 'payroll'],
    environment: 'Production',
    owner: 'WorkForce Mobile Team',
    status: 'Healthy',
    active_tokens_count: 14280,
    created_at: '2025-01-10',
    last_token_refresh_at: '1 min ago',
  },
  {
    id: 'app-02',
    name: 'SAP SuccessFactors Sync Connector',
    client_id: 'wfos_app_client_sap_4102',
    client_secret_masked: '••••••••••••••••77f2',
    redirect_uris: ['https://sap.acmecorp.com/workforce-oauth/token'],
    allowed_scopes: ['employees.read', 'payroll.read'],
    environment: 'Production',
    owner: 'Enterprise Solutions Group',
    status: 'Attention',
    active_tokens_count: 4,
    created_at: '2025-06-12',
    last_token_refresh_at: '6 days ago',
  },
  {
    id: 'app-03',
    name: 'WorkForce Copilot Assistant Slack App',
    client_id: 'wfos_app_client_slack_8819',
    client_secret_masked: '••••••••••••••••99c4',
    redirect_uris: ['https://slack.com/oauth/v2/workforceos-callback'],
    allowed_scopes: ['chat:write', 'commands', 'users:read'],
    environment: 'Production',
    owner: 'AI & Automation Team',
    status: 'Healthy',
    active_tokens_count: 76,
    created_at: '2025-04-18',
    last_token_refresh_at: '4 hours ago',
  },
];

let initialBiometricDevices: BiometricDevice[] = [
  {
    id: 'dev-01',
    tenant_id: 'org-acme-01',
    tenant_name: 'Acme Technologies',
    device_name: 'HQ Main Entrance Turnstile A',
    provider: 'Mantra',
    device_type: 'Fingerprint',
    ip_address: '192.168.10.42',
    gateway_id: 'gw-01',
    gateway_name: 'Acme BLR Campus Gateway Agent',
    status: 'Online',
    last_sync_at: '12 sec ago',
    enrolled_employees_count: 840,
    firmware_version: 'v4.2.1-SEC',
    location: 'Bengaluru Core Campus (North Lobby)',
    serial_number: 'MTR-MFS100-881920',
  },
  {
    id: 'dev-02',
    tenant_id: 'org-acme-01',
    tenant_name: 'Acme Technologies',
    device_name: 'HQ R&D Lab Facial Terminal',
    provider: 'Suprema',
    device_type: 'Face Recognition',
    ip_address: '192.168.10.45',
    gateway_id: 'gw-01',
    gateway_name: 'Acme BLR Campus Gateway Agent',
    status: 'Online',
    last_sync_at: '18 sec ago',
    enrolled_employees_count: 142,
    firmware_version: 'v2.8.0',
    location: 'Applied AI & Hardware Lab (Floor 3)',
    serial_number: 'SUP-FACESTATION-3312',
  },
  {
    id: 'dev-03',
    tenant_id: 'org-zenith-04',
    tenant_name: 'Zenith Logistics',
    device_name: 'Warehouse Gate 4 Biometric Punch',
    provider: 'eSSL',
    device_type: 'Fingerprint',
    ip_address: '10.200.4.18',
    gateway_id: 'gw-02',
    gateway_name: 'Zenith Logistics Hub Gateway',
    status: 'Offline',
    last_sync_at: '14 mins ago',
    enrolled_employees_count: 320,
    firmware_version: 'v3.1.9',
    location: 'Distribution Hub (Loading Bay 4)',
    serial_number: 'ESSL-X990-10928',
    error_message: 'Device offline: Local socket connection refused after hub network glitch',
  },
  {
    id: 'dev-04',
    tenant_id: 'org-tech-02',
    tenant_name: 'TechCorp Solutions',
    device_name: 'Pune Innovation Center Gate',
    provider: 'ZKTeco',
    device_type: 'Multi-Modal',
    ip_address: '172.16.8.102',
    gateway_id: 'gw-03',
    gateway_name: 'TechCorp Pune Gateway',
    status: 'Online',
    last_sync_at: '45 sec ago',
    enrolled_employees_count: 420,
    firmware_version: 'v5.0.2',
    location: 'Magarpatta Tech Park (Tower 4)',
    serial_number: 'ZK-SPEEDFACE-7721',
  },
];

let initialGateways: DeviceGateway[] = [
  {
    id: 'gw-01',
    tenant_id: 'org-acme-01',
    tenant_name: 'Acme Technologies',
    name: 'Acme BLR Campus Gateway Agent',
    agent_version: 'v2.4.1 (Linux Daemon)',
    status: 'Online',
    last_heartbeat_at: '4 sec ago',
    connected_devices_count: 8,
    local_ip: '192.168.10.5',
    server_endpoint: 'wss://devices.workforceos.com/gateway/gw-01',
    os_platform: 'Ubuntu 24.04 LTS (x86_64)',
  },
  {
    id: 'gw-02',
    tenant_id: 'org-zenith-04',
    tenant_name: 'Zenith Logistics',
    name: 'Zenith Logistics Hub Gateway',
    agent_version: 'v2.3.9 (Windows Service)',
    status: 'Degraded',
    last_heartbeat_at: '42 sec ago',
    connected_devices_count: 6,
    local_ip: '10.200.4.2',
    server_endpoint: 'wss://devices.workforceos.com/gateway/gw-02',
    os_platform: 'Windows Server 2022',
  },
];

let initialWhatsAppAccounts: WhatsAppAccount[] = [
  {
    id: 'wa-01',
    tenant_id: 'org-acme-01',
    tenant_name: 'Acme Technologies',
    business_account_id: 'waba_99182049102',
    phone_number_id: 'pn_1029384756',
    display_phone_number: '+91 80 4882 9900',
    status: 'Connected',
    verified_name: 'Acme Technologies HR',
    quality_rating: 'GREEN (High)',
    messages_today: 14280,
    delivered_pct: 99.4,
    failed_pct: 0.6,
    webhook_status: 'Healthy',
    last_activity_at: 'Just now',
    templates_count: 18,
  },
  {
    id: 'wa-02',
    tenant_id: 'org-tech-02',
    tenant_name: 'TechCorp Solutions',
    business_account_id: 'waba_44120981920',
    phone_number_id: 'pn_9918273645',
    display_phone_number: '+91 20 6712 4400',
    status: 'Connected',
    verified_name: 'TechCorp People Team',
    quality_rating: 'GREEN (High)',
    messages_today: 8420,
    delivered_pct: 98.8,
    failed_pct: 1.2,
    webhook_status: 'Healthy',
    last_activity_at: '3 mins ago',
    templates_count: 12,
  },
];

let initialMetaConnections: MetaConnection[] = [
  {
    id: 'meta-01',
    tenant_id: 'org-acme-01',
    tenant_name: 'Acme Technologies',
    page_id: 'page_acme_careers_official',
    page_name: 'Acme Technologies Careers & Life',
    instagram_account_id: 'ig_acmecorp_life',
    ig_handle: '@acmecorp_life',
    messenger_active: true,
    lead_forms_active: true,
    token_expires_in_days: 6, // Expiring soon!
    token_status: 'Expiring Soon',
    last_sync_at: '6 mins ago',
    webhook_status: 'Healthy',
  },
  {
    id: 'meta-02',
    tenant_id: 'org-tech-02',
    tenant_name: 'TechCorp Solutions',
    page_id: 'page_techcorp_jobs',
    page_name: 'TechCorp Global Talent Hub',
    messenger_active: true,
    lead_forms_active: true,
    token_expires_in_days: 54,
    token_status: 'Valid',
    last_sync_at: '12 mins ago',
    webhook_status: 'Healthy',
  },
];

let initialTenantConnections: IntegrationConnection[] = [
  {
    id: 'tc-01',
    integration_id: 'int-01',
    provider_key: 'whatsapp_business',
    tenant_id: 'org-acme-01',
    tenant_name: 'Acme Technologies',
    provider_account_id: 'waba_99182049102',
    status: 'Connected',
    auth_type: 'OAuth 2.0',
    environment: 'Production',
    last_sync_at: 'Just now',
    usage_summary: '14,280 msgs today • 99.4% delivered',
    created_at: '2025-02-12',
  },
  {
    id: 'tc-02',
    integration_id: 'int-03',
    provider_key: 'mantra_biometrics',
    tenant_id: 'org-acme-01',
    tenant_name: 'Acme Technologies',
    provider_account_id: 'gw-01',
    status: 'Healthy',
    auth_type: 'Device Gateway Token',
    environment: 'Production',
    last_sync_at: '12 sec ago',
    usage_summary: '8 devices online • 840 enrolled',
    created_at: '2025-01-22',
  },
  {
    id: 'tc-03',
    integration_id: 'int-05',
    provider_key: 'twilio_sms',
    tenant_id: 'org-zenith-04',
    tenant_name: 'Zenith Logistics',
    provider_account_id: 'AC_zenith_sms_9918',
    status: 'Degraded',
    auth_type: 'API Key',
    environment: 'Production',
    last_sync_at: '14 mins ago',
    usage_summary: '3,410 SMS today • 4.8% failure rate',
    created_at: '2025-04-15',
    error_details: 'Carrier latency spike on SMS route',
  },
  {
    id: 'tc-04',
    integration_id: 'int-07',
    provider_key: 'sap_s4hana',
    tenant_id: 'org-acme-01',
    tenant_name: 'Acme Technologies',
    provider_account_id: 'sap_acme_erp_gw',
    status: 'Authentication Required',
    auth_type: 'OAuth 2.0',
    environment: 'Production',
    last_sync_at: '4 hours ago',
    usage_summary: '0 records synced today (Blocked)',
    created_at: '2025-06-20',
    error_details: 'Mutual TLS Client Certificate expired',
  },
];

let initialSyncJobs: SyncJob[] = [
  {
    id: 'job-int-101',
    job_name: 'Mantra & eSSL Biometric Punch Sync Batch #9921',
    tenant_name: 'All Active Tenants (124 Devices)',
    integration_name: 'Mantra Biometrics Gateway',
    provider: 'mantra_biometrics',
    started_at: '30 sec ago',
    duration_sec: 4,
    records_processed: 482,
    status: 'Completed',
    retries_count: 0,
  },
  {
    id: 'job-int-102',
    job_name: 'WhatsApp Message Status & Delivery Receipts Poll',
    tenant_name: 'Acme Technologies',
    integration_name: 'WhatsApp Business Cloud API',
    provider: 'whatsapp_business',
    started_at: '2 mins ago',
    duration_sec: 8,
    records_processed: 1240,
    status: 'Completed',
    retries_count: 0,
  },
  {
    id: 'job-int-103',
    job_name: 'Meta Lead Ads Candidate Form Sync',
    tenant_name: 'Acme Technologies',
    integration_name: 'Meta / Facebook & Instagram',
    provider: 'meta_platform',
    started_at: '6 mins ago',
    duration_sec: 12,
    records_processed: 18,
    status: 'Completed',
    retries_count: 0,
  },
  {
    id: 'job-int-104',
    job_name: 'SAP S/4HANA Employee Master Two-Way Reconciliation',
    tenant_name: 'Acme Technologies',
    integration_name: 'SAP S/4HANA ERP Bridge',
    provider: 'sap_s4hana',
    started_at: '4 hours ago',
    duration_sec: 2,
    records_processed: 0,
    status: 'Failed',
    retries_count: 3,
    error_message: 'HTTP 401 Unauthorized: Client TLS Certificate expired',
  },
];

let initialLogs: IntegrationLog[] = [
  {
    id: 'log-01',
    timestamp: '14:32:04',
    tenant_name: 'Acme Technologies',
    provider: 'WhatsApp Business',
    event_type: 'webhook.received',
    severity: 'Normal',
    message: 'Processed 124 inbound message delivery status receipts (HTTP 200 OK)',
    request_id: 'req_wa_881920',
    actor: 'Meta Inbound Webhook Worker',
    http_status: 200,
    latency_ms: 68,
    environment: 'Production',
  },
  {
    id: 'log-02',
    timestamp: '14:29:45',
    tenant_name: 'Acme Technologies',
    provider: 'Mantra Biometrics',
    event_type: 'device.sync',
    severity: 'Normal',
    message: 'Synchronized 482 biometric punch records from 8 turnstiles in BLR campus',
    request_id: 'req_bio_331092',
    actor: 'Gateway Agent Daemon',
    http_status: 200,
    latency_ms: 112,
    environment: 'Production',
  },
  {
    id: 'log-03',
    timestamp: '14:26:12',
    tenant_name: 'Acme Technologies',
    provider: 'Meta Platform',
    event_type: 'oauth.token_refreshed',
    severity: 'Normal',
    message: 'Refreshed Page Access Token for @acmecorp_life via Graph API v20.0',
    request_id: 'req_meta_771829',
    actor: 'System Token Refresh Cron',
    http_status: 200,
    latency_ms: 340,
    environment: 'Production',
  },
  {
    id: 'log-04',
    timestamp: '14:21:00',
    tenant_name: 'Zenith Logistics',
    provider: 'Twilio SMS',
    event_type: 'sms.delivery_delayed',
    severity: 'Warning',
    message: 'Carrier handover timeout on Vodafone-Idea gateway (Latency 4,820ms)',
    request_id: 'req_twi_002918',
    actor: 'Twilio Dispatch Worker',
    http_status: 504,
    latency_ms: 4820,
    environment: 'Production',
  },
  {
    id: 'log-05',
    timestamp: '14:18:22',
    tenant_name: 'Acme Technologies',
    provider: 'SAP S/4HANA',
    event_type: 'auth.certificate_expired',
    severity: 'Error',
    message: 'Mutual TLS certificate expired. Connection rejected by upstream ERP gateway.',
    request_id: 'req_sap_991820',
    actor: 'SAP ERP Sync Worker',
    http_status: 401,
    latency_ms: 120,
    environment: 'Production',
  },
];

let initialSecurityAlerts: SecurityAlert[] = [
  {
    id: 'sec-01',
    severity: 'Warning',
    title: 'Meta Access Token Expires in 6 Days',
    description: 'OAuth long-lived token for Acme Careers Facebook Page will expire on 2026-08-20.',
    category: 'Expiring Token',
    affected_resource: 'Meta / Facebook & Instagram (Acme Technologies)',
    recommendation: 'Click Reconnect or allow automated OAuth token refresh in Meta Business Manager.',
    created_at: '2026-08-14 08:00 AM',
    status: 'Open',
  },
  {
    id: 'sec-02',
    severity: 'Critical',
    title: 'SAP S/4HANA TLS Certificate Expired',
    description: 'The mutual TLS certificate used to sign API requests to Acme SAP ERP has expired.',
    category: 'Weak Configuration',
    affected_resource: 'SAP S/4HANA ERP Bridge',
    recommendation: 'Rotate the client certificate in the Security tab and restart the bridge.',
    created_at: '2026-08-14 05:30 AM',
    status: 'Open',
  },
  {
    id: 'sec-03',
    severity: 'Warning',
    title: 'Unused Staging API Key Detected (> 90 Days)',
    description: 'Key wk_stg_0021 has not been used since 94 days ago and holds platform:read scopes.',
    category: 'Unused Key',
    affected_resource: 'Legacy Staging QA Automation Runner',
    recommendation: 'Revoke unused API keys to reduce attack surface.',
    created_at: '2026-08-14 06:00 AM',
    status: 'Open',
  },
];

// -------------------------------------------------------------
// Common Integration Adapters Registry
// -------------------------------------------------------------
export const COMMON_ADAPTERS_REGISTRY: Record<string, IntegrationAdapter> = {
  whatsapp_business: {
    adapterKey: 'whatsapp_business',
    name: 'WhatsApp Business Cloud API',
    category: 'Communication',
    async testConnection(_config, _env) {
      return {
        success: true,
        latency_ms: 114,
        message: 'Connected to Meta Graph API v19.0 endpoint. Webhook subscription verified.',
        details: { quality_rating: 'GREEN (High)', verified_name: 'WorkForceOS Verified' },
      };
    },
    async sync(_config) {
      return { recordsProcessed: 142, recordsFailed: 0, durationMs: 420 };
    },
  },
  meta_platform: {
    adapterKey: 'meta_platform',
    name: 'Meta / Facebook & Instagram',
    category: 'Social',
    async testConnection(_config, _env) {
      return {
        success: true,
        latency_ms: 98,
        message: 'Meta Marketing & Graph API handshake successful. Lead forms subscription active.',
      };
    },
  },
  mantra_biometrics: {
    adapterKey: 'mantra_biometrics',
    name: 'Mantra Biometrics Gateway',
    category: 'Workforce',
    async testConnection(_config, _env) {
      return {
        success: true,
        latency_ms: 45,
        message: 'Mantra Edge Gateway turnstile controller online. Hardware signature verified.',
      };
    },
    async sync(_config) {
      return { recordsProcessed: 482, recordsFailed: 0, durationMs: 680 };
    },
  },
  essl_fleet: {
    adapterKey: 'essl_fleet',
    name: 'eSSL Attendance Fleet',
    category: 'Workforce',
    async testConnection(_config, _env) {
      return {
        success: true,
        latency_ms: 54,
        message: 'eSSL SilkBio face recognition terminals synchronized over TCP port 4370.',
      };
    },
    async sync(_config) {
      return { recordsProcessed: 320, recordsFailed: 0, durationMs: 510 };
    },
  },
  sap_s4hana: {
    adapterKey: 'sap_s4hana',
    name: 'SAP S/4HANA ERP Bridge',
    category: 'HR',
    async testConnection(_config, _env) {
      return {
        success: false,
        latency_ms: 180,
        message: 'SAP S/4HANA OData v4 Mutual TLS certificate expired on upstream ERP gateway.',
      };
    },
    async sync(_config) {
      return { recordsProcessed: 0, recordsFailed: 1, durationMs: 180 };
    },
  },
  razorpay_billing: {
    adapterKey: 'razorpay_billing',
    name: 'Razorpay Enterprise Billing',
    category: 'Finance',
    async testConnection(_config, _env) {
      return {
        success: true,
        latency_ms: 82,
        message: 'RazorpayX banking & subscription webhook signature verified.',
      };
    },
  },
  sendgrid_email: {
    adapterKey: 'sendgrid_email',
    name: 'SendGrid Email Engine',
    category: 'Communication',
    async testConnection(_config, _env) {
      return {
        success: true,
        latency_ms: 64,
        message: 'SendGrid v3 REST API authenticated with 100% deliverability quota.',
      };
    },
  },
  twilio_sms: {
    adapterKey: 'twilio_sms',
    name: 'Twilio SMS & Voice Gateway',
    category: 'Communication',
    async testConnection(_config, _env) {
      return {
        success: true,
        latency_ms: 140,
        message: 'Twilio REST API reachable. Carrier route latency is within operational SLA.',
      };
    },
  },
  aws_s3_storage: {
    adapterKey: 'aws_s3_storage',
    name: 'AWS S3 Sovereign Storage',
    category: 'Storage',
    async testConnection(_config, _env) {
      return {
        success: true,
        latency_ms: 38,
        message: 'AWS S3 bucket ap-south-1 AES-256 server-side encryption validated.',
      };
    },
  },
};

// -------------------------------------------------------------
// Service Implementation
// -------------------------------------------------------------
export const platformIntegrationsService = {
  // --- Metrics ---
  getMetrics(env: IntegrationEnvironment = 'Production'): IntegrationMetrics {
    const envIntegrations = initialIntegrations.filter((i) => i.environment === env);
    const connectedCount = envIntegrations.filter((i) => i.status === 'Connected' || i.status === 'Healthy').length;
    const failedCount = envIntegrations.filter((i) => i.status === 'Failed' || i.status === 'Authentication Required').length;
    const attentionCount = envIntegrations.filter((i) => i.status === 'Degraded' || i.status === 'Expired').length;

    // Dynamic tenant count from connections
    const totalTenants = initialTenantConnections
      .filter((tc) => tc.environment === env)
      .reduce((set, tc) => set.add(tc.tenant_name), new Set<string>()).size;

    const openAlerts = initialSecurityAlerts.filter((s) => s.status === 'Open');

    return {
      total_connected: connectedCount,
      active_tenants: totalTenants > 0 ? totalTenants : envIntegrations.reduce((acc, i) => acc + (i.tenants_count || 0), 0),
      webhook_success_pct: 99.82,
      total_webhook_deliveries: 1248932,
      monthly_api_requests: '18.4M',
      monthly_api_requests_trend: 12.8,
      security_alerts_count: openAlerts.length,
      expiring_credentials_count: openAlerts.filter((a) => a.category === 'Expiring Token').length,
      engine_status: failedCount > 0 ? 'Incident' : attentionCount > 0 ? 'Degraded' : 'Healthy',
      attention_count: attentionCount,
      failed_count: failedCount,
    };
  },

  // --- Realtime WebSocket Channel Subscription ---
  subscribeToRealtimeChanges(callback: (status: 'connected' | 'reconnecting' | 'disconnected') => void): () => void {
    try {
      if (!isSupabaseEnabled) {
        callback('connected');
        return () => {};
      }

      const channel = supabase
        .channel('platform_integrations_realtime_stream')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'integration_connections' }, () => {
          callback('connected');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'integration_devices' }, () => {
          callback('connected');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'integration_sync_jobs' }, () => {
          callback('connected');
        })
        .subscribe((state) => {
          if (state === 'SUBSCRIBED') callback('connected');
          else if (state === 'TIMED_OUT' || state === 'CHANNEL_ERROR') callback('reconnecting');
          else if (state === 'CLOSED') callback('disconnected');
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      callback('connected');
      return () => {};
    }
  },

  // --- Integrations Registry ---
  getIntegrations(category?: string): Integration[] {
    if (category && category !== 'All') {
      return initialIntegrations.filter((i) => i.category === category);
    }
    return initialIntegrations;
  },

  getIntegrationById(id: string): Integration | undefined {
    return initialIntegrations.find((i) => i.id === id);
  },

  async createIntegration(data: Partial<Integration>): Promise<Integration> {
    const newInt: Integration = {
      id: `int-${Date.now().toString().slice(-4)}`,
      provider_key: data.provider_key || 'custom_api',
      name: data.name || 'New Integration',
      category: data.category || 'Developer',
      description: data.description || '',
      status: 'Connected',
      environment: data.environment || 'Production',
      scope: data.scope || 'Platform-wide',
      tenants_count: data.tenants_count || 1,
      health_score: 100,
      last_sync_at: 'Just now',
      auth_type: data.auth_type || 'API Key',
      webhook_url: data.webhook_url,
      webhook_status: data.webhook_url ? 'Active' : 'Not Configured',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      config_summary: data.config_summary || {},
    };

    initialIntegrations.unshift(newInt);

    await this.logAudit({
      action: 'INTEGRATION_CONNECTED',
      resource_type: 'Integration',
      resource_id: newInt.id,
      resource_name: newInt.name,
      reason: `Super Admin activated ${newInt.name} integration in ${newInt.environment}`,
    });

    return newInt;
  },

  async toggleIntegrationStatus(id: string, newStatus: IntegrationStatus): Promise<Integration> {
    const target = initialIntegrations.find((i) => i.id === id);
    if (!target) throw new Error('Integration not found');

    const prev = target.status;
    target.status = newStatus;
    target.updated_at = new Date().toISOString();

    await this.logAudit({
      action: `INTEGRATION_${newStatus.toUpperCase().replace(/\s+/g, '_')}`,
      resource_type: 'Integration',
      resource_id: target.id,
      resource_name: target.name,
      reason: `Changed status from ${prev} to ${newStatus}`,
    });

    return target;
  },

  async deleteIntegration(id: string): Promise<void> {
    const target = initialIntegrations.find((i) => i.id === id);
    if (!target) return;

    initialIntegrations = initialIntegrations.filter((i) => i.id !== id);

    await this.logAudit({
      action: 'INTEGRATION_REMOVED',
      resource_type: 'Integration',
      resource_id: id,
      resource_name: target.name,
      reason: `Super Admin permanently deleted ${target.name} integration`,
    });
  },

  // --- Live Connection Tester ---
  async testConnection(params: {
    provider_key: string;
    environment?: string;
  }): Promise<{
    success: boolean;
    checks: { name: string; status: 'Passed' | 'Failed'; latency_ms: number; message: string }[];
    total_latency_ms: number;
    health_score: number;
  }> {
    await new Promise((r) => setTimeout(r, 600));

    const isFailingProvider = params.provider_key === 'sap_s4hana' || params.provider_key === 'twilio_sms';

    const checks = [
      { name: '1. DNS Resolution & Host Reachability', status: 'Passed' as const, latency_ms: 14, message: 'Resolved gateway endpoint IP successfully.' },
      { name: '2. TLS 1.3 Handshake & Cipher Suite', status: isFailingProvider && params.provider_key === 'sap_s4hana' ? ('Failed' as const) : ('Passed' as const), latency_ms: 42, message: isFailingProvider && params.provider_key === 'sap_s4hana' ? 'Mutual TLS certificate expired on upstream.' : 'TLS handshake verified with strong cipher.' },
      { name: '3. Authentication & Credential Validation', status: isFailingProvider ? ('Failed' as const) : ('Passed' as const), latency_ms: 88, message: isFailingProvider ? 'OAuth token rejected (HTTP 401).' : 'Bearer token authorized by provider.' },
      { name: '4. Provider REST API Ping', status: isFailingProvider ? ('Failed' as const) : ('Passed' as const), latency_ms: 120, message: isFailingProvider ? 'Endpoint returned HTTP 401 Unauthorized.' : 'API returned HTTP 200 OK.' },
      { name: '5. Inbound Webhook Health & Signature', status: 'Passed' as const, latency_ms: 32, message: 'HMAC-SHA256 signature verified.' },
      { name: '6. Rate-Limit Headroom Availability', status: isFailingProvider && params.provider_key === 'twilio_sms' ? ('Failed' as const) : ('Passed' as const), latency_ms: 18, message: isFailingProvider && params.provider_key === 'twilio_sms' ? 'Elevated latency detected on SMS provider.' : 'Current quota: 88% capacity available.' },
    ];

    const hasFailed = checks.some((c) => c.status === 'Failed');
    const totalLatency = checks.reduce((acc, curr) => acc + curr.latency_ms, 0);

    return {
      success: !hasFailed,
      checks,
      total_latency_ms: totalLatency,
      health_score: hasFailed ? 62 : 100,
    };
  },

  // --- API Keys ---
  getApiKeys(): IntegrationApiKey[] {
    return initialApiKeys;
  },

  async createApiKey(data: {
    name: string;
    tenant_name?: string;
    scopes: string[];
    environment: IntegrationEnvironment;
    rate_limit_per_min?: number;
    ip_restrictions?: string[];
    expires_in_days?: number;
  }): Promise<{ key: IntegrationApiKey; rawSecret: string }> {
    const rawSecret = `wk_${data.environment === 'Production' ? 'live' : 'stg'}_${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const keyPrefix = rawSecret.slice(0, 12);

    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(now.getDate() + (data.expires_in_days || 365));

    const newKey: IntegrationApiKey = {
      id: `key-${Date.now().toString().slice(-4)}`,
      name: data.name,
      key_prefix: keyPrefix,
      tenant_name: data.tenant_name || 'All Tenants (Platform)',
      scopes: data.scopes,
      environment: data.environment,
      rate_limit_per_min: data.rate_limit_per_min || 1000,
      ip_restrictions: data.ip_restrictions || ['0.0.0.0/0'],
      created_by: 'WorkForce Super Admin',
      created_at: now.toISOString().replace('T', ' ').slice(0, 19),
      expires_at: expiresAt.toISOString().slice(0, 10),
      last_used_at: 'Never',
      status: 'Active',
    };

    initialApiKeys.unshift(newKey);

    await this.logAudit({
      action: 'API_KEY_CREATED',
      resource_type: 'ApiKey',
      resource_id: newKey.id,
      resource_name: newKey.name,
      reason: `Provisioned API key with ${data.scopes.length} granular scopes in ${data.environment}`,
    });

    return { key: newKey, rawSecret };
  },

  async rotateApiKey(id: string): Promise<{ key: IntegrationApiKey; rawSecret: string }> {
    const target = initialApiKeys.find((k) => k.id === id);
    if (!target) throw new Error('API key not found');

    const rawSecret = `wk_${target.environment === 'Production' ? 'live' : 'stg'}_${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    target.key_prefix = rawSecret.slice(0, 12);
    target.created_at = new Date().toISOString().replace('T', ' ').slice(0, 19);

    await this.logAudit({
      action: 'API_KEY_ROTATED',
      resource_type: 'ApiKey',
      resource_id: target.id,
      resource_name: target.name,
      reason: `Rotated credentials for API key ${target.name}`,
    });

    return { key: target, rawSecret };
  },

  async revokeApiKey(id: string): Promise<IntegrationApiKey> {
    const target = initialApiKeys.find((k) => k.id === id);
    if (!target) throw new Error('API key not found');

    target.status = 'Revoked';
    target.revoked_at = new Date().toISOString();

    await this.logAudit({
      action: 'API_KEY_REVOKED',
      resource_type: 'ApiKey',
      resource_id: target.id,
      resource_name: target.name,
      reason: `Revoked API key ${target.name}`,
    });

    return target;
  },

  // --- OAuth Apps ---
  getOAuthApps(): OAuthApplication[] {
    return initialOAuthApps;
  },

  async createOAuthApp(data: Partial<OAuthApplication>): Promise<OAuthApplication> {
    const newApp: OAuthApplication = {
      id: `app-${Date.now().toString().slice(-4)}`,
      name: data.name || 'New OAuth Application',
      client_id: `wfos_app_${Math.random().toString(36).slice(-8)}`,
      client_secret_masked: '••••••••••••••••' + Math.random().toString(36).slice(-4),
      redirect_uris: data.redirect_uris || ['https://example.com/callback'],
      allowed_scopes: data.allowed_scopes || ['openid', 'profile'],
      environment: data.environment || 'Production',
      owner: 'Platform Engineering',
      status: 'Healthy',
      active_tokens_count: 0,
      created_at: new Date().toISOString().slice(0, 10),
    };

    initialOAuthApps.unshift(newApp);

    await this.logAudit({
      action: 'OAUTH_APP_CREATED',
      resource_type: 'OAuthApplication',
      resource_id: newApp.id,
      resource_name: newApp.name,
      reason: `Registered OAuth 2.0 application ${newApp.name}`,
    });

    return newApp;
  },

  // --- Biometric Devices & Gateways ---
  getBiometricDevices(): BiometricDevice[] {
    return initialBiometricDevices;
  },

  getDeviceGateways(): DeviceGateway[] {
    return initialGateways;
  },

  async syncBiometricDevice(deviceId: string): Promise<BiometricDevice> {
    const dev = initialBiometricDevices.find((d) => d.id === deviceId);
    if (!dev) throw new Error('Device not found');

    dev.status = 'Syncing';
    await new Promise((r) => setTimeout(r, 600));
    dev.status = 'Online';
    dev.last_sync_at = 'Just now';
    dev.error_message = undefined;

    await this.logAudit({
      action: 'BIOMETRIC_DEVICE_SYNCED',
      resource_type: 'BiometricDevice',
      resource_id: dev.id,
      resource_name: dev.device_name,
      tenant_name: dev.tenant_name,
      reason: `Manual punch synchronization executed for device ${dev.device_name}`,
    });

    return dev;
  },

  async restartGatewayAgent(gatewayId: string): Promise<DeviceGateway> {
    const gw = initialGateways.find((g) => g.id === gatewayId);
    if (!gw) throw new Error('Gateway not found');

    gw.status = 'Online';
    gw.last_heartbeat_at = 'Just now';

    await this.logAudit({
      action: 'DEVICE_GATEWAY_RESTARTED',
      resource_type: 'DeviceGateway',
      resource_id: gw.id,
      resource_name: gw.name,
      tenant_name: gw.tenant_name,
      reason: `Super Admin triggered remote daemon restart on gateway agent ${gw.name}`,
    });

    return gw;
  },

  // --- Messaging & Social (WhatsApp & Meta) ---
  getWhatsAppAccounts(): WhatsAppAccount[] {
    return initialWhatsAppAccounts;
  },

  getMetaConnections(): MetaConnection[] {
    return initialMetaConnections;
  },

  async refreshMetaToken(connectionId: string): Promise<MetaConnection> {
    const target = initialMetaConnections.find((m) => m.id === connectionId);
    if (!target) throw new Error('Meta connection not found');

    target.token_expires_in_days = 60;
    target.token_status = 'Valid';
    target.last_sync_at = 'Just now';

    await this.logAudit({
      action: 'META_OAUTH_TOKEN_REFRESHED',
      resource_type: 'MetaConnection',
      resource_id: target.id,
      resource_name: target.page_name,
      tenant_name: target.tenant_name,
      reason: `Extended Graph API Page Access Token by 60 days for ${target.page_name}`,
    });

    return target;
  },

  // --- Tenant Connections ---
  getTenantConnections(): IntegrationConnection[] {
    return initialTenantConnections;
  },

  // --- Sync Jobs ---
  getSyncJobs(): SyncJob[] {
    return initialSyncJobs;
  },

  async triggerSyncJob(jobName: string, provider: string): Promise<SyncJob> {
    const newJob: SyncJob = {
      id: `job-int-${Date.now().toString().slice(-4)}`,
      job_name: jobName,
      tenant_name: 'All Active Tenants',
      integration_name: provider,
      provider: provider,
      started_at: 'Just now',
      duration_sec: 2,
      records_processed: Math.floor(Math.random() * 500) + 50,
      status: 'Completed',
      retries_count: 0,
    };

    initialSyncJobs.unshift(newJob);

    await this.logAudit({
      action: 'INTEGRATION_SYNC_JOB_TRIGGERED',
      resource_type: 'SyncJob',
      resource_id: newJob.id,
      resource_name: newJob.job_name,
      reason: `Manually triggered background synchronization job ${newJob.job_name}`,
    });

    return newJob;
  },

  // --- Logs & Events ---
  getLogs(): IntegrationLog[] {
    return initialLogs;
  },

  // --- Security Alerts ---
  getSecurityAlerts(): SecurityAlert[] {
    return initialSecurityAlerts;
  },

  async resolveSecurityAlert(alertId: string): Promise<void> {
    const alert = initialSecurityAlerts.find((a) => a.id === alertId);
    if (alert) {
      alert.status = 'Resolved';
      await this.logAudit({
        action: 'SECURITY_ALERT_RESOLVED',
        resource_type: 'SecurityAlert',
        resource_id: alert.id,
        resource_name: alert.title,
        reason: `Marked security recommendation as resolved: ${alert.title}`,
      });
    }
  },

  // --- Developer Tools: API Explorer ---
  async executeApiExplorer(params: {
    method: string;
    endpoint: string;
    headers?: Record<string, string>;
    body?: string;
  }): Promise<{
    http_status: number;
    latency_ms: number;
    response_headers: Record<string, string>;
    response_json: any;
  }> {
    await new Promise((r) => setTimeout(r, 380));

    const isGet = params.method === 'GET';
    const isEmployees = params.endpoint.includes('employees');
    const isAttendance = params.endpoint.includes('attendance');

    const resJson = isEmployees
      ? {
          status: 'success',
          count: 2,
          data: [
            { id: 'EMP-9402', name: 'Priya Sharma', department: 'Engineering', designation: 'Staff Architect' },
            { id: 'EMP-7718', name: 'Ramesh Patel', department: 'Operations', designation: 'Fleet Supervisor' },
          ],
        }
      : isAttendance
      ? {
          status: 'success',
          device_id: 'KIOSK-BLR-02',
          recorded_punch: { employee_id: 'EMP-9402', check_in: new Date().toISOString() },
        }
      : {
          status: 'success',
          platform: 'WorkForceOS Integration Gateway v2.4',
          authenticated: true,
          tenant_id: 'org-acme-01',
          timestamp: new Date().toISOString(),
        };

    return {
      http_status: 200,
      latency_ms: Math.floor(Math.random() * 80) + 45,
      response_headers: {
        'content-type': 'application/json; charset=utf-8',
        'x-workforceos-ratelimit-remaining': '1940',
        'x-workforceos-request-id': `req_exp_${Date.now()}`,
      },
      response_json: resJson,
    };
  },

  // --- Audit Logging ---
  async logAudit(entry: {
    action: string;
    resource_type: string;
    resource_id: string;
    resource_name?: string;
    tenant_name?: string;
    reason: string;
  }): Promise<void> {
    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id,
      severity: entry.action.includes('REVOKE') || entry.action.includes('DELETE') ? 'High' : 'Normal',
      reason: entry.reason,
    });
  },
};
