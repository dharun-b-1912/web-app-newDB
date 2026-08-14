# WORKFORCEOS ENTERPRISE HRMS — SIDEBAR NAVIGATION MENU MASTER DOCUMENTATION

**Document Status:** Complete Canonical Navigation Architecture  
**Target Codebase:** `d:/Joy Corporate Solutions/workforceos-enterprise-hrms`  
**Configuration File:** `src/components/shell/Sidebar.tsx`  
**Total Navigation Groups:** 17  
**Total Menu Items:** 108  
**Date:** August 12, 2026

---

## 1. 📊 DASHBOARD
| Menu Item Label | Route ID (`id`) | Description & Capability |
| :--- | :--- | :--- |
| **HR Dashboard** | `dashboard` | Operational executive HR landing dashboard with real-time HR statistics. |
| **Workforce Overview** | `workforce-overview` | High-level headcount, department distribution, and site location metrics. |
| **Executive HR Overview** | `executive-overview` | C-suite strategic HR KPI summary and workforce health indicators. |
| **My Workspace** | `my-workspace` | Personal employee quick workspace launcher & clock-in widget. |

---

## 2. 👤 EMPLOYEE SELF-SERVICE (ESS)
| Menu Item Label | Route ID (`id`) | Description & Capability |
| :--- | :--- | :--- |
| **ESS Home** | `ess-dashboard` | Personalized employee home, clock-in, leave balance cards & action center. |
| **My Attendance** | `ess-attendance` | Personal check in/out, working hours, shift timings & regularization log. |
| **My Leave** | `ess-leave` | Real-time leave entitlement balances, apply leave modal & request history. |
| **My Payroll** | `ess-payroll` | Salary breakdown, statutory deductions, bank info & secure PDF payslip downloads. |
| **My Requests** | `ess-requests` | Unified request center for WFH, leave, travel, expenses, loans & helpdesk. |
| **My Performance** | `ess-performance` | Personal OKR goals, KPI achievements, self-assessments & manager feedback. |
| **My Learning** | `ess-learning` | LMS course player, mandatory compliance training & PDF certificates. |
| **My Documents** | `ess-documents` | Personal document vault, appointment letters, tax docs & policy acknowledgements. |
| **Communication** | `ess-communication` | Company announcements, team messages & anonymous pulse surveys. |
| **My Profile** | `ess-profile` | Personal info, employment details, emergency contact & assigned IT hardware assets. |

---

## 3. 👥 TL / SUPERVISOR
| Menu Item Label | Route ID (`id`) | Description & Capability |
| :--- | :--- | :--- |
| **TL Dashboard** | `tl-dashboard` | Operational team hub, active team scope selector & team health metrics. |
| **My Team** | `tl-my-team` | Team member directory, work status, task loads & member profiles. |
| **Team Attendance** | `tl-attendance` | Live team check-in ledger, shift timings, working hours & geofence status. |
| **Team Leave** | `tl-leave` | Team member leave request approvals & availability conflict warnings. |
| **Approval Center** | `tl-approvals` | Unified approval desk for WFH, regularization, overtime & travel requests. |
| **Team Tasks** | `tl-tasks` | Create & assign sprint tasks within team scope, priority badges & progress sliders. |
| **Performance** | `tl-performance` | Team goals, KPI achievement, OKR progress & TL feedback. |
| **Team Training** | `tl-training` | LMS course assignments, compliance progress & certification alerts. |
| **Communication** | `tl-communication` | Team broadcast announcements & peer recognition shoutouts. |
| **Team Reports** | `tl-reports` | Team operational reports (attendance %, leave, tasks, training) & CSV exporter. |

---

