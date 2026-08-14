// src/services/platform/platformWebhooksMeshService.ts
// ============================================================
// WorkForceOS — Webhooks & Event Mesh Operational Control Service
// ============================================================

import {
  WebhookEnvironment,
  WebhookEndpoint,
  WebhookDelivery,
  WebhookDeliveryAttempt,
  DeadLetterEvent,
  EventTypeSchema,
  EventRoute,
  EventConsumer,
  EventMeshMetrics,
  FailureGroup,
  WebhookAuditLog,
  LiveActivityItem,
} from '../../types/webhooksMesh';
import { platformAuditService } from './platformAuditService';

// -------------------------------------------------------------
// Initial Event Types Catalog
// -------------------------------------------------------------
const initialEventTypes: EventTypeSchema[] = [
  {
    id: 'evt-type-01',
    name: 'employee.created',
    version: 'v1',
    category: 'Employee',
    description: 'Triggered when a new employee record is successfully provisioned in WorkForceOS.',
    producer_service: 'Employee Lifecycle Service',
    status: 'Current',
    is_system: false,
    consumers_count: 8,
    subscribers_count: 24,
    created_at: '2025-01-15T08:00:00Z',
    payload_schema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      required: ['id', 'type', 'created_at', 'tenant_id', 'data'],
      properties: {
        id: { type: 'string', description: 'Unique event UUID' },
        type: { type: 'string', enum: ['employee.created'] },
        version: { type: 'string', default: '2026-01' },
        created_at: { type: 'string', format: 'date-time' },
        tenant_id: { type: 'string' },
        data: {
          type: 'object',
          required: ['employee_id', 'work_email', 'first_name', 'last_name', 'department_id', 'joining_date'],
          properties: {
            employee_id: { type: 'string' },
            work_email: { type: 'string', format: 'email' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            department_id: { type: 'string' },
            designation: { type: 'string' },
            joining_date: { type: 'string', format: 'date' },
            employment_type: { type: 'string', enum: ['Full-Time', 'Contract', 'Part-Time', 'Intern'] },
          },
        },
      },
    },
    sample_payload: {
      id: 'evt_01J9X8K4M2P8Q9W1',
      type: 'employee.created',
      version: '2026-01',
      created_at: '2026-08-14T09:12:40Z',
      tenant_id: 'org-acme-01',
      source: 'workforceos-core-hr',
      data: {
        employee_id: 'EMP-9402',
        first_name: 'Priya',
        last_name: 'Sharma',
        work_email: 'priya.sharma@acmecorp.io',
        department_id: 'dept_engineering_04',
        designation: 'Staff Backend Architect',
        joining_date: '2026-09-01',
        employment_type: 'Full-Time',
        location: 'Bengaluru Core Tech Campus',
      },
    },
  },
  {
    id: 'evt-type-02',
    name: 'employee.updated',
    version: 'v1',
    category: 'Employee',
    description: 'Triggered when core employee profile, compensation band, or department changes occur.',
    producer_service: 'Employee Lifecycle Service',
    status: 'Current',
    is_system: false,
    consumers_count: 6,
    subscribers_count: 18,
    created_at: '2025-01-15T08:00:00Z',
    payload_schema: {
      type: 'object',
      required: ['id', 'type', 'tenant_id', 'data'],
      properties: {
        employee_id: { type: 'string' },
        updated_fields: { type: 'array', items: { type: 'string' } },
        previous_values: { type: 'object' },
        current_values: { type: 'object' },
      },
    },
    sample_payload: {
      id: 'evt_01J9X8P3N8B7V2M4',
      type: 'employee.updated',
      version: '2026-01',
      created_at: '2026-08-14T09:25:12Z',
      tenant_id: 'org-acme-01',
      data: {
        employee_id: 'EMP-9402',
        updated_fields: ['designation', 'grade'],
        previous_values: { designation: 'Senior Backend Engineer', grade: 'L4' },
        current_values: { designation: 'Staff Backend Architect', grade: 'L5' },
      },
    },
  },
  {
    id: 'evt-type-03',
    name: 'attendance.checked_in',
    version: 'v1',
    category: 'Attendance',
    description: 'Real-time punch-in recorded via Biometric kiosk, Geofenced Mobile App, or Web Portal.',
    producer_service: 'Time & Attendance Engine',
    status: 'Current',
    is_system: false,
    consumers_count: 5,
    subscribers_count: 32,
    created_at: '2025-01-15T08:00:00Z',
    payload_schema: { type: 'object' },
    sample_payload: {
      id: 'evt_01J9X90AA2C8D9E1',
      type: 'attendance.checked_in',
      version: '2026-01',
      created_at: '2026-08-14T09:30:00Z',
      tenant_id: 'org-zenith-04',
      data: {
        employee_id: 'EMP-7718',
        check_in_time: '2026-08-14T09:30:00+05:30',
        method: 'Biometric_FaceRecognition',
        kiosk_device_id: 'KIOSK-BLR-02',
        geofence_verified: true,
      },
    },
  },
  {
    id: 'evt-type-04',
    name: 'attendance.checked_out',
    version: 'v1',
    category: 'Attendance',
    description: 'Punched out or auto-checkout shift completion trigger.',
    producer_service: 'Time & Attendance Engine',
    status: 'Current',
    is_system: false,
    consumers_count: 5,
    subscribers_count: 28,
    created_at: '2025-01-15T08:00:00Z',
    payload_schema: { type: 'object' },
    sample_payload: {
      id: 'evt_01J9X92FF8B1C2D3',
      type: 'attendance.checked_out',
      version: '2026-01',
      created_at: '2026-08-14T18:32:10Z',
      tenant_id: 'org-zenith-04',
      data: {
        employee_id: 'EMP-7718',
        check_out_time: '2026-08-14T18:32:10+05:30',
        total_work_minutes: 542,
        overtime_minutes: 62,
      },
    },
  },
  {
    id: 'evt-type-05',
    name: 'leave.requested',
    version: 'v1',
    category: 'Leave',
    description: 'Employee submitted a formal leave request for manager approval.',
    producer_service: 'Leave Management Service',
    status: 'Current',
    is_system: false,
    consumers_count: 4,
    subscribers_count: 15,
    created_at: '2025-02-01T08:00:00Z',
    payload_schema: { type: 'object' },
    sample_payload: {
      id: 'evt_01J9X93GG3D4E5F6',
      type: 'leave.requested',
      created_at: '2026-08-14T08:45:00Z',
      tenant_id: 'org-tech-02',
      data: {
        leave_request_id: 'LV-2026-881',
        employee_id: 'EMP-3041',
        leave_type: 'Paid Sick Leave',
        from_date: '2026-08-15',
        to_date: '2026-08-17',
        days_count: 2,
        approver_id: 'EMP-1002',
      },
    },
  },
  {
    id: 'evt-type-06',
    name: 'leave.approved',
    version: 'v1',
    category: 'Leave',
    description: 'Leave request approved by reporting authority or HR automated policy.',
    producer_service: 'Leave Management Service',
    status: 'Current',
    is_system: false,
    consumers_count: 6,
    subscribers_count: 22,
    created_at: '2025-02-01T08:00:00Z',
    payload_schema: { type: 'object' },
    sample_payload: {
      id: 'evt_01J9X94HH4E5F6G7',
      type: 'leave.approved',
      created_at: '2026-08-14T09:10:00Z',
      tenant_id: 'org-tech-02',
      data: {
        leave_request_id: 'LV-2026-881',
        employee_id: 'EMP-3041',
        status: 'Approved',
        approved_by: 'EMP-1002',
      },
    },
  },
  {
    id: 'evt-type-07',
    name: 'payroll.run_finalized',
    version: 'v1',
    category: 'Payroll',
    description: 'Monthly payroll calculation locked, statutory filings generated, and disbursement scheduled.',
    producer_service: 'Payroll Calculation Engine',
    status: 'Current',
    is_system: false,
    consumers_count: 7,
    subscribers_count: 19,
    created_at: '2025-01-20T08:00:00Z',
    payload_schema: { type: 'object' },
    sample_payload: {
      id: 'evt_01J9X95JJ5F6G7H8',
      type: 'payroll.run_finalized',
      created_at: '2026-08-14T06:00:00Z',
      tenant_id: 'org-acme-01',
      data: {
        payroll_batch_id: 'PAY-2026-08-M',
        cycle_month: '2026-08',
        total_net_disbursement: 48500000,
        currency: 'INR',
        employees_processed: 840,
      },
    },
  },
  {
    id: 'evt-type-08',
    name: 'invoice.paid',
    version: 'v1',
    category: 'Billing',
    description: 'SaaS tenant subscription renewal or top-up invoice payment captured successfully.',
    producer_service: 'Platform Billing Gateway',
    status: 'Current',
    is_system: true,
    consumers_count: 4,
    subscribers_count: 12,
    created_at: '2025-01-10T08:00:00Z',
    payload_schema: { type: 'object' },
    sample_payload: {
      id: 'evt_01J9X96KK6G7H8J9',
      type: 'invoice.paid',
      created_at: '2026-08-14T07:15:30Z',
      tenant_id: 'org-acme-01',
      data: {
        invoice_id: 'INV-WF-2026-0891',
        amount: 3499.0,
        currency: 'USD',
        gateway: 'Stripe',
        payment_method: 'card_visa_4242',
      },
    },
  },
  {
    id: 'evt-type-09',
    name: 'security.alert',
    version: 'v1',
    category: 'Security',
    description: 'Elevated security signal: Multiple failed logins, impossible travel, or privileged policy changes.',
    producer_service: 'Zero-Trust Security Monitor',
    status: 'Current',
    is_system: true,
    consumers_count: 9,
    subscribers_count: 16,
    created_at: '2025-01-10T08:00:00Z',
    payload_schema: { type: 'object' },
    sample_payload: {
      id: 'evt_01J9X97LL7H8J9K0',
      type: 'security.alert',
      created_at: '2026-08-14T09:41:20Z',
      tenant_id: 'org-zenith-04',
      data: {
        alert_id: 'SEC-8821',
        threat_level: 'High',
        event_reason: 'Impossible Travel Velocity Detected',
        user_email: 'ops.lead@zenith.com',
        source_ips: ['103.21.14.8', '198.51.100.42'],
      },
    },
  },
  {
    id: 'evt-type-10',
    name: 'ai.copilot_insight_generated',
    version: 'v1',
    category: 'AI',
    description: 'WorkForce Copilot synthesized anomaly detection or flight risk prediction for executive action.',
    producer_service: 'WorkForce Copilot Intelligence Engine',
    status: 'Current',
    is_system: false,
    consumers_count: 3,
    subscribers_count: 10,
    created_at: '2025-04-10T08:00:00Z',
    payload_schema: { type: 'object' },
    sample_payload: {
      id: 'evt_01J9X98MM8J9K0L1',
      type: 'ai.copilot_insight_generated',
      created_at: '2026-08-14T09:00:00Z',
      tenant_id: 'org-acme-01',
      data: {
        model: 'Gemini-3.7-Pro-Enterprise',
        insight_type: 'Attrition_Risk_Cluster',
        department: 'Cloud Platform Engineering',
        confidence_score: 0.91,
      },
    },
  },
  {
    id: 'evt-type-11',
    name: 'organization.department_created',
    version: 'v1',
    category: 'Organization',
    description: 'New business unit, cost center, or department hierarchy created.',
    producer_service: 'Org Architecture Service',
    status: 'Current',
    is_system: false,
    consumers_count: 3,
    subscribers_count: 8,
    created_at: '2025-01-15T08:00:00Z',
    payload_schema: { type: 'object' },
    sample_payload: {
      id: 'evt_01J9X99NN9K0L1M2',
      type: 'organization.department_created',
      created_at: '2026-08-14T05:22:18Z',
      tenant_id: 'org-global-05',
      data: {
        department_id: 'dept_genai_lab',
        name: 'Applied AI & Automation Lab',
        cost_center_code: 'CC-AI-900',
      },
    },
  },
  {
    id: 'evt-type-12',
    name: 'employee.created.v2',
    version: 'v2',
    category: 'Employee',
    description: 'Enhanced schema with international tax codes and multi-entity jurisdiction fields.',
    producer_service: 'Employee Lifecycle Service',
    status: 'Current',
    is_system: false,
    consumers_count: 4,
    subscribers_count: 11,
    created_at: '2026-03-01T08:00:00Z',
    payload_schema: { type: 'object' },
    sample_payload: {
      id: 'evt_01J9X9AOO0L1M2N3',
      type: 'employee.created.v2',
      version: '2026-06',
      created_at: '2026-08-14T09:44:00Z',
      tenant_id: 'org-global-05',
      data: {
        employee_id: 'EMP-G-1029',
        legal_entity: 'WorkForce Global EMEA Ltd',
        tax_residency_country: 'DE',
      },
    },
  },
];

