# Joy PeopleHR — Complete Technical Audit & Database Inventory

**System Forensic Audit, Canonical Schema Inventory & Engineering Risk Assessment**  
**Database URL:** `https://ysiajemrqakfngasehhi.supabase.co`  
**Schema Standard:** 64 Greenfield PostgreSQL 15+ Tables with Kernel-Level Row-Level Security (RLS).

---

## 1. Canonical Database Architecture (64 Tables)

### A. Platform & Tenant Root Layer
1. `public.platform_users`: Platform administrators, operators, and support engineers (`id UUID PK`, `email`, `role`, RLS active).
2. `public.platform_plans`: SaaS subscription tiers, employee capacity thresholds, feature flag definitions (`id UUID PK`, `plan_code`, `limits`).
3. `public.organizations`: Master multi-tenant enterprise umbrella (`id UUID PK`, `name`, `subdomain`, `subscription_tier`).
4. `public.companies`: Legal business entities under an organization (`id UUID PK`, `organization_id FK`, `legal_name`, `pan`, `gstin`).
5. `public.branches`: Physical branch facilities and office buildings (`id UUID PK`, `company_id FK`, `branch_code`, `city`).
6. `public.departments`: Functional divisions (Engineering, HR, Sales) (`id UUID PK`, `organization_id FK`, `company_id FK`, `dept_code`).
7. `public.teams`: Operational subdivisions within departments (`id UUID PK`, `department_id FK`, `team_lead_id FK`).
8. `public.designations`: Job roles and hierarchical grades (`id UUID PK`, `organization_id FK`, `title`, `level`).
9. `public.work_locations`: Geofenced locations with lat/long and radius (`id UUID PK`, `company_id FK`, `latitude`, `longitude`, `radius_meters`).

### B. Identity, Authentication & RBAC Layer
10. `public.user_profiles`: Application profile mapping to `auth.users` (`id UUID PK`, `auth_user_id FK`, `organization_id FK`, `role`).
11. `public.roles`: System and tenant-level role definitions (`id UUID PK`, `role_name`, `data_scope`).
12. `public.permissions`: Granular functional capability registry (`id UUID PK`, `permission_key`, `module`).
13. `public.role_permissions`: Association between roles and capability keys (`id UUID PK`, `role_id FK`, `permission_id FK`).
14. `public.user_roles`: User role assignments supporting multi-role operators (`id UUID PK`, `user_id FK`, `role_id FK`).

### C. Core Workforce & Lifecycle Layer
15. `public.employees`: Master employee entity (`id UUID PK`, `organization_id FK`, `company_id FK`, `employee_code`, `work_email`, `status`).
16. `public.employee_bank_details`: Salary disbursement bank account records (`id UUID PK`, `employee_id FK`, `account_number`, `ifsc_code`).
17. `public.employee_statutory_details`: Compliance identifiers (`id UUID PK`, `employee_id FK`, `pan`, `uan`, `esic_number`).
18. `public.emergency_contacts`: Primary and secondary emergency contacts (`id UUID PK`, `employee_id FK`, `contact_name`, `phone`).
19. `public.employee_addresses`: Permanent and current residential addresses (`id UUID PK`, `employee_id FK`, `address_line1`, `pincode`).
20. `public.employee_dependents`: Family dependents, nominees, and beneficiaries (`id UUID PK`, `employee_id FK`, `dependent_name`, `relationship`).
21. `public.employee_lifecycle_events`: Transfer, confirmation, promotion timeline (`id UUID PK`, `employee_id FK`, `event_type`, `effective_date`).
22. `public.separation_requests`: Resignation, exit interview, clearance checklist (`id UUID PK`, `employee_id FK`, `last_working_date`, `status`).