## 4. 🏢 CORE HR
| Menu Item Label | Route ID (`id`) | Description & Capability |
| :--- | :--- | :--- |
| **Employee Management** | `people` | Complete employee master directory, profiles & employment records. (Badge: 428) |
| **Organization Architecture** | `organization` | Legal entities, companies, branches, departments, & org chart tree. |
| **Documents & E-Sign** | `documents` | Organization-wide HR documents, templates & e-signature workflows. |
| **Asset Management** | `assets` | IT hardware, laptops, monitors, serial numbers & allocation tracking. |
| **Onboarding Engine** | `onboarding` | New hire onboarding task lists, document collection & orientation. (Badge: 14) |
| **Offboarding & Exit** | `offboarding` | Exit clearance workflows, asset returns & full & final settlement prep. (Badge: 3) |

---

## 5. ⏰ ATTENDANCE MASTER
| Menu Item Label | Route ID (`id`) | Description & Capability |
| :--- | :--- | :--- |
| **Attendance Dashboard** | `attendance` | Central attendance analytics, real-time check-in stats & exception summary. |
| **Employee Attendance** | `attendance-employees` | Organization-wide daily attendance logs & shift rosters. (Badge: 428) |
| **Regularization Desk** | `regularization` | Missed punch regularization request processing desk. |
| **Overtime Engine** | `overtime` | Overtime calculations, pre/post-shift approvals & compensation tracking. |
| **Biometric Devices** | `biometric` | Connected ZK Teco hardware biometric adapters & IP device sync logs. |
| **GPS Geofence Clocking** | `gps` | Mobile GPS check-in parameters, office geofence radii & location logs. |
| **Late / Early Tracking** | `late-early` | Grace period parameters, late arrival penalties & early departure tracking. |

---

## 6. 📅 LEAVE
| Menu Item Label | Route ID (`id`) | Description & Capability |
| :--- | :--- | :--- |
| **Leave Dashboard** | `leave-dashboard` | Leave utilization overview, department leave trends & pending approvals. |
| **Leave Types** | `leave-types` | Configure Casual (CL), Sick (SL), Earned (EL), Maternity, Paternity & Unpaid leaves. |
| **Leave Policies** | `leave-policies` | Accrual rules, carry-forward caps, notice periods & encashment policies. |
| **Leave Calendar** | `leave-calendar` | Interactive calendar displaying overlapping team & company leave. |
| **Leave Balance** | `leave-balance` | Employee leave balance ledger & yearly credit allocations. |
| **Leave Requests** | `leave-requests` | Comprehensive leave application management desk. |
| **Approval** | `leave-approval` | Sequential manager & HR leave approval desk. |
| **Holiday Calendar** | `leave-holidays` | Company, national, regional, and restricted holiday schedules. |
| **Compensatory Off** | `leave-compoff` | Comp-Off credit requests for weekend/holiday working hours. |
| **Leave Encashment** | `leave-encashment` | Yearly leave encashment calculations & payroll disbursement links. |
| **Leave Adjustments** | `leave-adjustments` | Manual HR leave balance credit/debit adjustments & audit logs. |
| **Leave Accrual** | `leave-accrual` | Automated monthly/annual leave accrual processing engine. |
| **Leave Exceptions** | `leave-exceptions` | Exception handling for probationers, notice period & emergency leaves. |
| **Leave Reports** | `leave-reports` | Comprehensive leave utilization, balance, and liability reports. |

---

## 7. 💳 PAYROLL
| Menu Item Label | Route ID (`id`) | Description & Capability |
| :--- | :--- | :--- |
| **Payroll Dashboard** | `payroll-dashboard` | Monthly payroll cost overview, gross vs net disbursements & CTC analytics. |
| **Salary Management** | `payroll-salary` | Employee CTC structures, basic, HRA, special allowance & bonus components. |
| **Payroll Processing** | `payroll-processing` | Monthly 4-step payroll run engine (LOP calculation → Draft → Approval → Lock). |
| **Earnings** | `payroll-earnings` | Variable pay, performance bonuses, overtime pay & taxable allowances. |
| **Deductions & LOP** | `payroll-deductions` | Loss of Pay (LOP) deductions, income tax (TDS), EPF & ESI deductions. |
| **Statutory Compliance** | `payroll-statutory` | Indian statutory EPF ECR file, ESI return, Professional Tax (PT) & LWF. |
| **Payslips & Tax Docs** | `payroll-documents` | Digital PDF payslips, IT declaration Form 12BB & Form 16 generator. |
| **Full & Final (F&F)** | `payroll-fnf` | Exited employee F&F settlement calculation & final payout ledger. |
| **Payroll Reports** | `payroll-reports` | Salary registers, bank transfer payout sheets, tax statements & variance reports. |
| **Payroll Settings** | `payroll-settings` | Salary component definitions, statutory rates & financial year rules. |