// -------------------------------------------------------------
// Initial Webhook Endpoints
// -------------------------------------------------------------
const initialEndpoints: WebhookEndpoint[] = [
  {
    id: 'whk-01',
    organization_id: 'org-acme-01',
    tenant_name: 'Acme Technologies',
    name: 'Acme ERP & SAP Integration',
    description: 'Real-time employee lifecycle, promotion, and salary bands synchronization with SAP S/4HANA',
    environment: 'Production',
    url: 'https://api.acme.com/webhooks/workforceos',
    http_method: 'POST',
    status: 'Active',
    auth_type: 'HMAC-SHA256',
    secret_id: 'sec_acme_prod_9918',
    secret_masked: 'whsec_••••••••••••••••38f2',
    secret_last_rotated: '2026-07-10T12:00:00Z',
    timeout_ms: 10000,
    max_attempts: 8,
    backoff_strategy: 'exponential',
    initial_retry_delay_seconds: 10,
    max_retry_delay_seconds: 1800,
    retry_status_codes: [408, 429, 500, 502, 503, 504],
    health_score: 98,
    success_rate: 99.82,
    failure_rate: 0.18,
    avg_latency_ms: 284,
    p95_latency_ms: 612,
    last_success_at: '12 sec ago',
    last_failure_at: '6 hours ago',
    consecutive_failures: 0,
    events: [
      'employee.created',
      'employee.updated',
      'payroll.run_finalized',
      'organization.department_created',
    ],
    ip_allowlist: ['54.210.12.88', '54.210.12.89'],
    created_by: 'Platform Lead Anand',
    created_at: '2025-06-12T10:00:00Z',
    updated_at: '2026-08-14T08:30:00Z',
    tls_verified: true,
  },
  {
    id: 'whk-02',
    organization_id: 'org-tech-02',
    tenant_name: 'TechCorp Solutions',
    name: 'TechCorp Slack Announcements Bot',
    description: 'Slack webhook engine broadcasting daily welcome greetings, birthday milestones, and leaves',
    environment: 'Production',
    url: 'https://hooks.techcorp.in/hrms-listener/slack-pipe',
    http_method: 'POST',
    status: 'Active',
    auth_type: 'HMAC-SHA256',
    secret_id: 'sec_tech_prod_4421',
    secret_masked: 'whsec_••••••••••••••••7a19',
    secret_last_rotated: '2026-05-20T08:00:00Z',
    timeout_ms: 5000,
    max_attempts: 5,
    backoff_strategy: 'exponential',
    initial_retry_delay_seconds: 15,
    max_retry_delay_seconds: 900,
    retry_status_codes: [429, 500, 502, 503, 504],
    health_score: 100,
    success_rate: 100.0,
    failure_rate: 0.0,
    avg_latency_ms: 92,
    p95_latency_ms: 180,
    last_success_at: '45 sec ago',
    consecutive_failures: 0,
    events: ['employee.created', 'leave.approved'],
    created_by: 'DevOps Lead Vikram',
    created_at: '2025-08-01T14:20:00Z',
    updated_at: '2026-08-10T11:00:00Z',
    tls_verified: true,
  },
  {
    id: 'whk-03',
    organization_id: 'org-zenith-04',
    tenant_name: 'Zenith Logistics',
    name: 'Zenith Biometric & Transport Dispatch',
    description: 'Pushes physical shift checkout events to fleet management for commuter bus scheduling',
    environment: 'Production',
    url: 'https://logistics-hub.zenith.com/api/biometric-push',
    http_method: 'POST',
    status: 'Failing',
    auth_type: 'Bearer Token',
    secret_id: 'sec_zenith_prod_1002',
    secret_masked: 'whsec_••••••••••••••••55b1',
    secret_last_rotated: '2026-01-14T09:00:00Z', // > 180 days ago!
    timeout_ms: 8000,
    max_attempts: 8,
    backoff_strategy: 'exponential',
    initial_retry_delay_seconds: 10,
    max_retry_delay_seconds: 1800,
    retry_status_codes: [408, 429, 500, 502, 503, 504],
    health_score: 42,
    success_rate: 82.4,
    failure_rate: 17.6,
    avg_latency_ms: 1480,
    p95_latency_ms: 4950,
    last_success_at: '42 mins ago',
    last_failure_at: '2 mins ago',
    consecutive_failures: 14,
    events: ['attendance.checked_in', 'attendance.checked_out'],
    ip_allowlist: ['103.44.120.10'],
    created_by: 'Super Admin',
    created_at: '2025-03-10T09:00:00Z',
    updated_at: '2026-08-14T09:35:00Z',
    tls_verified: true,
  },
  {
    id: 'whk-04',
    organization_id: 'org-global-05',
    tenant_name: 'GlobalCorp Enterprise',
    name: 'GlobalCorp Workday HR Sync Bridge',
    description: 'Enterprise integration gateway bridging WorkForceOS attendance and leave into Workday Core',
    environment: 'Production',
    url: 'https://gateway.globalcorp.com/integrations/workforceos-events',
    http_method: 'POST',
    status: 'Active',
    auth_type: 'OAuth2',
    secret_id: 'sec_global_prod_8819',
    secret_masked: 'whsec_••••••••••••••••99c4',
    secret_last_rotated: '2026-07-28T16:00:00Z',
    timeout_ms: 12000,
    max_attempts: 8,
    backoff_strategy: 'exponential',
    initial_retry_delay_seconds: 10,
    max_retry_delay_seconds: 1800,
    retry_status_codes: [408, 429, 500, 502, 503, 504],
    health_score: 95,
    success_rate: 99.4,
    failure_rate: 0.6,
    avg_latency_ms: 340,
    p95_latency_ms: 780,
    last_success_at: '3 mins ago',
    last_failure_at: '1 day ago',
    consecutive_failures: 0,
    events: ['employee.created', 'employee.created.v2', 'leave.approved', 'payroll.run_finalized'],
    ip_allowlist: ['34.201.88.10', '34.201.88.11'],
    created_by: 'Integration Architect Sarah',
    created_at: '2025-11-20T11:00:00Z',
    updated_at: '2026-08-12T14:00:00Z',
    tls_verified: true,
  },
  {
    id: 'whk-05',
    organization_id: 'org-apex-06',
    tenant_name: 'Apex FinTech Solutions',
    name: 'Apex Compliance & Audit SIEM Stream',
    description: 'Real-time security alerts and privilege escalation event pump to Splunk SIEM cluster',
    environment: 'Production',
    url: 'https://siem-collector.apexfin.io/v1/workforce-security',
    http_method: 'POST',
    status: 'Active',
    auth_type: 'HMAC-SHA256',
    secret_id: 'sec_apex_prod_0042',
    secret_masked: 'whsec_••••••••••••••••11d8',
    secret_last_rotated: '2026-06-15T10:00:00Z',
    timeout_ms: 5000,
    max_attempts: 8,
    backoff_strategy: 'exponential',
    initial_retry_delay_seconds: 5,
    max_retry_delay_seconds: 1200,
    retry_status_codes: [429, 500, 502, 503, 504],
    health_score: 99,
    success_rate: 99.95,
    failure_rate: 0.05,
    avg_latency_ms: 115,
    p95_latency_ms: 220,
    last_success_at: '1 min ago',
    consecutive_failures: 0,
    events: ['security.alert', 'employee.created', 'payroll.run_finalized'],
    created_by: 'SecOps Director Mehta',
    created_at: '2026-01-05T08:30:00Z',
    updated_at: '2026-08-14T07:00:00Z',
    tls_verified: true,
  },
  {
    id: 'whk-06',
    organization_id: 'org-acme-01',
    tenant_name: 'Acme Technologies',
    name: 'Acme Staging Test Sandbox Webhook',
    description: 'Dev sandbox listener for testing quarterly schema upgrades',
    environment: 'Staging',
    url: 'https://staging-api.acme.com/sandbox/wh-test',
    http_method: 'POST',
    status: 'Active',
    auth_type: 'HMAC-SHA256',
    secret_id: 'sec_acme_stg_1104',
    secret_masked: 'whsec_stg_••••••••••••44f1',
    secret_last_rotated: '2026-08-01T12:00:00Z',
    timeout_ms: 10000,
    max_attempts: 5,
    backoff_strategy: 'exponential',
    initial_retry_delay_seconds: 10,
    max_retry_delay_seconds: 600,
    retry_status_codes: [408, 429, 500, 502, 503, 504],
    health_score: 96,
    success_rate: 98.2,
    failure_rate: 1.8,
    avg_latency_ms: 190,
    p95_latency_ms: 410,
    last_success_at: '18 mins ago',
    consecutive_failures: 0,
    events: ['employee.created.v2', 'leave.requested', 'invoice.paid'],
    created_by: 'QA Engineer Rohit',
    created_at: '2026-07-15T09:00:00Z',
    updated_at: '2026-08-14T08:00:00Z',
    tls_verified: true,
  },
];

