# JOY PeopleHR — Enterprise Multi-Tenant Security & Isolation Matrix

**Document Version:** 3.0.0-PROD  
**Author:** Enterprise Security & Core Architecture Team  
**Scope:** Universal Tenant Isolation Across 20 Modules  

---

## 1. Executive Summary

In JOY PeopleHR, **multi-tenancy is an enforced security boundary** across all 20 business modules. No client-supplied `organization_id` is trusted from URLs, query parameters, request bodies, custom headers, or browser `localStorage`. Every operation requires an authoritative `AuthenticatedUserContext` verified against backend organization membership and database Row-Level Security (RLS).

---

## 2. Universal 20-Module Security & Isolation Matrix

| # | Module | Core Tables | Tenant Source & Foreign Key | RLS Status | API Auth & Scope | Realtime Channel | File/Doc Isolation | Background Jobs | Audit Logging | Isolation Status |
|---|---|---|---|---|---|---|---|---|---|---|
| **1** | **Employees & Directory** | `employees`, `employee_profiles`, `employee_statutory`, `employee_bank_details` | `organization_id` &rarr; `organizations(id)` | Strict RLS (`auth.uid()` &rarr; membership) | `employee.read`, `employee.update` | `org_{orgId}_employees` | Private S3 / Supabase storage path `organizations/{orgId}/employees/{empId}/` | Batched onboarding / profile sync | All profile & statutory edits | **CERTIFIED** |
| **2** | **Attendance & Matrix** | `attendance_daily`, `attendance_punches`, `attendance_events`, `attendance_regularization` | `organization_id` &rarr; `organizations(id)` | Strict RLS (tenant-isolated ledger) | `attendance.read`, `attendance.correct` | `org_{orgId}_attendance` | Attendance Excel/PDF exports signed per tenant | EOD partition checkpoint & night reconcile | Punch regularizations & manual corrections | **CERTIFIED** |
| **3** | **Biometric Devices & Mappings** | `biometric_devices`, `biometric_device_users`, `employee_biometric_mappings`, `biometric_sync_logs` | `organization_id` &rarr; `organizations(id)` | Strict RLS + composite device ownership | `device.manage`, `device.command` | `org_{orgId}_devices` | Device sync logs & biometric templates encrypted | Async user push & firmware sync | Remote commands (Restart, Push, Wipe) | **CERTIFIED** |
| **4** | **GPS & Geofencing** | `work_locations`, `branch_geofences`, `gps_attendance_logs` | `organization_id` &rarr; `organizations(id)` | Strict RLS (branch & location geofences) | `gps.read`, `gps.punch` | `org_{orgId}_gps` | Geotagged map capture snapshots | Realtime geofence validation | Coordinates & radius policy changes | **CERTIFIED** |
| **5** | **Shifts & Rosters** | `shift_masters`, `shift_rosters`, `shift_assignments` | `organization_id` &rarr; `organizations(id)` | Strict RLS (org & shift code) | `shift.manage`, `roster.edit` | `org_{orgId}_roster` | Roster import/export templates | Auto-roster rotation background worker | Shift overrides & roster republish | **CERTIFIED** |
| **6** | **Attendance Policy & Rules** | `attendance_rules`, `attendance_exceptions`, `rule_execution_logs` | `organization_id` &rarr; `organizations(id)` | Strict RLS + optimistic locking (`rule_version`) | `rules.manage`, `rules.simulate` | `org_{orgId}_rules` | Policy documentation & dry run exports | Rule execution audit stream | Rule creation, update, priority reorder | **CERTIFIED** |
| **7** | **Leave Management** | `leave_entitlements`, `leave_requests`, `leave_transactions`, `holidays` | `organization_id` &rarr; `organizations(id)` | Strict RLS (employee & approver hierarchy) | `leave.apply`, `leave.approve` | `org_{orgId}_leave` | Medical certificate attachments | Yearly leave balance accrual job | Leave applications, cancellations, approvals | **CERTIFIED** |
| **8** | **Work Overtime (OT)** | `ot_policies`, `ot_requests`, `ot_calculations` | `organization_id` &rarr; `organizations(id)` | Strict RLS (tenant OT rates) | `ot.calculate`, `ot.approve` | `org_{orgId}_ot` | OT verification slips | Automated shift end OT calculation | OT approvals, policy threshold modifications | **CERTIFIED** |
| **9** | **Payroll Core & Execution** | `payroll_runs`, `payroll_results`, `salary_structures`, `employee_salary_items` | `organization_id` &rarr; `organizations(id)` + unique `(org, period, run_type)` | Strict RLS + immutability on `LOCKED` | `payroll.calculate`, `payroll.lock`, `payroll.approve` | `org_{orgId}_payroll` | Encrypted payslip PDFs (`AES-256`) | Async batch gross-to-net computation | Payroll execution, approval, disbursement | **CERTIFIED** |
| **10** | **Statutory & Compliance** | `statutory_rules`, `pf_registers`, `esi_registers`, `pt_slabs`, `tds_declarations` | `organization_id` &rarr; `organizations(id)` | Strict RLS (State & Central statutory rules) | `statutory.read`, `statutory.file` | `org_{orgId}_statutory` | Form 16, PF ECR, ESI monthly returns | Monthly statutory ledger generation | Challan reference & tax slab updates | **CERTIFIED** |
| **11** | **Vendor Master & Governance** | `vendors`, `vendor_agreements`, `vendor_compliance_documents`, `vendor_invoices` | `organization_id` &rarr; `organizations(id)` | Strict RLS (tenant & authorized client orgs) | `vendor.manage`, `vendor.audit` | `org_{orgId}_vendors` | Vendor GST, PAN, Labour license docs | Compliance expiry scanner | Vendor onboarding, rate revision, approval | **CERTIFIED** |
| **12** | **Contractor & Manpower** | `vendor_workers`, `vendor_deployments`, `manpower_requisitions` | `organization_id` &rarr; `organizations(id)` | Strict RLS (tenant site & contractor scope) | `manpower.deploy`, `worker.checkin` | `org_{orgId}_contractors` | Contractor ID card, police verification | Deployment allocation & badge generation | Worker site assignments & checkouts | **CERTIFIED** |
| **13** | **Documents & E-Sign** | `employee_documents`, `document_templates`, `esign_envelopes`, `document_audit_trail` | `organization_id` &rarr; `organizations(id)` | Strict RLS + short-lived signed URLs (15m) | `document.view`, `document.sign` | `org_{orgId}_docs` | Path-isolated bucket: `organizations/{orgId}/docs/` | Asynchronous PDF rendering & watermark | Document creation, signature, revocation | **CERTIFIED** |
| **14** | **Asset & Inventory** | `company_assets`, `asset_allocations`, `asset_maintenance_logs` | `organization_id` &rarr; `organizations(id)` | Strict RLS (org & branch scope) | `asset.allocate`, `asset.audit` | `org_{orgId}_assets` | Asset invoice, warranty card uploads | Warranty & AMC expiration alert worker | Asset handover, return, write-off | **CERTIFIED** |
| **15** | **Expenses & Claims** | `expense_claims`, `expense_categories`, `expense_receipts`, `advance_requests` | `organization_id` &rarr; `organizations(id)` | Strict RLS (claimant, manager, finance) | `expense.submit`, `expense.audit` | `org_{orgId}_expenses` | Receipt images & tax invoices | Auto-settlement into payroll batch | Claim approval, rejection, disbursement | **CERTIFIED** |
| **16** | **Approvals & Workflows** | `approval_requests`, `approval_chains`, `delegated_approvals` | `organization_id` &rarr; `organizations(id)` | Strict RLS (approver authority matrix) | `approval.action`, `chain.configure` | `org_{orgId}_approvals` | Attached justification documents | Escalation & auto-approval timer | Approval actions, chain modifications | **CERTIFIED** |
| **17** | **Reports & Analytics** | `report_definitions`, `saved_reports`, `analytics_snapshots`, `export_jobs` | `organization_id` &rarr; `organizations(id)` | Strict RLS (tenant query isolation) | `report.generate`, `report.export` | `org_{orgId}_reports` | Tenant-isolated export storage bucket | Asynchronous large dataset export worker | Export generation with query fingerprint | **CERTIFIED** |
| **18** | **Notifications & Alerts** | `system_notifications`, `notification_templates`, `push_subscriptions` | `organization_id` &rarr; `organizations(id)` | Strict RLS (recipient `user_id` + `org_id`) | `notify.send`, `notify.read` | `org_{orgId}_notifications` | Notification asset banners | QStash async webhook/SMS/Email dispatcher | Notification dispatch & delivery confirmation | **CERTIFIED** |
| **19** | **Governance & Audit Logs** | `tenant_audit_logs`, `security_events`, `data_access_logs` | `organization_id` &rarr; `organizations(id)` | Strict RLS (Admin / Auditor read-only) | `audit.read` (immutable insert only) | `org_{orgId}_audit` | Exported compliance audit archives | SIEM streaming / retention archiver | Zero secrets logged, Request ID indexed | **CERTIFIED** |
| **20** | **Settings & Integrations** | `organization_settings`, `api_keys`, `webhook_endpoints`, `connector_tokens` | `organization_id` &rarr; `organizations(id)` | Strict RLS (Org Admin & Super Admin only) | `settings.edit`, `keys.rotate` | `org_{orgId}_settings` | Webhook SSL certificates | Automated webhook ping & health checker | Key generation, rotation, IP allowlist edit | **CERTIFIED** |

---

## 3. Boundary Verification Invariants

1. **Identity & Context Invariant:**
   `AuthenticatedUserContext` is constructed authoritatively from verified Supabase session tokens and organization memberships. Any `organization_id` sent in HTTP request bodies or query params is validated against `context.organizationId`; mismatched requests are rejected with `403 Forbidden`.
2. **Biometric Hardware Pipeline Invariant:**
   A biometric connector (`eSSL AI-FACE MAGNUM`) is cryptographically paired to its tenant `organization_id`. Ingested events flow through `Connector Token -> Org Binding -> Device Ownership -> Device User -> Employee Mapping -> Tenant Rule Engine`.
3. **Storage Invariant:**
   All files are stored at `organizations/{organization_id}/...`. Pre-signed URLs have a maximum TTL of 900 seconds (15 minutes) and require active tenant membership.
4. **Realtime Channel Invariant:**
   Frontend subscriptions must bind to `org_${organizationId}_${channel}`. Subscriptions to other tenants are blocked by PostgreSQL RLS replication filters.