---

## 8. 💼 WORKFORCE
| Menu Item Label | Route ID (`id`) | Description & Capability |
| :--- | :--- | :--- |
| **Leave Management Master** | `leave` | Centralized workforce leave operations. |
| **Shift Roster & Swaps** | `shifts` | Shift scheduling, night shift rotation & employee shift swap requests. |
| **Time Tracking & Log** | `time-tracking` | Timesheets, project time allocation & billable hour tracking. |
| **WFH Requests** | `wfh` | Remote work & hybrid WFH application management. |
| **Headcount Planning** | `workforce-planning` | Capacity planning, headcount forecasting & staffing models. |
| **Payroll Processing** | `payroll` | Direct link to monthly payroll execution. |

---

## 9. 🎯 TALENT & ATS
| Menu Item Label | Route ID (`id`) | Description & Capability |
| :--- | :--- | :--- |
| **Recruitment / ATS** | `recruitment` | Job requisitions, applicant tracking pipeline, candidate stages & interviews. (Badge: 14) |
| **Performance Master** | `performance` | Comprehensive performance management hub. |
| **Training / LMS** | `lms` | Organization-wide learning management system. |
| **Career Development** | `career-dev` | Career paths, skill progression matrices & succession planning. |
| **Compensation & CTC** | `compensation` | CTC benchmarking, salary bands & compensation review cycles. |

---

## 10. 🏆 PERFORMANCE
| Menu Item Label | Route ID (`id`) | Description & Capability |
| :--- | :--- | :--- |
| **Performance Dashboard** | `performance-dashboard` | Appraisal completion status, company performance bell curve & goal stats. |
| **Goals** | `performance-goals` | Individual, team, and department SMART goal creation & progress tracking. |
| **OKR Objectives** | `performance-okr` | Company & department Objective & Key Results (OKR) framework. |
| **KPI Library** | `performance-kpi` | Reusable Key Performance Indicator (KPI) repository by role. |
| **KRA Framework** | `performance-kra` | Key Result Area (KRA) definitions and weightage assignments. |
| **Review Cycles** | `performance-cycles` | Annual, biannual, and quarterly appraisal cycle setup. |
| **Reviews & 360°** | `performance-reviews` | Self-appraisal, manager evaluation, peer feedback & 360° review forms. |
| **Ratings & Calibration** | `performance-ratings` | Performance rating calibration sessions & bell curve normalization. |
| **Development Plans** | `performance-development` | Individual Development Plans (IDP) linked to training courses. |
| **Promotions** | `performance-promotion` | Promotion recommendations, grade changes & compensation adjustments. |
| **PIP Engine** | `performance-pip` | Performance Improvement Plan (PIP) tracking & milestone evaluation. |
| **Performance Reports** | `performance-reports` | Appraisal completion, rating distribution & goal achievement reports. |

---