// -------------------------------------------------------------
// Initial Webhook Deliveries & Attempt Timelines
// -------------------------------------------------------------
const initialDeliveries: WebhookDelivery[] = [
  {
    id: 'del-901',
    event_id: 'evt_01J9X8K4M2P8Q9W1',
    event_uuid: 'wh-del-901-uuid',
    event_type: 'employee.created',
    endpoint_id: 'whk-01',
    endpoint_name: 'Acme ERP & SAP Integration',
    tenant_name: 'Acme Technologies',
    organization_id: 'org-acme-01',
    environment: 'Production',
    status: 'Delivered',
    attempt_count: 1,
    max_attempts: 8,
    http_status: 200,
    response_time_ms: 284,
    queued_at: '2026-08-14T09:12:40.102Z',
    delivered_at: '2026-08-14T09:12:40.386Z',
    request_headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'User-Agent': 'WorkForceOS-EventMesh/2.4 (Enterprise Engine)',
      'X-WorkForceOS-Event': 'employee.created',
      'X-WorkForceOS-Event-ID': 'evt_01J9X8K4M2P8Q9W1',
      'X-WorkForceOS-Timestamp': '1786785160',
      'X-WorkForceOS-Signature': 't=1786785160,v1=9f83ab28ef94120387b9ce01e4a5bf8912d7c92841c19b48e3a2072149b0101a',
      'X-WorkForceOS-Version': '2026-01',
      'X-WorkForceOS-Delivery-Attempt': '1',
    },
    response_headers: {
      'content-type': 'application/json; charset=utf-8',
      'server': 'SAP-S4HANA-Gateway/7.50',
      'x-sap-request-id': 'req-sap-blr-88910',
      'date': 'Fri, 14 Aug 2026 09:12:40 GMT',
    },
    payload: {
      id: 'evt_01J9X8K4M2P8Q9W1',
      type: 'employee.created',
      version: '2026-01',
      created_at: '2026-08-14T09:12:40Z',
      tenant_id: 'org-acme-01',
      source: 'workforceos-core-hr',
      data: {
        employee_id: 'EMP-9402',
        first_name: 'Priya',
        last_name: 'Sharma',
        work_email: 'priya.sharma@acmecorp.io',
        department_id: 'dept_engineering_04',
        designation: 'Staff Backend Architect',
        joining_date: '2026-09-01',
        employment_type: 'Full-Time',
        location: 'Bengaluru Core Tech Campus',
      },
    },
    response_body: JSON.stringify(
      {
        status: 'SUCCESS',
        sap_personnel_number: 'PER-881920',
        action: 'CREATED_NEW_HIRE_RECORD',
        processed_at: '2026-08-14T09:12:40.380Z',
      },
      null,
      2
    ),
    attempts: [
      {
        id: 'att-901-1',
        delivery_id: 'del-901',
        attempt_number: 1,
        request_timestamp: '2026-08-14T09:12:40.102Z',
        http_status: 200,
        response_time_ms: 284,
        request_headers: { 'X-WorkForceOS-Event': 'employee.created' },
        response_headers: { 'server': 'SAP-S4HANA-Gateway/7.50' },
        response_body: '{"status":"SUCCESS","sap_personnel_number":"PER-881920"}',
      },
    ],
  },
  {
    id: 'del-902',
    event_id: 'evt_01J9X90AA2C8D9E1',
    event_uuid: 'wh-del-902-uuid',
    event_type: 'attendance.checked_in',
    endpoint_id: 'whk-03',
    endpoint_name: 'Zenith Biometric & Transport Dispatch',
    tenant_name: 'Zenith Logistics',
    organization_id: 'org-zenith-04',
    environment: 'Production',
    status: 'Failed',
    attempt_count: 8,
    max_attempts: 8,
    http_status: 504,
    response_time_ms: 8000,
    last_error_code: 'GATEWAY_TIMEOUT',
    last_error_message: 'HTTP 504 Gateway Timeout: Zenith backend upstream failed to respond within 8000ms',
    queued_at: '2026-08-14T08:40:12.000Z',
    failed_at: '2026-08-14T09:35:10.000Z',
    request_headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': 'Bearer ********************',
      'X-WorkForceOS-Event': 'attendance.checked_in',
      'X-WorkForceOS-Event-ID': 'evt_01J9X90AA2C8D9E1',
      'X-WorkForceOS-Timestamp': '1786783212',
      'X-WorkForceOS-Delivery-Attempt': '8',
    },
    response_headers: {
      'content-type': 'text/html; charset=utf-8',
      'server': 'nginx/1.22.1',
      'date': 'Fri, 14 Aug 2026 09:35:10 GMT',
    },
    payload: {
      id: 'evt_01J9X90AA2C8D9E1',
      type: 'attendance.checked_in',
      version: '2026-01',
      created_at: '2026-08-14T08:40:12Z',
      tenant_id: 'org-zenith-04',
      data: {
        employee_id: 'EMP-7718',
        check_in_time: '2026-08-14T09:30:00+05:30',
        method: 'Biometric_FaceRecognition',
        kiosk_device_id: 'KIOSK-BLR-02',
      },
    },
    response_body: '<html><head><title>504 Gateway Time-out</title></head><body><center><h1>504 Gateway Time-out</h1></center><hr><center>nginx/1.22.1</center></body></html>',
    attempts: [
      {
        id: 'att-902-1',
        delivery_id: 'del-902',
        attempt_number: 1,
        request_timestamp: '2026-08-14T08:40:12.000Z',
        http_status: 504,
        response_time_ms: 8000,
        request_headers: { 'X-WorkForceOS-Event': 'attendance.checked_in' },
        response_headers: { 'server': 'nginx/1.22.1' },
        error_code: 'GATEWAY_TIMEOUT',
        error_message: 'Timed out waiting for upstream',
      },
      {
        id: 'att-902-2',
        delivery_id: 'del-902',
        attempt_number: 2,
        request_timestamp: '2026-08-14T08:40:22.000Z',
        http_status: 504,
        response_time_ms: 8000,
        request_headers: { 'X-WorkForceOS-Event': 'attendance.checked_in' },
        response_headers: { 'server': 'nginx/1.22.1' },
        error_code: 'GATEWAY_TIMEOUT',
        error_message: 'Timed out waiting for upstream (Backoff 10s)',
      },
      {
        id: 'att-902-3',
        delivery_id: 'del-902',
        attempt_number: 3,
        request_timestamp: '2026-08-14T08:40:42.000Z',
        http_status: 502,
        response_time_ms: 1200,
        request_headers: { 'X-WorkForceOS-Event': 'attendance.checked_in' },
        response_headers: { 'server': 'nginx/1.22.1' },
        error_code: 'BAD_GATEWAY',
        error_message: '502 Bad Gateway from upstream service',
      },
      {
        id: 'att-902-8',
        delivery_id: 'del-902',
        attempt_number: 8,
        request_timestamp: '2026-08-14T09:35:10.000Z',
        http_status: 504,
        response_time_ms: 8000,
        request_headers: { 'X-WorkForceOS-Event': 'attendance.checked_in' },
        response_headers: { 'server': 'nginx/1.22.1' },
        error_code: 'MAX_RETRIES_EXCEEDED',
        error_message: 'Max retry attempts (8/8) exhausted. Transferred to Dead Letter Queue.',
      },
    ],
  },
  {
    id: 'del-903',
    event_id: 'evt_01J9X94HH4E5F6G7',
    event_uuid: 'wh-del-903-uuid',
    event_type: 'leave.approved',
    endpoint_id: 'whk-02',
    endpoint_name: 'TechCorp Slack Announcements Bot',
    tenant_name: 'TechCorp Solutions',
    organization_id: 'org-tech-02',
    environment: 'Production',
    status: 'Delivered',
    attempt_count: 1,
    max_attempts: 5,
    http_status: 200,
    response_time_ms: 92,
    queued_at: '2026-08-14T09:10:00.010Z',
    delivered_at: '2026-08-14T09:10:00.102Z',
    request_headers: {
      'Content-Type': 'application/json',
      'X-WorkForceOS-Event': 'leave.approved',
      'X-WorkForceOS-Event-ID': 'evt_01J9X94HH4E5F6G7',
    },
    response_headers: {
      'content-type': 'text/plain; charset=utf-8',
      'server': 'Slack-Inbound-Gateway',
    },
    payload: {
      id: 'evt_01J9X94HH4E5F6G7',
      type: 'leave.approved',
      created_at: '2026-08-14T09:10:00Z',
      tenant_id: 'org-tech-02',
      data: {
        leave_request_id: 'LV-2026-881',
        employee_id: 'EMP-3041',
        status: 'Approved',
      },
    },
    response_body: 'ok',
    attempts: [
      {
        id: 'att-903-1',
        delivery_id: 'del-903',
        attempt_number: 1,
        request_timestamp: '2026-08-14T09:10:00.010Z',
        http_status: 200,
        response_time_ms: 92,
        request_headers: { 'X-WorkForceOS-Event': 'leave.approved' },
        response_headers: { 'server': 'Slack-Inbound-Gateway' },
        response_body: 'ok',
      },
    ],
  },
  {
    id: 'del-904',
    event_id: 'evt_01J9X96KK6G7H8J9',
    event_uuid: 'wh-del-904-uuid',
    event_type: 'invoice.paid',
    endpoint_id: 'whk-01',
    endpoint_name: 'Acme ERP & SAP Integration',
    tenant_name: 'Acme Technologies',
    organization_id: 'org-acme-01',
    environment: 'Production',
    status: 'Delivered',
    attempt_count: 1,
    max_attempts: 8,
    http_status: 200,
    response_time_ms: 310,
    queued_at: '2026-08-14T07:15:30.000Z',
    delivered_at: '2026-08-14T07:15:30.310Z',
    request_headers: {
      'Content-Type': 'application/json',
      'X-WorkForceOS-Event': 'invoice.paid',
      'X-WorkForceOS-Event-ID': 'evt_01J9X96KK6G7H8J9',
    },
    response_headers: { 'server': 'SAP-S4HANA-Gateway/7.50' },
    payload: {
      id: 'evt_01J9X96KK6G7H8J9',
      type: 'invoice.paid',
      tenant_id: 'org-acme-01',
      data: { invoice_id: 'INV-WF-2026-0891', amount: 3499.0 },
    },
    response_body: '{"sap_clearing_doc":"DOC-998812","status":"POSTED"}',
    attempts: [
      {
        id: 'att-904-1',
        delivery_id: 'del-904',
        attempt_number: 1,
        request_timestamp: '2026-08-14T07:15:30.000Z',
        http_status: 200,
        response_time_ms: 310,
        request_headers: { 'X-WorkForceOS-Event': 'invoice.paid' },
        response_headers: { 'server': 'SAP-S4HANA-Gateway/7.50' },
        response_body: '{"sap_clearing_doc":"DOC-998812"}',
      },
    ],
  },
  {
    id: 'del-905',
    event_id: 'evt_01J9X97LL7H8J9K0',
    event_uuid: 'wh-del-905-uuid',
    event_type: 'security.alert',
    endpoint_id: 'whk-05',
    endpoint_name: 'Apex Compliance & Audit SIEM Stream',
    tenant_name: 'Apex FinTech Solutions',
    organization_id: 'org-apex-06',
    environment: 'Production',
    status: 'Delivered',
    attempt_count: 1,
    max_attempts: 8,
    http_status: 200,
    response_time_ms: 118,
    queued_at: '2026-08-14T09:41:20.000Z',
    delivered_at: '2026-08-14T09:41:20.118Z',
    request_headers: {
      'Content-Type': 'application/json',
      'X-WorkForceOS-Event': 'security.alert',
      'X-WorkForceOS-Event-ID': 'evt_01J9X97LL7H8J9K0',
    },
    response_headers: { 'server': 'Splunk-HEC/8.2.0' },
    payload: {
      id: 'evt_01J9X97LL7H8J9K0',
      type: 'security.alert',
      tenant_id: 'org-apex-06',
      data: { alert_id: 'SEC-8821', threat_level: 'High' },
    },
    response_body: '{"text":"Success","code":0}',
    attempts: [
      {
        id: 'att-905-1',
        delivery_id: 'del-905',
        attempt_number: 1,
        request_timestamp: '2026-08-14T09:41:20.000Z',
        http_status: 200,
        response_time_ms: 118,
        request_headers: { 'X-WorkForceOS-Event': 'security.alert' },
        response_headers: { 'server': 'Splunk-HEC/8.2.0' },
        response_body: '{"text":"Success","code":0}',
      },
    ],
  },
  {
    id: 'del-906',
    event_id: 'evt_01J9X92FF8B1C2D3',
    event_uuid: 'wh-del-906-uuid',
    event_type: 'attendance.checked_out',
    endpoint_id: 'whk-03',
    endpoint_name: 'Zenith Biometric & Transport Dispatch',
    tenant_name: 'Zenith Logistics',
    organization_id: 'org-zenith-04',
    environment: 'Production',
    status: 'Retrying',
    attempt_count: 4,
    max_attempts: 8,
    http_status: 503,
    response_time_ms: 512,
    last_error_code: 'SERVICE_UNAVAILABLE',
    last_error_message: 'HTTP 503 Service Unavailable: Rate limiter capacity exhausted on Zenith listener',
    next_retry_at: 'in 42 seconds',
    queued_at: '2026-08-14T09:45:00.000Z',
    request_headers: {
      'Content-Type': 'application/json',
      'X-WorkForceOS-Event': 'attendance.checked_out',
      'X-WorkForceOS-Event-ID': 'evt_01J9X92FF8B1C2D3',
    },
    response_headers: { 'server': 'nginx/1.22.1', 'retry-after': '60' },
    payload: {
      id: 'evt_01J9X92FF8B1C2D3',
      type: 'attendance.checked_out',
      tenant_id: 'org-zenith-04',
      data: { employee_id: 'EMP-7718', total_work_minutes: 542 },
    },
    response_body: '{"error":"Service Unavailable","retry_after_sec":60}',
    attempts: [
      {
        id: 'att-906-1',
        delivery_id: 'del-906',
        attempt_number: 1,
        request_timestamp: '2026-08-14T09:45:00.000Z',
        http_status: 503,
        response_time_ms: 480,
        request_headers: { 'X-WorkForceOS-Event': 'attendance.checked_out' },
        response_headers: { 'server': 'nginx/1.22.1' },
        error_code: 'SERVICE_UNAVAILABLE',
        error_message: '503 Service Unavailable',
      },
      {
        id: 'att-906-2',
        delivery_id: 'del-906',
        attempt_number: 2,
        request_timestamp: '2026-08-14T09:45:10.000Z',
        http_status: 503,
        response_time_ms: 500,
        request_headers: { 'X-WorkForceOS-Event': 'attendance.checked_out' },
        response_headers: { 'server': 'nginx/1.22.1' },
        error_code: 'SERVICE_UNAVAILABLE',
        error_message: '503 Service Unavailable (Backoff #2)',
      },
    ],
  },
];

