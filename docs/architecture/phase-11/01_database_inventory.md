# 01. DATABASE INVENTORY — PHASE 11 FORENSIC AUDIT

**Target System:** Joy PeopleHR Enterprise SaaS  
**Release Baseline:** `v1.0.0-production-release` (`9830c3174c54fd615b0e91152174a5fb704f315c`)  
**Scope:** Migrations 001 through 093 (106 SQL files analyzed)  
**Total Declared Tables:** 318  

---

## 1. Inventory Summary

| Classification | Count | Description |
|---|:---:|---|
| **CANONICAL** | 19 | Core tables with extensive repository & UI bindings across the application. |
| **ACTIVE** | 118 | Tables with direct references in services, components, or feature views. |
| **COMPATIBILITY** | 109 | Schema-defined tenant tables supporting dual keys or auxiliary modules. |
| **ORPHAN_CANDIDATE** | 72 | Declared tables with 0 detected client repository references. |
| **TOTAL** | **318** | Complete table surface across migrations. |

---

## 2. Canonical & High-Frequency Business Tables

| Table Name | Module | Tenant Key | RLS | Repo Usages | Classification |
|:---|:---|:---:|:---:|:---:|:---:|
| `organizations` | Core | `tenant_id` | Yes | 18 usages | **CANONICAL** |
| `companies` | Core | `organization_id` | Yes | 9 usages | **CANONICAL** |
| `branches` | Core | `none` | Yes | 9 usages | **CANONICAL** |
| `departments` | Core | `organization_id` | Yes | 9 usages | **CANONICAL** |
| `designations` | Core | `none` | Yes | 7 usages | **CANONICAL** |
| `employees` | Core | `both (org+tenant)` | Yes | 28 usages | **CANONICAL** |
| `platform_staff` | Core | `none` | Yes | 8 usages | **CANONICAL** |
| `notification_events` | Core | `organization_id` | Yes | 14 usages | **CANONICAL** |
| `attendance_daily` | Core | `organization_id` | Yes | 14 usages | **CANONICAL** |
| `leave_requests` | Core | `organization_id` | Yes | 8 usages | **CANONICAL** |
| `employee_documents` | Core | `both (org+tenant)` | Yes | 6 usages | **CANONICAL** |
| `offers` | Core | `organization_id` | No | 6 usages | **CANONICAL** |
| `realtime_outbox` | Core | `both (org+tenant)` | Yes | 28 usages | **CANONICAL** |
| `document_requirements` | Core | `both (org+tenant)` | Yes | 6 usages | **CANONICAL** |
| `payroll_periods` | Core | `both (org+tenant)` | No | 6 usages | **CANONICAL** |
| `work_locations` | Core | `both (org+tenant)` | Yes | 7 usages | **CANONICAL** |
| `attendance_regularization_requests` | Core | `both (org+tenant)` | Yes | 6 usages | **CANONICAL** |
| `communications` | Core | `both (org+tenant)` | Yes | 9 usages | **CANONICAL** |
| `company_announcements` | Core | `both (org+tenant)` | Yes | 6 usages | **CANONICAL** |

---

## 3. Active Application Tables (Sample of 118 Tables)

| Table Name | Source Migration | Tenant Key | RLS | Repo References |
|:---|:---|:---:|:---:|:---:|
| `locations` | `20260814_001_initial_schema.sql` | `both` | Yes | 2 | 
| `roles` | `20260814_001_initial_schema.sql` | `org_id` | Yes | 4 | 
| `platform_subscriptions` | `20260814_004_platform_control_plane.sql` | `tenant_id` | Yes | 4 | 
| `platform_invoices` | `20260814_004_platform_control_plane.sql` | `tenant_id` | Yes | 2 | 
| `platform_background_jobs` | `20260814_004_platform_control_plane.sql` | `none` | Yes | 3 | 
| `platform_api_keys` | `20260814_004_platform_control_plane.sql` | `both` | Yes | 3 | 
| `platform_settings` | `20260814_004_platform_control_plane.sql` | `none` | Yes | 1 | 
| `subscriptions` | `20260814_005_plans_and_entitlements_schema.sql` | `tenant_id` | No | 1 | 
| `security_findings` | `20260814_006_security_center_schema.sql` | `tenant_id` | Yes | 2 | 
| `security_credentials` | `20260814_006_security_center_schema.sql` | `tenant_id` | Yes | 2 | 
| `security_policies` | `20260814_006_security_center_schema.sql` | `none` | Yes | 2 | 
| `compliance_controls` | `20260814_006_security_center_schema.sql` | `none` | Yes | 1 | 
| `api_security_metrics` | `20260814_006_security_center_schema.sql` | `none` | Yes | 1 | 
| `telemetry_sources` | `20260814_006_security_center_schema.sql` | `none` | Yes | 1 | 
| `audit_events` | `20260814_008_audit_events_schema.sql` | `tenant_id` | Yes | 3 | 
| `support_cases` | `20260814_009_support_center_schema.sql` | `both` | Yes | 4 | 
| `support_case_messages` | `20260814_009_support_center_schema.sql` | `none` | Yes | 1 | 
| `support_access_requests` | `20260814_009_support_center_schema.sql` | `tenant_id` | Yes | 3 | 
| `support_knowledge_articles` | `20260814_009_support_center_schema.sql` | `none` | Yes | 1 | 
| `support_customer_activity` | `20260814_009_support_center_schema.sql` | `tenant_id` | Yes | 1 | 
| `platform_job_queues` | `20260814_010_background_jobs_schema.sql` | `none` | Yes | 1 | 
| `platform_workers` | `20260814_010_background_jobs_schema.sql` | `none` | Yes | 2 | 
| `platform_scheduled_cron_jobs` | `20260814_010_background_jobs_schema.sql` | `none` | Yes | 2 | 
| `webhook_endpoints` | `20260814_012_webhooks_and_event_mesh_schema.sql` | `org_id` | Yes | 5 | 
| `event_routes` | `20260814_012_webhooks_and_event_mesh_schema.sql` | `none` | Yes | 1 | 
| `webhook_deliveries` | `20260814_012_webhooks_and_event_mesh_schema.sql` | `none` | Yes | 1 | 
| `platform_config_versions` | `20260814_013_platform_settings_and_integrations_schema.sql` | `none` | Yes | 1 | 
| `platform_maintenance_windows` | `20260814_013_platform_settings_and_integrations_schema.sql` | `none` | Yes | 2 | 
| `integration_connections` | `20260814_014_integration_platform_adapter_framework.sql` | `tenant_id` | Yes | 4 | 
| `integration_devices` | `20260814_014_integration_platform_adapter_framework.sql` | `tenant_id` | Yes | 2 | 

*(Full register of all 318 tables indexed in `07_legacy_object_register.md`)*