## 11. 🎓 TRAINING & LMS
| Menu Item Label | Route ID (`id`) | Description & Capability |
| :--- | :--- | :--- |
| **Learning Dashboard** | `lms-dashboard` | Course completion rates, active enrollments & learning hours analytics. |
| **Courses & Player** | `lms-courses` | Interactive SCORM/video course catalog & embedded content player. |
| **Training Programs** | `lms-programs` | Structured learning paths and multi-course training curriculums. |
| **Training Calendar** | `lms-calendar` | Live instructor-led training (ILT) and webinar schedules. |
| **Enrollments** | `lms-enrollment` | Employee course enrollment management desk. |
| **Trainers & Vendors** | `lms-trainers` | Internal trainers, external vendors & instructor profiles. |
| **Assessments & Exams** | `lms-assessments` | Online quizzes, exams, passing scores & attempt limits. |
| **Certifications & Expiry** | `lms-certifications` | Automated certificate issuance & expiry renewal tracking. |
| **Mandatory Compliance** | `lms-mandatory` | Statutory POSH, InfoSec & Code of Conduct mandatory training rules. |
| **Skill Gap & Paths** | `lms-skills` | Employee skill assessment matrices & personalized learning paths. |
| **Feedback & Ratings** | `lms-feedback` | Course feedback forms and star rating analytics. |
| **LMS Reports** | `lms-reports` | Compliance reports, course completion lists & assessment scores. |
| **LMS Settings** | `lms-settings` | Certificate templates, passing score thresholds & provider settings. |

---

## 12. ⚡ OPERATIONS & OTHER MODULES
| Menu Item Label | Route ID (`id`) | Description & Capability |
| :--- | :--- | :--- |
| **Operations Dashboard** | `other-dashboard` | Cross-departmental operational health summary. |
| **Travel & Expense** | `other-travel` | Domestic/international travel requests, advance vouchers & receipt expense claims. |
| **POSH Compliance** | `other-posh` | Prevention of Sexual Harassment (POSH) committee, policy & case management. |
| **Grievance & Discipline** | `other-grievances` | Employee grievance submission desk & disciplinary inquiry tracking. |
| **Employee Engagement** | `other-engagement` | Company pulse surveys, employee engagement scores & feedback loops. |
| **HR Helpdesk** | `other-helpdesk` | Internal HR SLA ticket management desk for IT, HR, and payroll queries. |
| **Communication Hub** | `other-communication` | Organization broadcast announcements, newsletters & SMS/Email triggers. |

---

## 13. 🤝 EMPLOYEE RELATIONS
| Menu Item Label | Route ID (`id`) | Description & Capability |
| :--- | :--- | :--- |
| **Engagement & Surveys** | `engagement` | Engagement pulse surveys and culture feedback analytics. |
| **Grievance Desk** | `grievances` | Confidential grievance reporting and resolution workflow. |
| **Disciplinary Actions** | `discipline` | Show-cause notices, inquiry panels & disciplinary records. |
| **POSH Committee** | `posh` | Internal Complaints Committee (ICC) details & statutory compliance reports. |
| **Statutory Compliance** | `compliance` | Labor law compliance registers, minimum wages & factory act filings. |

---

## 14. 🛠️ HR SERVICES
| Menu Item Label | Route ID (`id`) | Description & Capability |
| :--- | :--- | :--- |
| **HR Helpdesk Tickets** | `helpdesk` | HR support ticket queue with SLA response tracking. (Badge: 5) |
| **Announcements** | `communication` | Company-wide broadcast announcements. |
| **Employee Requests** | `requests` | Unified employee request dispatcher. |

---

## 15. 📈 ANALYTICS & MANAGEMENT
| Menu Item Label | Route ID (`id`) | Description & Capability |
| :--- | :--- | :--- |
| **Analytics Overview** | `analytics-overview` | Central executive BI analytics landing page. |
| **HR Dashboard** | `analytics-hr` | Headcount, turnover, diversity & tenure metrics. |
| **CEO Dashboard** | `analytics-ceo` | C-suite strategic workforce summary & organizational metrics. |
| **Finance Dashboard** | `analytics-finance` | Payroll liability, CTC expenditure & benefit costs. |
| **Recruitment Analytics** | `analytics-recruitment` | Time-to-hire, offer acceptance rate & sourcing channel efficiency. |
| **Attendance Analytics** | `analytics-attendance` | Absenteeism rates, late arrival trends & overtime costs. |
| **Leave Analytics** | `analytics-leave` | Leave balance liabilities, seasonal leave spikes & unplanned absences. |
| **Payroll Analytics** | `analytics-payroll` | Salary trends, statutory payments & cost center distribution. |
| **Performance Analytics** | `analytics-performance` | Rating distribution, high-performer retention & goal achievement %. |
| **Training Analytics** | `analytics-training` | Total training hours, compliance rates & cost per employee. |
| **Attrition Analytics** | `analytics-attrition` | Early attrition rates, voluntary vs involuntary exits & exit reason charts. |
| **Workforce Analytics** | `analytics-workforce` | Demographics, age distribution, gender ratio & location breakdown. |
| **Cost Analytics** | `analytics-cost` | Total Cost to Company (CTC) analytics & department budgeting. |
| **Custom Reports & Builder** | `analytics-reports` | Drag-and-drop custom report query builder & CSV/PDF exporter. |
| **Analytics Settings** | `analytics-settings` | Metric calculation formulas, chart colors & report schedules. |