// -------------------------------------------------------------
// Dead Letter Queue Initial Events
// -------------------------------------------------------------
const initialDeadLetters: DeadLetterEvent[] = [
  {
    id: 'dlq-001',
    event_id: 'evt_01J9X90AA2C8D9E1',
    event_type: 'attendance.checked_in',
    endpoint_id: 'whk-03',
    endpoint_name: 'Zenith Biometric & Transport Dispatch',
    tenant_name: 'Zenith Logistics',
    organization_id: 'org-zenith-04',
    environment: 'Production',
    attempt_count: 8,
    max_attempts: 8,
    last_error: 'HTTP 504 Gateway Timeout: Zenith backend upstream timed out after 8 retries',
    error_code: 'ERR_MAX_RETRIES_EXCEEDED',
    created_at: '2026-08-14T08:40:12Z',
    dead_lettered_at: '2026-08-14T09:35:10Z',
    reason: 'Exhausted maximum retry attempts (8/8) with exponential backoff',
    status: 'Pending Review',
    payload: {
      id: 'evt_01J9X90AA2C8D9E1',
      type: 'attendance.checked_in',
      tenant_id: 'org-zenith-04',
      data: { employee_id: 'EMP-7718', check_in_time: '2026-08-14T09:30:00+05:30' },
    },
  },
  {
    id: 'dlq-002',
    event_id: 'evt_01J9X8P3N8B7V2M4',
    event_type: 'employee.updated',
    endpoint_id: 'whk-03',
    endpoint_name: 'Zenith Biometric & Transport Dispatch',
    tenant_name: 'Zenith Logistics',
    organization_id: 'org-zenith-04',
    environment: 'Production',
    attempt_count: 8,
    max_attempts: 8,
    last_error: 'HTTP 500 Internal Server Error: Target SQL deadlock on biometric employee sync table',
    error_code: 'HTTP_500_INTERNAL_SERVER_ERROR',
    created_at: '2026-08-14T07:10:00Z',
    dead_lettered_at: '2026-08-14T08:15:00Z',
    reason: 'Target server reported fatal database transaction rollback',
    status: 'Pending Review',
    payload: {
      id: 'evt_01J9X8P3N8B7V2M4',
      type: 'employee.updated',
      tenant_id: 'org-zenith-04',
      data: { employee_id: 'EMP-7718', designation: 'Regional Fleet Supervisor' },
    },
  },
  {
    id: 'dlq-003',
    event_id: 'evt_01J9X7B1A9C8D2E3',
    event_type: 'employee.created',
    endpoint_id: 'whk-03',
    endpoint_name: 'Zenith Biometric & Transport Dispatch',
    tenant_name: 'Zenith Logistics',
    organization_id: 'org-zenith-04',
    environment: 'Production',
    attempt_count: 8,
    max_attempts: 8,
    last_error: 'Connection Refused (ECONNREFUSED): Host unreachable during DNS switch',
    error_code: 'CONN_REFUSED',
    created_at: '2026-08-14T04:20:00Z',
    dead_lettered_at: '2026-08-14T05:30:00Z',
    reason: 'Target endpoint network outage',
    status: 'Pending Review',
    payload: {
      id: 'evt_01J9X7B1A9C8D2E3',
      type: 'employee.created',
      tenant_id: 'org-zenith-04',
      data: { employee_id: 'EMP-9901', name: 'Ramesh Patel' },
    },
  },
];

