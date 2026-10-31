# JOY PeopleHR — Database ↔ Application Connection Matrix
**Target Database Project:** `ysiajemrqakfngasehhi` (Canonical PostgreSQL 15 / Supabase)  
**Total Canonical Tables:** 65 Tables across 18 Domains  
**Audit Date:** September 3, 2026  

---

## 1. Domain-by-Domain Connection Matrix

| Table Name | Used by App? | Primary Service | Primary Hook / Context | Primary UI Screen | SELECT | INSERT | UPDATE | DELETE | RPC Used | Company Filter | Org Filter | RLS Status | Connection Status | Problems / Identified Gaps |
| :--- | :---: | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Domain 01: Platform Control Plane** | | | | | | | | | | | | | | |
| `platform_users` | Partial | `platformStaffService.ts` | `usePlatformAuth()` | `PlatformAdminMaster.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | N/A | N/A | ENFORCED | PARTIAL | Service references legacy column `role_type` instead of `role`. |
| `platform_plans` | Yes | `platformBillingService.ts` | `usePlatformPlans()` | `PlatformPlansView.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | N/A | N/A | ENFORCED | CONNECTED | Direct query verified. |
| `saas_subscriptions` | Yes | `saasSubscriptionService.ts` | `useSubscription()` | `SubscriptionBillingView.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Scoped to `organization_id`. |
| `background_jobs` | Partial | `workforce-gateway-agent.cjs` | Background Queue | `RealtimeHealthView.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | PARTIAL | Polling agent uses direct API; UI only reads queue metrics. |
| **Domain 02: Organization & Corporate Hierarchy** | | | | | | | | | | | | | | |
| `organizations` | Yes | `organizationService.ts`, `api.ts` | `useOrganization()` | `CompanySettingsView.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | N/A | ✅ | ENFORCED | CONNECTED | Root tenant record query verified. |
| `companies` | Yes | `companyService.ts`, `api.ts` | `useCompanyContext()` | `CompanyManagementView.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ENFORCED | CONNECTED | Multi-company catalog under active organization. |
| `branches` | Yes | `branchService.ts`, `api.ts` | `useBranches()` | `BranchLocationView.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ENFORCED | CONNECTED | Queries link `company_id` and `organization_id`. |
| `work_locations` | Yes | `locationService.ts` | `useWorkLocations()` | `BranchLocationView.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ENFORCED | CONNECTED | Geofence perimeters mapped to branches. |
| `departments` | Yes | `departmentService.ts`, `api.ts` | `useDepartments()` | `DepartmentDirectoryView.tsx`| ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ENFORCED | CONNECTED | Parent-child tree supported. |
| `designations` | Yes | `designationService.ts`, `api.ts` | `useDesignations()` | `DesignationDirectoryView.tsx`| ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ENFORCED | CONNECTED | Designation grades mapped to companies. |
| **Domain 03: IAM & RBAC** | | | | | | | | | | | | | | |
| `user_profiles` | Yes | `authService.ts`, `api.ts` | `useAuth()`, `useUser()` | `App.tsx`, `UserProfileDrawer.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Ties `auth.users` to `organizations`. |
| `roles` | Yes | `roleService.ts`, `permissionEngine.ts`| `useRBAC()` | `RolePermissionMaster.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Organization-level custom and system roles. |
| `permissions` | Yes | `permissionEngine.ts` | `usePermissions()` | `RolePermissionMaster.tsx` | ✅ | ❌ | ❌ | ❌ | ❌ | N/A | N/A | ENFORCED | CONNECTED | Read-only global permissions catalog. |
| `role_permissions` | Yes | `permissionEngine.ts` | `useRBAC()` | `RolePermissionMaster.tsx` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Scoped permissions mapping. |
| `user_roles` | Yes | `authService.ts`, `api.ts` | `useAuth()` | `NavigationHeader.tsx` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Links user profiles to active roles. |
| **Domain 04: Workforce Core** | | | | | | | | | | | | | | |
| `employees` | Yes | `employeeService.ts`, `api.ts` | `useEmployees()` | `EmployeeDirectoryView.tsx` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ENFORCED | CONNECTED | Core master. Company filter applied in service. |
| `employee_profiles` | Yes | `profileService.ts`, `api.ts` | `useEmployeeProfile()` | `EmployeeProfileDrawer.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Personal demographics linked via `employee_id`. |
| `employee_addresses` | Yes | `profileService.ts`, `api.ts` | `useEmployeeProfile()` | `EmployeeProfileDrawer.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Present & Permanent address lines. |
| `employee_bank_details` | Yes | `payrollApi.ts`, `api.ts` | `useBankDetails()` | `BankStatutoryTab.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Bank account numbers & IFSC codes. |
| `employee_statutory_details`| Yes | `payrollApi.ts`, `api.ts`| `useStatutoryDetails()`| `BankStatutoryTab.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | PAN, Aadhaar, UAN, PF, ESI. |
| **Domain 05: Lifecycle & Separation** | | | | | | | | | | | | | | |
| `employee_onboarding` | Yes | `onboardingService.ts` | `useOnboarding()` | `OnboardingWizardView.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Pre-joining & document checklists. |
| `employee_lifecycle_events` | Yes | `lifecycleService.ts` | `useLifecycle()` | `CareerTimelineTab.tsx` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Historical timeline log. |
| `employee_separations` | Yes | `separationService.ts` | `useSeparation()` | `OffboardingResignationView.tsx`| ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Resignation & FnF clearance. |
| **Domain 06: Attendance & Biometrics** | | | | | | | | | | | | | | |
| `biometric_devices` | Yes | `biometricService.ts` | `useBiometricDevices()` | `BiometricDeviceManager.tsx` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Hardware terminal configurations. |
| `attendance_punches` | Yes | `attendanceService.ts`, `gateway.cjs`| `useRealtimePunches()` | `LivePunchStreamView.tsx` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Append-only raw punch stream. |
| `attendance_daily` | Yes | `attendanceService.ts`, `api.ts` | `useAttendance()` | `DailyAttendanceRoster.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Daily attendance rollups. |
| `attendance_regularizations`| Yes| `attendanceService.ts` | `useRegularization()` | `AttendanceRegularizationModal.tsx`| ✅| ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Correction request workflows. |
| **Domain 07: Shifts & Rosters** | | | | | | | | | | | | | | |
| `shifts` | Yes | `shiftService.ts` | `useShifts()` | `ShiftRosterPlanner.tsx` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Shift timing definitions. |
| `employee_shift_assignments`| Yes| `shiftService.ts` | `useShiftAssignments()` | `ShiftRosterPlanner.tsx` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Rotational shift bindings. |
| **Domain 08: Leave & Holidays** | | | | | | | | | | | | | | |
| `leave_types` | Yes | `leaveApi.ts`, `leaveService.ts` | `useLeaveTypes()` | `LeavePolicyConfigView.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Annual quotas & accrual settings. |
| `leave_balances` | Yes | `leaveApi.ts`, `leaveService.ts` | `useLeaveBalances()` | `LeaveBalanceOverview.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Live balance snapshot. |
| `leave_requests` | Yes | `leaveApi.ts`, `leaveService.ts` | `useLeaveRequests()` | `LeaveApplicationsView.tsx` | ✅ | ✅ | ✅ | ❌ | `fn_approve_leave_request` | ❌ | ✅ | ENFORCED | CONNECTED | Multi-day leave requests. |
| `leave_ledger_entries` | Yes | `leaveApi.ts` | `useLeaveLedger()` | `LeaveLedgerAuditView.tsx` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Read-only financial ledger. |
| `holidays` | Yes | `holidayService.ts` | `useHolidays()` | `HolidayCalendarView.tsx` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ENFORCED | CONNECTED | Organization & company holidays. |
| **Domain 09: Universal Approvals** | | | | | | | | | | | | | | |
| `approval_workflows` | Yes | `approvalWorkflowEngine.ts` | `useApprovals()` | `ApprovalConfigView.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Configurable multi-tier pipelines. |
| `approval_instances` | Yes | `approvalWorkflowEngine.ts` | `usePendingApprovals()` | `ApprovalInboxMaster.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Running workflow tickets. |
| `approval_actions` | Yes | `approvalWorkflowEngine.ts` | `useApprovalHistory()` | `ApprovalInboxMaster.tsx` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Action logs with reviewer comments. |
| **Domain 10: Payroll & Compensation** | | | | | | | | | | | | | | |
| `salary_components` | Yes | `payrollApi.ts` | `useSalaryComponents()` | `SalaryComponentConfig.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Earnings & deduction catalog. |
| `salary_structures` | Yes | `payrollApi.ts` | `useSalaryStructures()` | `SalaryStructureBuilder.tsx`| ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Standardized compensation templates. |
| `salary_structure_components`| Yes| `payrollApi.ts` | `useSalaryStructures()` | `SalaryStructureBuilder.tsx`| ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Structure component breakdowns. |
| `employee_salary_assignments`| Yes| `payrollApi.ts` | `useEmployeeCTC()` | `EmployeeSalaryRevisionModal.tsx`| ✅| ✅| ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | CTC & revision assignments. |
| `payroll_runs` | Yes | `payrollApi.ts`, `payrollService.ts`| `usePayrollRuns()` | `PayrollRunWorkspace.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ENFORCED | CONNECTED | Monthly batch cycles. |
| `payroll_line_items` | Yes | `payrollApi.ts` | `usePayrollLineItems()` | `PayrollRunWorkspace.tsx` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Employee payslip lines. |
| `payslips` | Yes | `payrollApi.ts`, `documentService.ts`| `usePayslips()` | `EmployeePayslipView.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Digital payslip metadata. |
| **Domain 11: Vendor & Manpower OS** | | | | | | | | | | | | | | |
| `vendors` | Yes | `vendorService.ts` | `useVendors()` | `VendorDirectoryMaster.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Contractor agency master. |
| `vendor_workers` | Yes | `vendorService.ts` | `useVendorWorkers()` | `VendorDeploymentView.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ENFORCED | CONNECTED | External worker deployments. |
| `vendor_invoices` | Yes | `vendorService.ts` | `useVendorInvoices()` | `VendorBillingView.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Agency invoices and service bills. |
| **Domain 12: Performance & Talent** | | | | | | | | | | | | | | |
| `performance_cycles` | Yes | `performanceService.ts` | `usePerformanceCycles()`| `PerformanceCycleManager.tsx`| ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Appraisal evaluation windows. |
| `performance_goals` | Yes | `performanceService.ts` | `useGoals()` | `GoalSettingWorkspace.tsx` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | OKRs and KPI metrics. |
| `performance_reviews` | Yes | `performanceService.ts` | `useReviews()` | `PerformanceAppraisalMaster.tsx`| ✅| ✅| ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Self & manager reviews. |
| **Domain 13: LMS & Training** | | | | | | | | | | | | | | |
| `lms_courses` | Yes | `lmsService.ts` | `useCourses()` | `LMSCourseCatalogView.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Internal training modules. |
| `lms_enrollments` | Yes | `lmsService.ts` | `useEnrollments()` | `MyLearningWorkspace.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Employee course progress. |
| **Domain 14: Documents Storage** | | | | | | | | | | | | | | |
| `document_types` | Yes | `documentService.ts` | `useDocTypes()` | `DocumentConfigMaster.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Document classification catalog. |
| `employee_documents` | Yes | `documentService.ts`, `profileService.ts`| `useDocuments()` | `EmployeeDocumentVault.tsx` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Supabase Storage file metadata. |
| **Domain 15: Requests & POSH** | | | | | | | | | | | | | | |
| `employee_requests` | Yes | `serviceCatalogService.ts` | `useRequests()` | `HelpdeskTicketingView.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Service requests & HR helpdesk. |
| `posh_and_grievance_cases` | Yes| `poshService.ts` | `usePOSHCases()` | `ConfidentialPOSHVault.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Confidential inquiry records. |
| **Domain 16: Assets Management** | | | | | | | | | | | | | | |
| `assets` | Yes | `assetService.ts` | `useAssets()` | `AssetInventoryMaster.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ENFORCED | CONNECTED | Hardware & license inventory. |
| `asset_assignments` | Yes | `assetService.ts` | `useAssetAssignments()` | `AssetAllocationDrawer.tsx`| ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Allocation history per employee. |
| **Domain 17: Recruitment & ATS** | | | | | | | | | | | | | | |
| `job_openings` | Yes | `recruitmentService.ts` | `useJobOpenings()` | `JobRequisitionBoard.tsx` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ENFORCED | CONNECTED | Job vacancies & career postings. |
| `job_applicants` | Yes | `recruitmentService.ts` | `useApplicants()` | `CandidatePipelineBoard.tsx`| ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Candidate interview stages. |
| **Domain 18: Mesh & Audit** | | | | | | | | | | | | | | |
| `notification_events` | Yes | `enterpriseNotificationEngine.ts`| `useNotifications()` | `NotificationCenterDrawer.tsx`| ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Outbox notifications stream. |
| `webhook_endpoints` | Yes | `webhookService.ts` | `useWebhooks()` | `WebhookSettingsView.tsx` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Outbound HTTP webhook targets. |
| `webhook_deliveries` | Yes | `webhookService.ts` | `useWebhookLogs()` | `WebhookSettingsView.tsx` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Delivery attempts audit log. |
| `audit_logs` | Yes | `observabilityLogger.ts` | `useAuditLogs()` | `SecurityAuditLogView.tsx` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ENFORCED | CONNECTED | Security & operational logs. |