---

## 16. ⚙️ AUTOMATION ENGINE
| Menu Item Label | Route ID (`id`) | Description & Capability |
| :--- | :--- | :--- |
| **Workflow Engine** | `workflows` | Multi-step visual workflow trigger builder & rule definitions. |
| **Unified Approval Hub** | `approvals` | Single inbox for all pending Leave, WFH, Overtime & Expense approvals. (Badge: 27) |
| **Notifications & Alerts** | `notifications` | Realtime in-app stream, SendGrid email, SMS & Meta WhatsApp rules. |
| **Scheduled Cron Jobs** | `scheduled-jobs` | Automated background cron jobs for leave accruals, reminders & reports. |

---

## 17. 🔒 ADMINISTRATION (CONTROL PLANE)
| Menu Item Label | Route ID (`id`) | Description & Capability |
| :--- | :--- | :--- |
| **Admin Dashboard** | `admin-dashboard` | System security posture, isolation health & control plane overview. |
| **User Management** | `admin-users` | User account provisioning, email invitations, active sessions & access reviews. |
| **Role Management** | `admin-roles` | System & custom role definitions, role templates, assignments & role hierarchy. |
| **Permissions & Scope** | `admin-permissions` | Granular `module.resource.action` rules, field masking & RBAC simulator. |
| **Workflow Builder** | `admin-workflows` | Visual workflow trigger engine with versioning and execution logs. |
| **Approval Config** | `admin-approvals` | Approval policy chains, dynamic approver resolution, delegation & escalation rules. |
| **Notification Settings** | `admin-notifications` | Communication Hub rules, channel adapters & template triggers. |
| **Audit Logs** | `admin-audit` | Immutable 7-year audit trail for all security, user, and data modification events. |
| **Security & MFA** | `admin-security` | Password complexity policies, mandatory TOTP MFA & CIDR IP whitelisting. |
| **API & Webhooks** | `admin-api` | Developer REST API keys, rate limits (100 req/min) & HMAC signed webhooks. |
| **Integrations** | `admin-integrations` | Integration marketplace, connected biometric devices & Supabase storage. |
| **Subscription Plan** | `admin-subscription` | Enterprise plan license headcount capacity (416 / 1000 seats used). |
| **Billing & Invoices** | `admin-billing` | PCI-compliant tax invoices, GST statements & payment transactions. |
| **System Settings** | `admin-settings` | Organization legal entity, Asia/Kolkata IST timezone & April-March financial year. |

---

## Summary & Role Visibility Rules

Every menu item above is dynamically filtered by the user's assigned role and scope via `canViewModule(itemId)`:
- **Employee Role:** Views **EMPLOYEE SELF-SERVICE** items (`ess-*`).
- **TL / Supervisor Role:** Views **TL / SUPERVISOR** items (`tl-*`).
- **Manager Role:** Views Department & Team Operational Views (`attendance`, `leave`, `performance`, `approvals`).
- **HR Head Role:** Views **CORE HR**, **PAYROLL**, **TALENT**, **EMPLOYEE RELATIONS**, and **ANALYTICS**.
- **Company Admin / Super Admin:** Views full **ADMINISTRATION** control plane and system configuration settings.