### D. Time, Biometric & Attendance Layer
23. `public.shifts`: Shift master timing definitions (`id UUID PK`, `organization_id FK`, `shift_code`, `start_time`, `end_time`, `grace_minutes`).
24. `public.shift_rosters`: Scheduled employee shift allocations (`id UUID PK`, `employee_id FK`, `shift_id FK`, `roster_date`).
25. `public.biometric_devices`: Physical biometric wall terminals (`id UUID PK`, `organization_id FK`, `ip_address`, `port`, `serial_number`).
26. `public.attendance_punches`: Raw immutable biometric/mobile clocking events (`id UUID PK`, `device_id FK`, `biometric_pin`, `punch_time`).
27. `public.attendance_records`: Aggregated daily attendance status (`id UUID PK`, `employee_id FK`, `attendance_date`, `status`, `ot_hours`).
28. `public.attendance_regularizations`: Missed punch and deviation requests (`id UUID PK`, `employee_id FK`, `requested_date`, `status`).
29. `public.overtime_records`: Authorized overtime calculations (`id UUID PK`, `employee_id FK`, `overtime_date`, `hours`, `payout_rate`).
30. `public.attendance_rules`: Configured automation rules (`id UUID PK`, `organization_id FK`, `rule_code`, `threshold_value`).

### E. Leave & Holiday Layer
31. `public.leave_types`: Leave policy catalog (Casual, Sick, Earned) (`id UUID PK`, `organization_id FK`, `type_code`, `annual_quota`).
32. `public.leave_balances`: Live annual leave credit balances (`id UUID PK`, `employee_id FK`, `leave_type_id FK`, `balance`, `year`).
33. `public.leave_requests`: Applied leave instances with approval chain (`id UUID PK`, `employee_id FK`, `start_date`, `end_date`, `status`).
34. `public.leave_ledger_entries`: Financial-grade immutable audit transactions (`id UUID PK`, `employee_id FK`, `transaction_type`, `amount`).
35. `public.holidays`: Master corporate and regional holiday calendar (`id UUID PK`, `organization_id FK`, `holiday_date`, `holiday_name`).

### F. Approvals & Event Mesh Layer
36. `public.approval_workflows`: Multi-stage approval flow definitions (`id UUID PK`, `organization_id FK`, `workflow_type`, `steps_json`).
37. `public.approval_instances`: Live executing approval processes (`id UUID PK`, `workflow_id FK`, `target_entity_id`, `current_step`).
38. `public.approval_actions`: Immutable approver action decisions (`id UUID PK`, `instance_id FK`, `approver_id FK`, `action`, `comments`).
39. `public.notification_events`: Universal outbox for alerts and push notifications (`id UUID PK`, `recipient_id FK`, `channel`, `payload`).
40. `public.webhook_endpoints`: Outbound enterprise webhook URLs (`id UUID PK`, `organization_id FK`, `endpoint_url`, `secret_key`).
41. `public.webhook_deliveries`: Delivery audit logs with HTTP response status (`id UUID PK`, `endpoint_id FK`, `status_code`, `attempts`).

### G. Payroll & Compensation Layer
42. `public.salary_structures`: CTC template structures (`id UUID PK`, `organization_id FK`, `structure_name`, `basic_percent`, `hra_percent`).
43. `public.employee_salary_assignments`: Individual salary component mappings (`id UUID PK`, `employee_id FK`, `structure_id FK`, `ctc_amount`).
44. `public.payroll_settings`: Cutoff days, pay schedules, rounding rules (`id UUID PK`, `company_id FK`, `pay_day`, `cutoff_day`).
45. `public.statutory_rules`: State-specific PF, ESI, PT, and LWF formulas (`id UUID PK`, `company_id FK`, `statutory_type`, `rule_config`).
46. `public.payroll_runs`: Authoritative monthly payroll processing batches (`id UUID PK`, `company_id FK`, `period`, `gross_payout`, `status`).
47. `public.payslips`: Finalized employee payslip records (`id UUID PK`, `payroll_run_id FK`, `employee_id FK`, `net_pay`, `storage_path`).
48. `public.statutory_filings`: EPFO ECR and ESIC remittance filing logs (`id UUID PK`, `payroll_run_id FK`, `challan_number`, `amount`).
49. `public.expense_claims`: Employee expense and travel reimbursement claims (`id UUID PK`, `employee_id FK`, `amount`, `receipt_url`).
50. `public.client_billing_runs`: Client-side manpower invoicing runs (`id UUID PK`, `company_id FK`, `client_id`, `total_billed`).

