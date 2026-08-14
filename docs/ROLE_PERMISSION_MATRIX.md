# WorkForceOS Enterprise HRMS — Role & Permission Matrix

**Date:** August 12, 2026

---

## Authorization Permission Matrix by Role

| Domain / Resource | Action / Capability | Employee | Team Lead | Manager | HR Head | Company Admin | Super Admin |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Personal Profile** | View / Edit Own Info | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Team Operations** | View / Approve Team Requests | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Department HR** | Manage Department Operations | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Core HR Directory** | Employee Directory & Org Chart | View | View | Dept | Company | Company | Platform |
| **Leave Management** | Apply / Approve / Configure | Apply | Approve (Team) | Approve (Dept) | Configure | Configure | Platform |
| **Attendance Clocking**| Clock-In / Geofence / Roster | Self | Team | Dept | Company | Company | Platform |
| **Payroll & Payslips**| View Payslip / Run Payroll | Own Payslip | ❌ | ❌ | Exec Payroll | Exec Payroll | Platform |
| **Performance Review**| Self / Team / Appraisal Cycle | Self | Team Feedback | Review | Config | Config | Platform |
| **Training & LMS** | Player / Assign / Configure | Player | Assign (Team) | Assign (Dept) | Configure | Configure | Platform |
| **Recruitment (ATS)** | View Jobs / Candidate Pipeline | ❌ | ❌ | Interview | Full ATS | Full ATS | Platform |
| **User Provisioning** | Manage System Users | ❌ | ❌ | ❌ | ❌ | Company | Platform |
| **RBAC & Security** | Roles / Permissions / MFA | ❌ | ❌ | ❌ | ❌ | Company | Platform |
| **Platform Billing** | Subscription / Invoices / API | ❌ | ❌ | ❌ | ❌ | ❌ | Platform |
