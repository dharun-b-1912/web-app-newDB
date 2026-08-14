# WorkForceOS Enterprise HRMS — Route Map & Canonical Navigation

**Configuration File:** `src/App.tsx` & `src/components/shell/Sidebar.tsx`  
**Date:** August 12, 2026

---

## Canonical Route Registry

| Sidebar Menu Item | Route Key (`activeNav`) | Primary Component Handler | Rendered Subview Component |
| :--- | :--- | :--- | :--- |
| **HR Dashboard** | `dashboard` | `DashboardView` | `DashboardView` |
| **Workforce Overview** | `workforce-overview` | `DashboardView` | `DashboardView` |
| **Executive HR Overview** | `executive-overview` | `DashboardView` | `DashboardView` |
| **My Workspace** | `my-workspace` | `MyWorkspaceView` | `MyWorkspaceView` |
| **ESS Home** | `ess-dashboard` | `EssMasterModule` | `EssDashboardView` |
| **My Attendance** | `ess-attendance` | `EssMasterModule` | `EssAttendanceView` |
| **My Leave** | `ess-leave` | `EssMasterModule` | `EssLeaveView` |
| **My Payroll** | `ess-payroll` | `EssMasterModule` | `EssPayrollView` |
| **My Requests** | `ess-requests` | `EssMasterModule` | `EssRequestsView` |
| **My Performance** | `ess-performance` | `EssMasterModule` | `EssPerformanceView` |
| **My Learning** | `ess-learning` | `EssMasterModule` | `EssLearningView` |
| **My Documents** | `ess-documents` | `EssMasterModule` | `EssDocumentsView` |
| **Communication** | `ess-communication` | `EssMasterModule` | `EssCommunicationView` |
| **My Profile** | `ess-profile` | `EssMasterModule` | `EssProfileView` |
| **TL Dashboard** | `tl-dashboard` | `TlMasterModule` | `TlDashboardView` |
| **My Team** | `tl-my-team` | `TlMasterModule` | `TlMyTeamView` |
| **Team Attendance** | `tl-attendance` | `TlMasterModule` | `TlAttendanceView` |
| **Team Leave** | `tl-leave` | `TlMasterModule` | `TlLeaveView` |
| **Approval Center** | `tl-approvals` | `TlMasterModule` | `TlApprovalsView` |
| **Team Tasks** | `tl-tasks` | `TlMasterModule` | `TlTeamTasksView` |
| **Performance (TL)** | `tl-performance` | `TlMasterModule` | `TlPerformanceView` |
| **Team Training** | `tl-training` | `TlMasterModule` | `TlTrainingView` |
| **Team Communication**| `tl-communication` | `TlMasterModule` | `TlCommunicationView` |
| **Team Reports** | `tl-reports` | `TlMasterModule` | `TlReportsView` |
| **Employee Management**| `people` | `PeopleView` | `PeopleView` |
| **Organization** | `organization` | `OrganizationView` | `OrganizationView` |
| **Documents & E-Sign** | `documents` | `DocumentManagementView` | `DocumentManagementView` |
| **Asset Management** | `assets` | `AssetsView` | `AssetsView` |
| **Onboarding Engine** | `onboarding` | `OnboardingView` | `OnboardingView` |
| **Offboarding & Exit** | `offboarding` | `OffboardingView` | `OffboardingView` |
| **Recruitment / ATS** | `recruitment` | `RecruitmentView` | `RecruitmentView` |
| **Attendance Master** | `attendance` | `AttendanceModuleMaster` | `AttendanceDashboardView` |
| **Leave Dashboard** | `leave-dashboard` | `LeaveManagementModule` | `LeaveDashboardView` |
| **Leave Types** | `leave-types` | `LeaveManagementModule` | `LeaveTypesView` |
| **Leave Policies** | `leave-policies` | `LeaveManagementModule` | `LeavePoliciesView` |
| **Leave Calendar** | `leave-calendar` | `LeaveManagementModule` | `LeaveCalendarView` |
| **Leave Balance** | `leave-balance` | `LeaveManagementModule` | `LeaveBalanceView` |
| **Leave Requests** | `leave-requests` | `LeaveManagementModule` | `LeaveRequestsView` |
| **Leave Approval** | `leave-approval` | `LeaveManagementModule` | `LeaveApprovalView` |
| **Holiday Calendar** | `leave-holidays` | `LeaveManagementModule` | `HolidayCalendarView` |
| **Compensatory Off** | `leave-compoff` | `LeaveManagementModule` | `CompOffView` |
| **Leave Encashment** | `leave-encashment` | `LeaveManagementModule` | `EncashmentView` |
| **Payroll Dashboard** | `payroll-dashboard` | `PayrollMasterModule` | `PayrollDashboardView` |
| **Salary Management** | `payroll-salary` | `PayrollMasterModule` | `SalaryManagementView` |
| **Payroll Processing** | `payroll-processing` | `PayrollMasterModule` | `PayrollProcessingView` |
| **Payslips & Tax Docs** | `payroll-documents` | `PayrollMasterModule` | `EmployeeDocumentsView` |
| **Performance Master** | `performance-dashboard`| `PerformanceMasterModule` | `PerformanceDashboardView` |
| **Learning Dashboard**| `lms-dashboard` | `LmsMasterModule` | `LmsDashboardView` |
| **Courses & Player** | `lms-courses` | `LmsMasterModule` | `CoursesView` |
| **Admin Dashboard** | `admin-dashboard` | `AdminMasterModule` | `AdminDashboardView` |
| **User Management** | `admin-users` | `AdminMasterModule` | `UserManagementView` |
| **Role Management** | `admin-roles` | `AdminMasterModule` | `RoleManagementView` |
| **Permissions & Scope**| `admin-permissions` | `AdminMasterModule` | `PermissionManagementView` |
| **Audit Logs** | `admin-audit` | `AdminMasterModule` | `AuditLogsView` |
| **Security & MFA** | `admin-security` | `AdminMasterModule` | `SecurityConfigView` |