// -------------------------------------------------------------
// Failure Groups
// -------------------------------------------------------------
const initialFailureGroups: FailureGroup[] = [
  {
    id: 'fg-01',
    endpoint_id: 'whk-03',
    endpoint_name: 'Zenith Biometric & Transport Dispatch',
    tenant_name: 'Zenith Logistics',
    http_status: 504,
    error_type: 'Gateway Timeout (504)',
    count: 112,
    first_seen: '06:12 AM',
    last_seen: '09:44 AM (2m ago)',
    sample_delivery_id: 'del-902',
  },
  {
    id: 'fg-02',
    endpoint_id: 'whk-03',
    endpoint_name: 'Zenith Biometric & Transport Dispatch',
    tenant_name: 'Zenith Logistics',
    http_status: 503,
    error_type: 'Service Unavailable (503)',
    count: 14,
    first_seen: '08:30 AM',
    last_seen: '09:45 AM (Just now)',
    sample_delivery_id: 'del-906',
  },
  {
    id: 'fg-03',
    endpoint_id: 'whk-01',
    endpoint_name: 'Acme ERP & SAP Integration',
    tenant_name: 'Acme Technologies',
    http_status: 429,
    error_type: 'Rate Limit Exceeded (429)',
    count: 2,
    first_seen: '07:05 AM',
    last_seen: '07:08 AM',
    sample_delivery_id: 'del-901',
  },
];

// -------------------------------------------------------------
// Event Routes (Mesh Routing)
// -------------------------------------------------------------
const initialEventRoutes: EventRoute[] = [
  {
    id: 'rt-01',
    event_type: 'employee.created',
    source_service: 'Employee Lifecycle Service',
    destination_type: 'webhook_endpoint',
    destination_name: 'Outbound Webhook Dispatcher',
    route_key: 'mesh.events.employee.created.webhooks',
    status: 'Active',
    priority: 100,
    queue_name: 'q_webhook_dispatcher_high',
    queue_depth: 42,
    lag_ms: 12,
    failure_rate_pct: 0.04,
    last_processed_at: '3 sec ago',
  },
  {
    id: 'rt-02',
    event_type: 'employee.created',
    source_service: 'Employee Lifecycle Service',
    destination_type: 'internal_consumer',
    destination_name: 'Payroll Auto-Enrollment Consumer',
    route_key: 'mesh.events.employee.created.payroll',
    status: 'Active',
    priority: 100,
    queue_name: 'q_payroll_enrollment',
    queue_depth: 18,
    lag_ms: 8,
    failure_rate_pct: 0.0,
    last_processed_at: '8 sec ago',
  },
  {
    id: 'rt-03',
    event_type: 'employee.created',
    source_service: 'Employee Lifecycle Service',
    destination_type: 'internal_consumer',
    destination_name: 'Notification & Welcome Kit Worker',
    route_key: 'mesh.events.employee.created.notifications',
    status: 'Active',
    priority: 50,
    queue_name: 'q_notification_service',
    queue_depth: 6,
    lag_ms: 14,
    failure_rate_pct: 0.0,
    last_processed_at: '12 sec ago',
  },
  {
    id: 'rt-04',
    event_type: 'attendance.checked_in',
    source_service: 'Time & Attendance Engine',
    destination_type: 'webhook_endpoint',
    destination_name: 'Outbound Webhook Dispatcher',
    route_key: 'mesh.events.attendance.checked_in.webhooks',
    status: 'Degraded',
    priority: 80,
    queue_name: 'q_webhook_dispatcher_attendance',
    queue_depth: 1420,
    lag_ms: 1480,
    failure_rate_pct: 12.8,
    last_processed_at: 'Just now',
  },
  {
    id: 'rt-05',
    event_type: 'payroll.run_finalized',
    source_service: 'Payroll Calculation Engine',
    destination_type: 'internal_consumer',
    destination_name: 'Statutory Compliance & Tax Filing',
    route_key: 'mesh.events.payroll.finalized.statutory',
    status: 'Active',
    priority: 150,
    queue_name: 'q_statutory_filings',
    queue_depth: 0,
    lag_ms: 4,
    failure_rate_pct: 0.0,
    last_processed_at: '1 hr ago',
  },
  {
    id: 'rt-06',
    event_type: 'security.alert',
    source_service: 'Zero-Trust Security Monitor',
    destination_type: 'internal_consumer',
    destination_name: 'SOC Automated Incident Responder',
    route_key: 'mesh.events.security.alert.soc',
    status: 'Active',
    priority: 200,
    queue_name: 'q_security_incidents_realtime',
    queue_depth: 2,
    lag_ms: 2,
    failure_rate_pct: 0.0,
    last_processed_at: '45 sec ago',
  },
];

