# JOY PeopleHR — Application ↔ Database Reverse Connection Matrix
**Target Database Project:** `ysiajemrqakfngasehhi` (Canonical PostgreSQL 15 / Supabase)  
**Total UI Workspaces:** 38 Workspaces  
**Audit Date:** September 3, 2026  

---

## 1. Complete Reverse Traversal Matrix

```
[UI Component / View] ──► [Hook / Context] ──► [Service Layer] ──► [Supabase Table / RPC] ──► [Company & Org Scope]
```

| UI Workspace / Screen | Primary Hook | Primary Service | Target Supabase Tables | Company Filter Scope | Organization Filter Scope | Audit Verification Status |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **01. Executive Overview** (`DashboardOverview.tsx`) | `useDashboardStats()` | `analyticsService.ts`, `api.ts` | `employees`, `attendance_daily`, `leave_requests`, `payroll_runs` | ✅ `company_id` | ✅ `organization_id` | **VERIFIED** |
| **02. Employee Directory** (`EmployeeDirectoryView.tsx`) | `useEmployees()` | `employeeService.ts`, `api.ts` | `employees`, `employee_profiles`, `departments`, `designations` | ✅ `company_id` | ✅ `organization_id` | **VERIFIED** |
| **03. Employee Profile 360** (`EmployeeProfileDrawer.tsx`) | `useEmployeeDetail()` | `profileService.ts`, `api.ts` | `employees`, `employee_profiles`, `employee_addresses`, `employee_bank_details`, `employee_statutory_details` | Inherited via `employee_id` | ✅ `organization_id` | **VERIFIED** |
| **04. Onboarding Hub** (`OnboardingWizardView.tsx`) | `useOnboarding()` | `onboardingService.ts` | `employee_onboarding`, `employee_documents`, `document_types` | Inherited via `employee_id` | ✅ `organization_id` | **VERIFIED** |
| **05. Offboarding & Resignations** (`OffboardingResignationView.tsx`)| `useSeparation()` | `separationService.ts` | `employee_separations`, `employees` | Inherited via `employee_id` | ✅ `organization_id` | **VERIFIED** |
| **06. Daily Attendance Roster** (`DailyAttendanceRoster.tsx`)| `useAttendance()` | `attendanceService.ts`, `api.ts` | `attendance_daily`, `attendance_punches`, `shifts` | Inherited via `employee_id` | ✅ `organization_id` | **VERIFIED** |
| **07. Shift & Rostering Planner** (`ShiftRosterPlanner.tsx`)| `useShifts()` | `shiftService.ts` | `shifts`, `employee_shift_assignments` | Inherited via `employee_id` | ✅ `organization_id` | **VERIFIED** |
| **08. Biometric Hardware Hub** (`BiometricDeviceManager.tsx`)| `useBiometricDevices()` | `biometricService.ts` | `biometric_devices`, `branches` | Inherited via `branch.company_id` | ✅ `organization_id` | **VERIFIED** |
| **09. Attendance Regularization** (`AttendanceRegularizationModal.tsx`)| `useRegularization()`| `attendanceService.ts` | `attendance_regularizations`, `attendance_daily` | Inherited via `employee_id` | ✅ `organization_id` | **VERIFIED** |
| **10. Leave Applications** (`LeaveApplicationsView.tsx`) | `useLeaveRequests()` | `leaveApi.ts`, `leaveService.ts` | `leave_requests`, `leave_balances`, `leave_types` | Inherited via `employee_id` | ✅ `organization_id` | **VERIFIED** |
| **11. Leave Balance & Quotas** (`LeaveBalanceOverview.tsx`) | `useLeaveBalances()` | `leaveApi.ts` | `leave_balances`, `leave_types` | Inherited via `employee_id` | ✅ `organization_id` | **VERIFIED** |
| **12. Holiday Calendar** (`HolidayCalendarView.tsx`) | `useHolidays()` | `holidayService.ts` | `holidays`, `companies`, `branches` | ✅ `company_id` | ✅ `organization_id` | **VERIFIED** |
| **13. Approval Inbox** (`ApprovalInboxMaster.tsx`) | `usePendingApprovals()` | `approvalWorkflowEngine.ts` | `approval_instances`, `approval_actions`, `approval_workflows` | Inherited via `target_entity` | ✅ `organization_id` | **VERIFIED** |
| **14. Approval Flow Config** (`ApprovalConfigView.tsx`) | `useApprovals()` | `approvalWorkflowEngine.ts` | `approval_workflows` | ❌ Global to Org | ✅ `organization_id` | **VERIFIED** |
| **15. Payroll Monthly Engine** (`PayrollRunWorkspace.tsx`)| `usePayrollRuns()` | `payrollApi.ts`, `payrollService.ts`| `payroll_runs`, `payroll_line_items`, `payslips` | ✅ `company_id` | ✅ `organization_id` | **VERIFIED** |
| **16. Salary Structure Builder** (`SalaryStructureBuilder.tsx`)| `useSalaryStructures()`| `payrollApi.ts` | `salary_structures`, `salary_structure_components`, `salary_components` | ❌ Global to Org | ✅ `organization_id` | **VERIFIED** |
| **17. Employee Payslip Vault** (`EmployeePayslipView.tsx`) | `usePayslips()` | `payrollApi.ts`, `documentService.ts`| `payslips`, `payroll_line_items` | Inherited via `employee_id` | ✅ `organization_id` | **VERIFIED** |
| **18. Vendor Agency Directory** (`VendorDirectoryMaster.tsx`)| `useVendors()` | `vendorService.ts` | `vendors` | ❌ Global to Org | ✅ `organization_id` | **VERIFIED** |
| **19. Vendor Deployments** (`VendorDeploymentView.tsx`) | `useVendorWorkers()` | `vendorService.ts` | `vendor_workers`, `vendors`, `departments` | ✅ `deployed_company_id` | ✅ `organization_id` | **VERIFIED** |
| **20. Vendor Invoicing & Bills** (`VendorBillingView.tsx`) | `useVendorInvoices()`| `vendorService.ts` | `vendor_invoices`, `vendors` | ❌ Global to Org | ✅ `organization_id` | **VERIFIED** |
| **21. Appraisal Cycle Manager** (`PerformanceCycleManager.tsx`)| `usePerformanceCycles()`| `performanceService.ts` | `performance_cycles` | ❌ Global to Org | ✅ `organization_id` | **VERIFIED** |
| **22. Goals & OKR Tracking** (`GoalSettingWorkspace.tsx`) | `useGoals()` | `performanceService.ts` | `performance_goals`, `performance_cycles` | Inherited via `employee_id` | ✅ `organization_id` | **VERIFIED** |
| **23. Performance Reviews** (`PerformanceAppraisalMaster.tsx`)| `useReviews()` | `performanceService.ts` | `performance_reviews`, `performance_cycles` | Inherited via `employee_id` | ✅ `organization_id` | **VERIFIED** |
| **24. Training & LMS Catalog** (`LMSCourseCatalogView.tsx`) | `useCourses()` | `lmsService.ts` | `lms_courses` | ❌ Global to Org | ✅ `organization_id` | **VERIFIED** |
| **25. My Learning & Progress** (`MyLearningWorkspace.tsx`) | `useEnrollments()` | `lmsService.ts` | `lms_enrollments`, `lms_courses` | Inherited via `employee_id` | ✅ `organization_id` | **VERIFIED** |
| **26. Document Classification** (`DocumentConfigMaster.tsx`)| `useDocTypes()` | `documentService.ts` | `document_types` | ❌ Global to Org | ✅ `organization_id` | **VERIFIED** |
| **27. Digital Document Vault** (`EmployeeDocumentVault.tsx`) | `useDocuments()` | `documentService.ts` | `employee_documents`, `document_types` | Inherited via `employee_id` | ✅ `organization_id` | **VERIFIED** |
| **28. Helpdesk & Requests** (`HelpdeskTicketingView.tsx`) | `useRequests()` | `serviceCatalogService.ts` | `employee_requests` | Inherited via `employee_id` | ✅ `organization_id` | **VERIFIED** |
| **29. Confidential POSH Vault** (`ConfidentialPOSHVault.tsx`)| `usePOSHCases()` | `poshService.ts` | `posh_and_grievance_cases` | ❌ Global to Org | ✅ `organization_id` | **VERIFIED** |
| **30. Asset Inventory Manager** (`AssetInventoryMaster.tsx`)| `useAssets()` | `assetService.ts` | `assets`, `companies` | ✅ `company_id` | ✅ `organization_id` | **VERIFIED** |
| **31. Asset Allocations** (`AssetAllocationDrawer.tsx`) | `useAssetAssignments()`| `assetService.ts` | `asset_assignments`, `assets`, `employees` | Inherited via `employee_id` | ✅ `organization_id` | **VERIFIED** |
| **32. Job Requisitions Board** (`JobRequisitionBoard.tsx`) | `useJobOpenings()` | `recruitmentService.ts` | `job_openings`, `departments`, `companies` | ✅ `company_id` | ✅ `organization_id` | **VERIFIED** |
| **33. Candidate Pipeline (ATS)** (`CandidatePipelineBoard.tsx`)| `useApplicants()` | `recruitmentService.ts` | `job_applicants`, `job_openings` | Inherited via `job_opening.company_id` | ✅ `organization_id` | **VERIFIED** |
| **34. Notification Center** (`NotificationCenterDrawer.tsx`)| `useNotifications()` | `enterpriseNotificationEngine.ts`| `notification_events` | User-scoped | ✅ `organization_id` | **VERIFIED** |
| **35. Webhook Integrations** (`WebhookSettingsView.tsx`) | `useWebhooks()` | `webhookService.ts` | `webhook_endpoints`, `webhook_deliveries` | ❌ Global to Org | ✅ `organization_id` | **VERIFIED** |
| **36. Security & Audit Logs** (`SecurityAuditLogView.tsx`) | `useAuditLogs()` | `observabilityLogger.ts` | `audit_logs` | ❌ Global to Org | ✅ `organization_id` | **VERIFIED** |
| **37. Company Management** (`CompanyManagementView.tsx`) | `useCompanies()` | `companyService.ts`, `api.ts` | `companies`, `branches`, `departments` | ✅ Root Entity | ✅ `organization_id` | **VERIFIED** |
| **38. Role & Permission Matrix** (`RolePermissionMaster.tsx`)| `useRBAC()` | `permissionEngine.ts`, `roleService.ts`| `roles`, `permissions`, `role_permissions` | ❌ Global to Org | ✅ `organization_id` | **VERIFIED** |
