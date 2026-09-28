# Joy PeopleHR — Complete Sidebar, Module & Route Map

**Comprehensive Navigation, Route Slugs & Implementation Status Matrix**  
**Audit Source:** [`routeRegistry.ts`](file:///d:/web-app%20(2)/Joy%20PeopleHR/src/lib/router/routeRegistry.ts), [`urlRouter.ts`](file:///d:/web-app%20(2)/Joy%20PeopleHR/src/lib/router/urlRouter.ts), [`Sidebar.tsx`](file:///d:/web-app%20(2)/Joy%20PeopleHR/src/components/shell/Sidebar.tsx), and [`App.tsx`](file:///d:/web-app%20(2)/Joy%20PeopleHR/src/App.tsx)

---
    
## 1. Primary Navigation Sections (HRMS Web Console)

### 1. DASHBOARD
| Menu Item | Canonical Slug | Internal Route ID | Sub-routes / Tabs | Implementation Status | Data Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HR Dashboard** | `/dashboard` | `dashboard` | Metrics, Quick Actions, Attendance Strip, Real-time Tasks | **IMPLEMENTED** | Supabase (`employees`, `attendance_records`, `leave_requests`) |
| **Workforce Overview** | `/workforce-overview` | `workforce-overview` | Headcount breakdown, Gender ratio, Dept distribution | **IMPLEMENTED** | Supabase (`employees`, `departments`) |
| **Executive HR Overview** | `/executive-overview` | `executive-overview` | High-level cost, turnover, overtime burn | **IMPLEMENTED** | Supabase (`payroll_runs`, `employees`) |
| **My Workspace** | `/workspace` | `my-workspace` | Approvals desk, Personal tasks, Action center | **IMPLEMENTED** | Supabase (`approval_instances`, `notification_events`) |

---

### 2. PEOPLE & CORE HR
| Menu Item | Canonical Slug | Internal Route ID | Sub-routes / Tabs | Implementation Status | Data Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Employee Management** | `/people` | `people` | Active directory, Profile drawer, Search, Filters, CSV Export | **IMPLEMENTED** | Supabase (`employees`, `user_profiles`) |
| **Organization Architecture**| `/organization` | `organization` | Departments, Branches, Teams, Designations, Work Locations | **IMPLEMENTED** | Supabase (`departments`, `branches`, `designations`, `work_locations`) |
| **Documents & E-Sign** | `/documents` | `documents` | Document vault, Verification queue, Category manager | **IMPLEMENTED** | Supabase (`employee_documents`, Storage: `employee-documents`) |
| **Asset Management** | `/assets` | `assets` | Asset catalog, Hardware serials, Assignments, Return audit | **PARTIALLY IMPLEMENTED** | Supabase (`assets`, `asset_allocations` UI active) |
| **Onboarding Engine** | `/onboarding` | `onboarding` | 13-step Wizard: Identity, KYC, Salary, Documents, Access | **IMPLEMENTED** | Supabase (`employees`, `employee_bank_details`, `employee_statutory_details`) |
| **Offboarding & Exit** | `/offboarding` | `offboarding` | Separation requests, Clearance checklist, F&F handoff | **PARTIALLY IMPLEMENTED** | Supabase (`separation_requests`, exit workflow) |

---

### 3. VENDOR & CONTRACTORS (Company Internal View)
| Menu Item | Canonical Slug | Internal Route ID | Sub-routes / Tabs | Implementation Status | Data Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Vendors & Workforce Hub** | `/vendors` | `vendors` | Vendor directory, Active contracts, SLA tracking, Worker counts | **IMPLEMENTED** | Supabase (`vendors`, `vendor_contracts`) |
| **Contractor Attendance** | `/vendors/attendance` | `vendor-attendance` | Biometric & manual contractor shift muster, OT logs | **IMPLEMENTED** | Supabase (`attendance_records`, `vendor_workers`) |
| **3-Way Match & Billing** | `/vendors/billing` | `vendor-settlement-workspace` | Commercial match: Attendance vs PO Rate Card vs Invoice | **IMPLEMENTED** | Supabase (`vendor_invoices`, `purchase_orders`) |
| **Compliance & Risk Audit** | `/vendors/compliance` | `vendor-dashboard` | Form V, CLRA License, EPF/ESIC remittance verify | **IMPLEMENTED** | Supabase (`vendor_licenses`, `statutory_filings`) |

---

### 4. CORE ATTENDANCE
| Menu Item | Canonical Slug | Internal Route ID | Sub-routes / Tabs | Implementation Status | Data Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Attendance Dashboard** | `/attendance` | `attendance` | 12 KPI Status Tiles, Clocking channels, GPS alerts | **IMPLEMENTED** | Supabase (`attendance_records`, `attendance_punches`) |
| **Employee Attendance** | `/attendance/employees`| `attendance-employees`| Daily tabular attendance muster, Date picker, Tile filter banner | **IMPLEMENTED** | Supabase (`attendance_records`, `employees`) |
| **Attendance History & Ledger**| `/attendance/history` | `history` | Monthly matrix (Days 1–31), Paid days count, Absent LOP | **IMPLEMENTED** | Supabase (`attendance_records`, `leave_requests`) |
| **Late / Early Tracking** | `/attendance/late-early`| `late-early` | Grace-in/grace-out policy deviations, Deduction tags | **IMPLEMENTED** | Supabase (`attendance_records`, shift grace rules) |
| **Regularization Desk** | `/attendance/regularization`| `regularization` | Missing punch, On-duty, Correction approval workflow | **IMPLEMENTED** | Supabase (`attendance_regularizations`, `approval_instances`) |
| **Exceptions Queue** | `/attendance/exceptions`| `exceptions` | GPS violations, Half-day anomalies, Geo-mismatches | **IMPLEMENTED** | Supabase (`attendance_records`, `attendance_punches`) |

---

### 5. LEAVE MANAGEMENT
| Menu Item | Canonical Slug | Internal Route ID | Sub-routes / Tabs | Implementation Status | Data Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Leave Management** | `/leave` | `leave` | Leave balance cards, Apply leave modal, Team approvals, Calendar | **IMPLEMENTED** | Supabase (`leave_balances`, `leave_requests`, `leave_ledger_entries`) |

---

### 6. WORK & OVERTIME
| Menu Item | Canonical Slug | Internal Route ID | Sub-routes / Tabs | Implementation Status | Data Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Overtime Engine** | `/overtime` | `overtime` | Overtime calculations, 2x wage rates (Code on Wages 2019) | **IMPLEMENTED** | Supabase (`overtime_records`, `otPolicyEngine.ts`) |
| **Overtime Requests** | `/overtime/requests` | `overtime-requests` | Supervisor pre-approval and post-punch OT authorization | **IMPLEMENTED** | Supabase (`overtime_records`, `approval_instances`) |
| **WFH Requests** | `/wfh` | `wfh` | Remote clock-in requests, Location tracking permissions | **IMPLEMENTED** | Supabase (`attendance_regularizations`, `work_locations`) |
| **Breaks & Work Hours** | `/breaks` | `breaks-workhours` | Meal break logs, Net active working hours, Idle tracking | **PARTIALLY IMPLEMENTED** | Local calculation / DB punches |

---

### 7. SHIFT & SCHEDULING
| Menu Item | Canonical Slug | Internal Route ID | Sub-routes / Tabs | Implementation Status | Data Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Shift Master** | `/shifts` | `shifts` | Shift timings, Grace minutes, Half-day cutoffs, Rotational shifts | **IMPLEMENTED** | Supabase (`shifts`) |
| **Shift Roster & Matrix** | `/shifts/roster` | `roster` | Department shift allocation, Weekly calendar planner | **IMPLEMENTED** | Supabase (`shift_rosters`) |
| **Shift Calendar** | `/shifts/calendar` | `shift-calendar` | Master corporate holiday calendar, Weekly offs | **IMPLEMENTED** | Supabase (`holidays`, `shift_rosters`) |
| **Attendance Policies** | `/policies` | `policies` | Late penalty rules, Consecutive absence rules, Auto-LOP | **IMPLEMENTED** | Supabase (`attendance_rules`, `attendanceRuleEngineService.ts`) |

---

### 8. CLOCKING & DEVICES (Biometric Channel)
| Menu Item | Canonical Slug | Internal Route ID | Sub-routes / Tabs | Implementation Status | Data Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Biometric Devices** | `/biometric` | `biometric` | Device registry (IP, Port, Serial), Online status, Manual sync | **IMPLEMENTED** | Supabase (`biometric_devices`, `node-zklib` / Local Edge) |
| **Biometric Rules & Automation**| `/biometric/rules` | `attendance-rules` | Hardware punch mapping, In/Out detection logic, Debounce | **IMPLEMENTED** | Supabase (`attendance_rules`, PostgreSQL functions) |
| **GPS & Mobile Channel** | `/biometric/gps` | `gps` | Mobile clock-in coordinates, Geofence breach alerts | **IMPLEMENTED** | Supabase (`work_locations`, `attendance_punches`) |
| **Face Recognition** | `/biometric/face` | `face-attendance` | Tablet / AI camera face recognition channel | **PARTIALLY IMPLEMENTED** | Camera Web API + Supabase logs |
| **Geofence Boundaries** | `/biometric/geofences` | `geofences` | Latitude/Longitude polygon coordinates & radius setup | **IMPLEMENTED** | Supabase (`work_locations`) |

---

### 9. AUDIT & CONTROL
| Menu Item | Canonical Slug | Internal Route ID | Sub-routes / Tabs | Implementation Status | Data Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ledger & Audits** | `/audit/ledger` | `calculation-audit` | Financial-grade immutable attendance mutation ledger | **IMPLEMENTED** | Supabase (`attendance_records`, audit timestamps) |
| **Attendance Corrections** | `/audit/corrections` | `attendance-corrections` | Before-and-after audit trail of HR manual edits | **IMPLEMENTED** | Supabase (`attendance_regularizations`) |
| **Approval History** | `/audit/approvals` | `approval-history` | Decision timeline (Approver, Timestamp, Reason) | **IMPLEMENTED** | Supabase (`approval_actions`, `approval_instances`) |
| **System Activity Logs** | `/audit/activity` | `attendance-activity-logs`| System background cron jobs, Device sync events | **IMPLEMENTED** | Supabase (`system_activity_logs`) |
| **Realtime Sync Health** | `/audit/sync-health` | `realtime-health` | Gateway WebSocket/REST connection health monitor | **IMPLEMENTED** | Telemetry ingestion bridge |

---

### 10. PAYROLL & COMPENSATION
| Menu Item | Canonical Slug | Internal Route ID | Sub-routes / Tabs | Implementation Status | Data Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Payroll Dashboard** | `/payroll` | `payroll-dashboard` | Monthly gross payout, Statutory liabilities, Freeze status | **IMPLEMENTED** | Supabase (`payroll_runs`) |
| **Client Wage Billing** | `/payroll/billing` | `client-billing` | Client-side manpower billing contracts & bill generation | **IMPLEMENTED** | Supabase (`client_billing_runs`) |
| **Payroll Settings** | `/payroll/settings` | `payroll-settings` | Pay schedule, Cutoff dates, LOP deduction rules | **IMPLEMENTED** | Supabase (`payroll_settings`) |
| **Statutory & Tax Rules** | `/payroll/statutory` | `payroll-statutory` | EPF (12%/13%), ESIC (0.75%/3.25%), PT slabs, LWF | **IMPLEMENTED** | Supabase (`statutory_rules`, `statutoryRuleEngine.ts`) |
| **Salary Structures & Staff**| `/payroll/salary` | `payroll-salary` | CTC component templates (Basic 50%, HRA 30%, Special) | **IMPLEMENTED** | Supabase (`salary_structures`, `employee_salary_assignments`) |
| **Earnings & Overtime** | `/payroll/earnings` | `payroll-earnings` | Variable earnings, Incentives, Bonus, 2x OT wages | **IMPLEMENTED** | Supabase (`employee_salary_assignments`, `overtime_records`) |
| **Deductions, Loans & LOP** | `/payroll/deductions`| `payroll-deductions`| Loss of Pay (LOP) deductions, Salary advance, Loan EMI | **IMPLEMENTED** | Supabase (`attendance_daily`, `employee_deductions`) |
| **Expense Claims & Approvals**| `/payroll/claims` | `payroll-claims` | Travel & conveyance reimbursement claims with receipt proof | **IMPLEMENTED** | Supabase (`expense_claims`, Storage: `claims`) |
| **Payroll Processing & Runs**| `/payroll/runs` | `payroll-processing` | One-click month calculation, Verification, Immutability lock | **IMPLEMENTED** | Supabase (`payroll_runs`, `authoritativePayrollEngine.ts`) |
| **Bank Disbursement** | `/payroll/bank` | `payroll-disbursement`| NEFT/RTGS Bank bulk payment batch text/Excel file export | **IMPLEMENTED** | Supabase (`employee_bank_details`, `payroll_runs`) |
| **Payroll Reports & ECR** | `/payroll/reports` | `payroll-reports` | EPFO ECR text format, ESIC monthly return, Salary register | **IMPLEMENTED** | Supabase (`payroll_runs`, `statutoryReportAdapter.ts`) |
| **Digital Payslips & Docs** | `/payroll/payslips` | `payroll-documents` | Live interactive payslip preview, PDF generator, Batch mail | **IMPLEMENTED** | Supabase (`payslips`, `jspdf`, `universalPayslipPdfService.ts`) |
| **Full & Final (F&F)** | `/payroll/fnf` | `payroll-fnf` | Gratuity, Leave encashment, Notice recovery, Final settlement | **PARTIALLY IMPLEMENTED** | Calculation engine ready; settlement UI workflow active |

---

### 11. RECRUITMENT, PERFORMANCE & LMS (Enterprise Add-ons)
| Menu Item | Canonical Slug | Internal Route ID | Sub-routes / Tabs | Implementation Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Recruitment / ATS** | `/recruitment` | `recruitment` | Job requisitions, Candidate pipeline, Interview calendar | **PARTIALLY IMPLEMENTED** | UI + Supabase (`job_postings`, `job_applications`) |
| **Performance (PMS)** | `/performance` | `performance` | Goals, OKR objectives, Review cycles, 360° feedback | **PARTIALLY IMPLEMENTED** | UI + Supabase (`goals`, `appraisal_reviews`) |
| **Learning & Development** | `/lms` | `lms` | Course library, Video player, Mandatory compliance certs | **PARTIALLY IMPLEMENTED** | UI + Supabase (`courses`, `course_enrollments`) |
| **Employee Relations** | `/relations` | `other-posh` | POSH Committee desk, Grievance ticketing, Disciplinary | **PARTIALLY IMPLEMENTED** | UI active with ticketing backend |

---

## 2. Dedicated Standalone Portals

### 1. Vendor Portal Workspace (`/vendor-portal/*`)
*Accessed exclusively by users with role `Vendor Admin` / `Vendor User` via `/vendor/login`.*
- `/vendor-portal/dashboard` — Vendor multi-client command center (**IMPLEMENTED**)
- `/vendor-portal/workforce` — Assigned contract worker directory & KYC (**IMPLEMENTED**)
- `/vendor-portal/attendance` — Contractor biometric muster and shift tracking (**IMPLEMENTED**)
- `/vendor-portal/purchase-orders` — Active purchase orders with remaining capacity (**IMPLEMENTED**)
- `/vendor-portal/invoices` — Tax invoices with real-time 3-way match verification (**IMPLEMENTED**)
- `/vendor-portal/settlement` — Commercial settlement workspace with 8 lifecycle stages (**IMPLEMENTED**)
- `/vendor-portal/wages` — Minimum wage breakdown and employer liability calculations (**IMPLEMENTED**)
- `/vendor-portal/compliance` — Statutory returns, Form V, Form XXIV, EPF/ESIC challans (**IMPLEMENTED**)

### 2. Platform Admin Control Plane (`/platform/*`)
*Accessed exclusively by SaaS operators (`Super Admin`, `Platform Admin`).*
- `/platform/dashboard` — Platform MRR, active tenants, server load (**IMPLEMENTED**)
- `/platform/tenants` — Tenant provisioning, domain mapping, company setup (**IMPLEMENTED**)
- `/platform/plans` — Plan catalog, feature flags, license limits (**IMPLEMENTED**)
- `/platform/security` — Global session monitoring, brute force alerts (**IMPLEMENTED**)
- `/platform/audit` — Immutable cross-tenant operator action logs (**IMPLEMENTED**)

---

## 3. Route Health & Aliases Audit

- **Zero Dead Routes**: All canonical paths match exact registered components in `App.tsx`.
- **Legacy Aliases Maintained**: Hyphenated paths (e.g. `/payroll-statutory`, `/vendor-settlement-workspace`) automatically resolve to canonical slash paths (`/payroll/statutory`, `/vendors/billing`) without throwing 404 errors.
- **Direct Access Resilience**: Every canonical route can be refreshed (`F5`) or entered directly into the browser URL bar while preserving active sidebar highlights and state.