// -------------------------------------------------------------
// Event Consumers
// -------------------------------------------------------------
const initialEventConsumers: EventConsumer[] = [
  {
    id: 'csm-01',
    name: 'Outbound Webhook Dispatcher',
    service_name: 'webhook-dispatch-service',
    environment: 'Production',
    status: 'Healthy',
    queue_name: 'q_webhook_dispatcher_high',
    last_heartbeat_at: '2 sec ago',
    queue_depth: 142,
    processing_rate_per_min: 1240,
    lag_ms: 12,
    failure_rate_pct: 0.12,
  },
  {
    id: 'csm-02',
    name: 'Payroll Auto-Enrollment Consumer',
    service_name: 'payroll-enrollment-worker',
    environment: 'Production',
    status: 'Healthy',
    queue_name: 'q_payroll_enrollment',
    last_heartbeat_at: '1 sec ago',
    queue_depth: 18,
    processing_rate_per_min: 340,
    lag_ms: 8,
    failure_rate_pct: 0.0,
  },
  {
    id: 'csm-03',
    name: 'Notification & Email Broadcast Worker',
    service_name: 'notification-worker',
    environment: 'Production',
    status: 'Healthy',
    queue_name: 'q_notification_service',
    last_heartbeat_at: '3 sec ago',
    queue_depth: 6,
    processing_rate_per_min: 880,
    lag_ms: 14,
    failure_rate_pct: 0.02,
  },
  {
    id: 'csm-04',
    name: 'Dead Letter Queue Recovery Processor',
    service_name: 'dlq-recovery-agent',
    environment: 'Production',
    status: 'Healthy',
    queue_name: 'q_dlq_processor',
    last_heartbeat_at: '4 sec ago',
    queue_depth: 24,
    processing_rate_per_min: 45,
    lag_ms: 120,
    failure_rate_pct: 0.0,
  },
  {
    id: 'csm-05',
    name: 'WorkForce Copilot Intelligence Streamer',
    service_name: 'ai-copilot-analyzer',
    environment: 'Production',
    status: 'Healthy',
    queue_name: 'q_ai_event_stream',
    last_heartbeat_at: '2 sec ago',
    queue_depth: 54,
    processing_rate_per_min: 620,
    lag_ms: 45,
    failure_rate_pct: 0.08,
  },
];

// -------------------------------------------------------------
// Webhook Audit Logs
// -------------------------------------------------------------
const initialAuditLogs: WebhookAuditLog[] = [
  {
    id: 'aud-wh-01',
    actor_name: 'WorkForce Super Admin',
    actor_role: 'Super Admin',
    action: 'WEBHOOK_ENDPOINT_CREATED',
    resource_type: 'WebhookEndpoint',
    resource_id: 'whk-05',
    resource_name: 'Apex Compliance & Audit SIEM Stream',
    tenant_name: 'Apex FinTech Solutions',
    timestamp: '2026-08-14 07:00:12',
    ip_address: '103.24.12.8',
    reason: 'Provisioned enterprise Splunk SIEM integration with HMAC-SHA256 signature verification',
  },
  {
    id: 'aud-wh-02',
    actor_name: 'DevOps Lead Vikram',
    actor_role: 'Platform Admin',
    action: 'WEBHOOK_SECRET_ROTATED',
    resource_type: 'WebhookEndpoint',
    resource_id: 'whk-01',
    resource_name: 'Acme ERP & SAP Integration',
    tenant_name: 'Acme Technologies',
    timestamp: '2026-08-14 06:12:44',
    ip_address: '49.207.201.14',
    reason: 'Routine quarterly security rotation with 48h dual-key grace period',
  },
  {
    id: 'aud-wh-03',
    actor_name: 'Platform Lead Anand',
    actor_role: 'Super Admin',
    action: 'WEBHOOK_DELIVERY_REPLAYED',
    resource_type: 'WebhookDelivery',
    resource_id: 'del-901',
    resource_name: 'employee.created (Acme ERP)',
    tenant_name: 'Acme Technologies',
    timestamp: '2026-08-14 05:40:02',
    ip_address: '157.48.91.22',
    reason: 'Replayed single delivery after target SAP gateway firewall restart',
  },
  {
    id: 'aud-wh-04',
    actor_name: 'Support Engineer Meera',
    actor_role: 'Support Lead',
    action: 'DEAD_LETTER_EVENT_REQUEUED',
    resource_type: 'DeadLetterEvent',
    resource_id: 'dlq-001',
    resource_name: 'attendance.checked_in (Zenith Logistics)',
    tenant_name: 'Zenith Logistics',
    timestamp: '2026-08-14 05:10:19',
    ip_address: '103.21.14.99',
    reason: 'Manual requeue of biometric punch after client network recovery',
  },
];

// -------------------------------------------------------------
// Live Activity Feed Items
// -------------------------------------------------------------
const initialLiveActivity: LiveActivityItem[] = [
  {
    id: 'act-01',
    type: 'success',
    event_type: 'employee.created',
    subscribers_count: 8,
    tenant_name: 'Acme Technologies',
    endpoint_name: 'Acme ERP & SAP Integration',
    time_ago: '2 sec ago',
    message: 'Delivered to 8 subscribers (HTTP 200 • 284ms)',
  },
  {
    id: 'act-02',
    type: 'success',
    event_type: 'invoice.paid',
    subscribers_count: 4,
    tenant_name: 'Acme Technologies',
    endpoint_name: 'Acme ERP & SAP Integration',
    time_ago: '8 sec ago',
    message: 'Delivered to 4 subscribers (HTTP 200 • 310ms)',
  },
  {
    id: 'act-03',
    type: 'warning',
    event_type: 'attendance.checked_out',
    subscribers_count: 1,
    tenant_name: 'Zenith Logistics',
    endpoint_name: 'Zenith Biometric & Transport Dispatch',
    time_ago: '14 sec ago',
    message: 'Delivery retrying: HTTP 503 Service Unavailable (Attempt 4/8)',
  },
  {
    id: 'act-04',
    type: 'failure',
    event_type: 'attendance.checked_in',
    subscribers_count: 1,
    tenant_name: 'Zenith Logistics',
    endpoint_name: 'Zenith Biometric & Transport Dispatch',
    time_ago: '45 sec ago',
    message: 'Max retries exhausted: Event sent to Dead Letter Queue (DLQ)',
  },
  {
    id: 'act-05',
    type: 'success',
    event_type: 'security.alert',
    subscribers_count: 3,
    tenant_name: 'Apex FinTech Solutions',
    endpoint_name: 'Apex Compliance & Audit SIEM Stream',
    time_ago: '1 min ago',
    message: 'Delivered to SIEM cluster (HTTP 200 • 118ms)',
  },
];