### H. Third-Party Vendor & Contractor Layer
51. `public.vendors`: External manpower and staffing vendor agencies (`id UUID PK`, `organization_id FK`, `vendor_code`, `pan`, `gstin`).
52. `public.vendor_contracts`: Commercial agreements, billing rates, SLAs (`id UUID PK`, `vendor_id FK`, `company_id FK`, `rate_card_json`).
53. `public.vendor_workers`: Third-party contract workforce personnel (`id UUID PK`, `vendor_id FK`, `worker_name`, `skill_level`, `uan`).
54. `public.vendor_deployments`: Site, facility, and shift assignments (`id UUID PK`, `worker_id FK`, `work_location_id FK`, `valid_until`).
55. `public.vendor_invoices`: Vendor tax invoices with 3-way match status (`id UUID PK`, `vendor_id FK`, `company_id FK`, `total_amount`, `match_status`).
56. `public.vendor_licenses`: CLRA contractor licenses and expiry dates (`id UUID PK`, `vendor_id FK`, `license_number`, `valid_until`).
57. `public.purchase_orders`: Authorized procurement purchase orders (`id UUID PK`, `company_id FK`, `vendor_id FK`, `authorized_amount`).

### I. Documents, Assets, Performance & LMS Layer
58. `public.document_categories`: Document classification hierarchy (`id UUID PK`, `organization_id FK`, `category_name`).
59. `public.employee_documents`: Uploaded KYC and employment files (`id UUID PK`, `employee_id FK`, `storage_path`, `verification_status`).
60. `public.assets`: Company hardware and property inventory (`id UUID PK`, `company_id FK`, `serial_number`, `asset_type`).
61. `public.asset_allocations`: Device assignment and handover history (`id UUID PK`, `asset_id FK`, `employee_id FK`, `allocated_date`).
62. `public.goals`: Performance KPI and OKR goal records (`id UUID PK`, `employee_id FK`, `goal_title`, `target_value`, `progress`).
63. `public.appraisal_reviews`: Performance review cycle submissions (`id UUID PK`, `employee_id FK`, `reviewer_id FK`, `rating`, `feedback`).
64. `public.courses`: Training and compliance LMS catalog (`id UUID PK`, `organization_id FK`, `course_title`, `duration_minutes`).

---

## 2. Automated Test Coverage & Verification

### Test Suites Audit
1. **Playwright E2E Integration Suite**:
   - `tests/e2e/attendance-drilldown-navigation.spec.ts` — 100% PASS (Drilldown, URL filters, Back/Forward single-click history).
   - `tests/e2e/sidebar-routing.spec.ts` — 100% PASS (Direct URL entry, page reloads, sidebar active classes, accordions).
   - `tests/vendor-login.spec.ts` — 100% PASS (Vendor authentication barrier, 1-click In-House Demo login, multi-stage workflow data).
2. **TypeScript Strict Typecheck**:
   - `npm run typecheck` (`tsc --noEmit`) — **0 errors**.
3. **Database Audit Scripts**:
   - `npm run audit:rls` — Validates RLS policies across all active tables.
   - `npm run audit:tenant` — Validates foreign key constraints and `organization_id` integrity.

---

## 3. Current Technical Risks & Engineering Safeguards

| Risk Area | Architectural Vulnerability | Engineering Mitigation in Place |
| :--- | :--- | :--- |
| **High-Density Biometric Punches** | Potential connection exhaustion if thousands of workers punch simultaneously. | **Database-First Manual Sync**: Sockets write raw records to an immutable punch buffer; processing runs asynchronously. |
| **Mobile Geofence Spoofing** | Mock GPS location apps spoofing office attendance. | Server validates location accuracy threshold (`accuracy < 25m`) and verifies against historical location telemetry. |
| **Dual Payroll Engines** | Risk of discrepancy between frontend preview and backend payroll calculation. | Consolidated into a single mathematical engine: [`authoritativePayrollEngine.ts`](file:///d:/web-app%20(2)/Joy%20PeopleHR/src/services/payroll/authoritativePayrollEngine.ts). |
| **Cross-Tenant Vendor Leaks** | Vendors accessing client corporate records. | Scoped `PortalType.VENDOR` sessions; RLS policies strictly prohibit vendor queries to direct employee tables. |