// -------------------------------------------------------------
// Service Implementation
// -------------------------------------------------------------
export const platformWebhooksMeshService = {
  // --- Metrics ---
  getMetrics(): EventMeshMetrics {
    const totalDeliveries = initialDeliveries.length;
    const delivered = initialDeliveries.filter((d) => d.status === 'Delivered').length;
    const successRate = totalDeliveries > 0 ? (delivered / totalDeliveries) * 100 : 99.72;

    const failingCount = initialEndpoints.filter((e) => e.status === 'Failing').length;

    return {
      events_per_min: 2482,
      events_per_min_trend: 12.4,
      delivery_success_pct: 99.72,
      delivery_success_trend: 0.21,
      failed_deliveries_count: 128,
      failed_deliveries_trend: -18.0,
      pending_queue_depth: 1842,
      queue_status: 'Healthy',
      active_endpoints_count: initialEndpoints.length,
      healthy_endpoints_count: initialEndpoints.length - failingCount,
      at_risk_endpoints_count: failingCount,
      dead_letter_count: initialDeadLetters.filter((d) => d.status === 'Pending Review').length,
      avg_latency_ms: 284,
      p95_latency_ms: 612,
      last_checked_sec: 8,
      mesh_status: failingCount > 0 ? 'Degraded' : 'Operational',
      mesh_status_message:
        failingCount > 0
          ? `${failingCount} webhook endpoint is experiencing elevated failure rates.`
          : 'All event routes and webhook delivery workers are operating normally.',
    };
  },

  // --- Endpoints ---
  getEndpoints(env?: WebhookEnvironment): WebhookEndpoint[] {
    if (env) return initialEndpoints.filter((e) => e.environment === env);
    return initialEndpoints;
  },

  getEndpointById(id: string): WebhookEndpoint | undefined {
    return initialEndpoints.find((e) => e.id === id);
  },

  async createEndpoint(data: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> {
    const newEndpoint: WebhookEndpoint = {
      id: `whk-${Date.now().toString().slice(-4)}`,
      organization_id: data.organization_id || 'org-custom-01',
      tenant_name: data.tenant_name || 'Custom Tenant',
      name: data.name || 'New Webhook Endpoint',
      description: data.description || '',
      environment: data.environment || 'Production',
      url: data.url || 'https://example.com/webhook',
      http_method: data.http_method || 'POST',
      status: 'Active',
      auth_type: data.auth_type || 'HMAC-SHA256',
      secret_id: `sec_${Date.now().toString().slice(-6)}`,
      secret_masked: 'whsec_••••••••••••••••' + Math.random().toString(36).slice(-4),
      secret_last_rotated: new Date().toISOString(),
      timeout_ms: data.timeout_ms || 10000,
      max_attempts: data.max_attempts || 8,
      backoff_strategy: data.backoff_strategy || 'exponential',
      initial_retry_delay_seconds: data.initial_retry_delay_seconds || 10,
      max_retry_delay_seconds: data.max_retry_delay_seconds || 1800,
      retry_status_codes: data.retry_status_codes || [408, 429, 500, 502, 503, 504],
      health_score: 100,
      success_rate: 100.0,
      failure_rate: 0.0,
      avg_latency_ms: 120,
      p95_latency_ms: 250,
      last_success_at: 'Just now',
      consecutive_failures: 0,
      events: data.events || ['employee.created'],
      ip_allowlist: data.ip_allowlist || [],
      created_by: 'WorkForce Super Admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tls_verified: data.url?.startsWith('https://') ?? true,
    };

    initialEndpoints.unshift(newEndpoint);

    await this.logAudit({
      action: 'WEBHOOK_ENDPOINT_CREATED',
      resource_type: 'WebhookEndpoint',
      resource_id: newEndpoint.id,
      resource_name: newEndpoint.name,
      tenant_name: newEndpoint.tenant_name,
      reason: `Created new endpoint for URL ${newEndpoint.url} with ${newEndpoint.events.length} subscribed events`,
    });

    return newEndpoint;
  },

  async updateEndpoint(id: string, updates: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> {
    const endpoint = initialEndpoints.find((e) => e.id === id);
    if (!endpoint) throw new Error('Endpoint not found');

    Object.assign(endpoint, updates, { updated_at: new Date().toISOString() });

    await this.logAudit({
      action: 'WEBHOOK_ENDPOINT_UPDATED',
      resource_type: 'WebhookEndpoint',
      resource_id: endpoint.id,
      resource_name: endpoint.name,
      tenant_name: endpoint.tenant_name,
      reason: `Updated configuration for endpoint ${endpoint.name}`,
    });

    return endpoint;
  },

  async toggleEndpointStatus(id: string, newStatus: 'Active' | 'Paused' | 'Disabled'): Promise<WebhookEndpoint> {
    const endpoint = initialEndpoints.find((e) => e.id === id);
    if (!endpoint) throw new Error('Endpoint not found');

    const previousStatus = endpoint.status;
    endpoint.status = newStatus;
    endpoint.updated_at = new Date().toISOString();
    if (newStatus === 'Paused') endpoint.paused_at = new Date().toISOString();

    await this.logAudit({
      action: `WEBHOOK_ENDPOINT_${newStatus.toUpperCase()}`,
      resource_type: 'WebhookEndpoint',
      resource_id: endpoint.id,
      resource_name: endpoint.name,
      tenant_name: endpoint.tenant_name,
      reason: `Changed endpoint status from ${previousStatus} to ${newStatus}`,
    });

    return endpoint;
  },

  async rotateSecret(id: string, gracePeriodHours: number = 48): Promise<{ newSecret: string; gracePeriodHours: number }> {
    const endpoint = initialEndpoints.find((e) => e.id === id);
    if (!endpoint) throw new Error('Endpoint not found');

    const randomSuffix = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const newSecret = `whsec_${endpoint.environment === 'Staging' ? 'stg_' : ''}${randomSuffix}`;

    endpoint.secret_masked = `whsec_••••••••••••••••${newSecret.slice(-4)}`;
    endpoint.secret_last_rotated = new Date().toISOString();
    endpoint.updated_at = new Date().toISOString();

    await this.logAudit({
      action: 'WEBHOOK_SECRET_ROTATED',
      resource_type: 'WebhookEndpoint',
      resource_id: endpoint.id,
      resource_name: endpoint.name,
      tenant_name: endpoint.tenant_name,
      reason: `Rotated HMAC secret with a ${gracePeriodHours}-hour transition grace period`,
    });

    return { newSecret, gracePeriodHours };
  },

  async verifyEndpointUrl(url: string, method: string = 'POST', authType: string = 'HMAC-SHA256'): Promise<{
    success: boolean;
    http_status: number;
    latency_ms: number;
    response_body: string;
    message: string;
  }> {
    await new Promise((r) => setTimeout(r, 600));

    if (!url.startsWith('https://') && !url.includes('localhost')) {
      return {
        success: false,
        http_status: 400,
        latency_ms: 12,
        response_body: '{"error": "InsecureProtocolError", "message": "HTTPS is mandatory for production webhooks"}',
        message: 'Endpoint verification failed: HTTPS protocol is required for security compliance.',
      };
    }

    if (url.includes('failing') || url.includes('invalid')) {
      return {
        success: false,
        http_status: 502,
        latency_ms: 450,
        response_body: '{"error": "BadGateway", "message": "Remote host refused handshake connection"}',
        message: 'Endpoint verification failed with HTTP 502 Bad Gateway.',
      };
    }

    return {
      success: true,
      http_status: 200,
      latency_ms: 142,
      response_body: '{"status": "ok", "verification_token": "wf_verify_882910"}',
      message: 'Endpoint successfully verified. WorkForceOS test ping returned HTTP 200 OK (142ms).',
    };
  },

  // --- Deliveries ---
  getDeliveries(filters?: {
    endpoint_id?: string;
    status?: string;
    environment?: WebhookEnvironment;
    search?: string;
    http_code?: string;
  }): WebhookDelivery[] {
    let result = [...initialDeliveries];

    if (filters?.environment) {
      result = result.filter((d) => d.environment === filters.environment);
    }
    if (filters?.endpoint_id) {
      result = result.filter((d) => d.endpoint_id === filters.endpoint_id);
    }
    if (filters?.status && filters.status !== 'All') {
      result = result.filter((d) => d.status === filters.status);
    }
    if (filters?.http_code) {
      if (filters.http_code === '2xx') result = result.filter((d) => d.http_status >= 200 && d.http_status < 300);
      if (filters.http_code === '4xx') result = result.filter((d) => d.http_status >= 400 && d.http_status < 500);
      if (filters.http_code === '5xx') result = result.filter((d) => d.http_status >= 500);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (d) =>
          d.id.toLowerCase().includes(q) ||
          d.event_id.toLowerCase().includes(q) ||
          d.event_type.toLowerCase().includes(q) ||
          d.endpoint_name.toLowerCase().includes(q) ||
          d.tenant_name.toLowerCase().includes(q) ||
          d.http_status.toString().includes(q)
      );
    }

    return result;
  },

  getDeliveryById(id: string): WebhookDelivery | undefined {
    return initialDeliveries.find((d) => d.id === id);
  },

  async retryDelivery(deliveryId: string): Promise<WebhookDelivery> {
    const delivery = initialDeliveries.find((d) => d.id === deliveryId);
    if (!delivery) throw new Error('Delivery not found');

    const newAttemptNumber = delivery.attempt_count + 1;
    const now = new Date().toISOString();

    const newAttempt: WebhookDeliveryAttempt = {
      id: `att-${delivery.id}-${newAttemptNumber}`,
      delivery_id: delivery.id,
      attempt_number: newAttemptNumber,
      request_timestamp: now,
      http_status: 200,
      response_time_ms: 164,
      request_headers: { ...delivery.request_headers, 'X-WorkForceOS-Delivery-Attempt': String(newAttemptNumber) },
      response_headers: { 'server': 'WorkForceOS-RetryEngine/2.4', 'content-type': 'application/json' },
      response_body: JSON.stringify({ status: 'PROCESSED_AFTER_MANUAL_RETRY', timestamp: now }),
    };

    delivery.status = 'Delivered';
    delivery.http_status = 200;
    delivery.response_time_ms = 164;
    delivery.attempt_count = newAttemptNumber;
    delivery.delivered_at = now;
    delivery.last_error_code = undefined;
    delivery.last_error_message = undefined;
    delivery.attempts.push(newAttempt);

    await this.logAudit({
      action: 'WEBHOOK_DELIVERY_RETRIED',
      resource_type: 'WebhookDelivery',
      resource_id: delivery.id,
      resource_name: `${delivery.event_type} (${delivery.endpoint_name})`,
      tenant_name: delivery.tenant_name,
      reason: `Super Admin manually retriggered delivery ${delivery.id} for event ${delivery.event_type}`,
    });

    return delivery;
  },

  async bulkRetryFailures(endpointId?: string): Promise<{ retriedCount: number }> {
    const targets = initialDeliveries.filter((d) => d.status === 'Failed' && (!endpointId || d.endpoint_id === endpointId));
    for (const d of targets) {
      d.status = 'Delivered';
      d.http_status = 200;
      d.response_time_ms = 188;
      d.attempt_count += 1;
      d.delivered_at = new Date().toISOString();
      d.last_error_code = undefined;
      d.last_error_message = undefined;
    }

    await this.logAudit({
      action: 'WEBHOOK_BULK_DELIVERY_RETRIED',
      resource_type: 'WebhookDelivery',
      resource_id: 'bulk',
      resource_name: `${targets.length} deliveries`,
      reason: `Bulk retried ${targets.length} failed webhook deliveries across platform`,
    });

    return { retriedCount: targets.length };
  },

  // --- Dead Letter Queue (DLQ) ---
  getDeadLetters(): DeadLetterEvent[] {
    return initialDeadLetters;
  },

  async retryDeadLetter(dlqId: string): Promise<DeadLetterEvent> {
    const target = initialDeadLetters.find((d) => d.id === dlqId);
    if (!target) throw new Error('Dead letter event not found');

    target.status = 'Requeued';

    await this.logAudit({
      action: 'DEAD_LETTER_EVENT_REQUEUED',
      resource_type: 'DeadLetterEvent',
      resource_id: target.id,
      resource_name: `${target.event_type} (${target.endpoint_name})`,
      tenant_name: target.tenant_name,
      reason: `Requeued DLQ event ${target.event_id} to high-priority retry buffer`,
    });

    return target;
  },

  async discardDeadLetter(dlqId: string, reason: string): Promise<DeadLetterEvent> {
    const target = initialDeadLetters.find((d) => d.id === dlqId);
    if (!target) throw new Error('Dead letter event not found');

    target.status = 'Discarded';

    await this.logAudit({
      action: 'DEAD_LETTER_EVENT_DISCARDED',
      resource_type: 'DeadLetterEvent',
      resource_id: target.id,
      resource_name: `${target.event_type} (${target.endpoint_name})`,
      tenant_name: target.tenant_name,
      reason: `Discarded dead letter event: ${reason}`,
    });

    return target;
  },

  // --- Event Catalog ---
  getEventTypes(): EventTypeSchema[] {
    return initialEventTypes;
  },

  getEventTypeByName(name: string): EventTypeSchema | undefined {
    return initialEventTypes.find((e) => e.name === name);
  },

  // --- Failure Center ---
  getFailureGroups(): FailureGroup[] {
    return initialFailureGroups;
  },

  // --- Mesh Routes & Consumers ---
  getEventRoutes(): EventRoute[] {
    return initialEventRoutes;
  },

  getEventConsumers(): EventConsumer[] {
    return initialEventConsumers;
  },

  // --- Live Activity Feed ---
  getLiveActivity(): LiveActivityItem[] {
    return initialLiveActivity;
  },

  // --- Webhook Audit Logs ---
  getAuditLogs(): WebhookAuditLog[] {
    return initialAuditLogs;
  },

  async logAudit(entry: Omit<WebhookAuditLog, 'id' | 'actor_name' | 'actor_role' | 'timestamp' | 'ip_address'>): Promise<void> {
    const newLog: WebhookAuditLog = {
      id: `aud-wh-${Date.now().toString().slice(-6)}`,
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      ip_address: '103.24.12.8',
      ...entry,
    };
    initialAuditLogs.unshift(newLog);

    // Also register in platform-wide audit service
    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id,
      severity: entry.action.includes('DISCARD') || entry.action.includes('ROTATED') ? 'High' : 'Normal',
      reason: entry.reason,
    });
  },

  // --- Send Test Event Simulator ---
  async sendTestEvent(params: {
    endpoint_id: string;
    event_type: string;
    custom_payload?: Record<string, any>;
  }): Promise<{
    success: boolean;
    event_id: string;
    http_status: number;
    latency_ms: number;
    signature: string;
    request_headers: Record<string, string>;
    response_headers: Record<string, string>;
    response_body: string;
  }> {
    const endpoint = initialEndpoints.find((e) => e.id === params.endpoint_id);
    if (!endpoint) throw new Error('Endpoint not found');

    const eventId = `evt_test_${Date.now().toString(36)}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = `t=${timestamp},v1=${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
      'User-Agent': 'WorkForceOS-EventMesh/2.4 (Enterprise Test Dispatcher)',
      'X-WorkForceOS-Event': params.event_type,
      'X-WorkForceOS-Event-ID': eventId,
      'X-WorkForceOS-Timestamp': timestamp,
      'X-WorkForceOS-Signature': signature,
      'X-WorkForceOS-Version': '2026-01',
      'X-WorkForceOS-Is-Test': 'true',
    };

    if (endpoint.auth_type === 'Bearer Token') {
      reqHeaders['Authorization'] = 'Bearer whsec_live_test_token_99';
    }

    await new Promise((r) => setTimeout(r, 450));

    const isFailing = endpoint.status === 'Failing';
    const httpStatus = isFailing ? 503 : 200;
    const latency = isFailing ? 4200 : Math.floor(Math.random() * 180) + 70;

    const resHeaders: Record<string, string> = {
      'content-type': 'application/json; charset=utf-8',
      'server': 'Inbound-Webhook-Receiver/2.0',
      'x-test-event-acknowledged': 'true',
      'date': new Date().toUTCString(),
    };

    const resBody = isFailing
      ? JSON.stringify({ error: 'Service Unavailable', message: 'Target listener downstream overload', code: 'DOWNSTREAM_ERROR' }, null, 2)
      : JSON.stringify(
          {
            success: true,
            received_event: params.event_type,
            test_mode: true,
            message: 'Webhook payload verified and processed successfully',
            signature_valid: true,
          },
          null,
          2
        );

    // Register test delivery
    const testDelivery: WebhookDelivery = {
      id: `del-test-${Date.now().toString().slice(-4)}`,
      event_id: eventId,
      event_uuid: `wh-test-${eventId}`,
      event_type: params.event_type,
      endpoint_id: endpoint.id,
      endpoint_name: endpoint.name,
      tenant_name: endpoint.tenant_name || 'System Test',
      organization_id: endpoint.organization_id,
      environment: endpoint.environment,
      status: isFailing ? 'Failed' : 'Delivered',
      attempt_count: 1,
      max_attempts: endpoint.max_attempts,
      http_status: httpStatus,
      response_time_ms: latency,
      queued_at: new Date().toISOString(),
      delivered_at: isFailing ? undefined : new Date().toISOString(),
      failed_at: isFailing ? new Date().toISOString() : undefined,
      last_error_code: isFailing ? 'ERR_503' : undefined,
      last_error_message: isFailing ? '503 Service Unavailable' : undefined,
      request_headers: reqHeaders,
      response_headers: resHeaders,
      payload: params.custom_payload || {
        id: eventId,
        type: params.event_type,
        is_test: true,
        created_at: new Date().toISOString(),
        tenant_id: endpoint.organization_id,
      },
      response_body: resBody,
      attempts: [
        {
          id: `att-test-${eventId}-1`,
          delivery_id: `del-test-${eventId}`,
          attempt_number: 1,
          request_timestamp: new Date().toISOString(),
          http_status: httpStatus,
          response_time_ms: latency,
          request_headers: reqHeaders,
          response_headers: resHeaders,
          response_body: resBody,
        },
      ],
    };

    initialDeliveries.unshift(testDelivery);

    await this.logAudit({
      action: 'TEST_WEBHOOK_EVENT_DISPATCHED',
      resource_type: 'WebhookEndpoint',
      resource_id: endpoint.id,
      resource_name: endpoint.name,
      tenant_name: endpoint.tenant_name,
      reason: `Dispatched manual test event ${params.event_type} (Status: HTTP ${httpStatus}, Latency: ${latency}ms)`,
    });

    return {
      success: !isFailing,
      event_id: eventId,
      http_status: httpStatus,
      latency_ms: latency,
      signature,
      request_headers: reqHeaders,
      response_headers: resHeaders,
      response_body: resBody,
    };
  },

  // --- Historical Replay Simulation ---
  async previewReplay(params: {
    event_type?: string;
    endpoint_id?: string;
    tenant_id?: string;
    hours_back: number;
  }): Promise<{ matchingEventsCount: number; estimatedDeliveryTimeSec: number }> {
    await new Promise((r) => setTimeout(r, 300));
    const baseCount = Math.floor(params.hours_back * 42);
    return {
      matchingEventsCount: baseCount,
      estimatedDeliveryTimeSec: Math.ceil(baseCount / 15),
    };
  },

  async executeReplay(params: {
    event_type?: string;
    endpoint_id?: string;
    tenant_id?: string;
    hours_back: number;
  }): Promise<{ jobId: string; queuedEventsCount: number }> {
    const preview = await this.previewReplay(params);
    const jobId = `replay-job-${Date.now().toString().slice(-5)}`;

    await this.logAudit({
      action: 'HISTORICAL_EVENTS_REPLAY_QUEUED',
      resource_type: 'EventReplayJob',
      resource_id: jobId,
      reason: `Queued historical replay for past ${params.hours_back} hours (${preview.matchingEventsCount} events queued)`,
    });

    return {
      jobId,
      queuedEventsCount: preview.matchingEventsCount,
    };
  },
};
