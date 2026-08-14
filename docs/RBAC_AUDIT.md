# WorkForceOS Enterprise HRMS — RBAC & Data Scope Audit

**Role:** RBAC / Authorization Architect & Security Lead  
**Configuration File:** `src/lib/rbac/permissionEngine.ts`  
**Hook:** `src/hooks/usePermission.ts`  
**Date:** August 12, 2026

---

## 1. Role Model Hierarchy & Scope Boundaries

```text
SUPER ADMIN (Level 1, Scope: PLATFORM)
  └── Access to all system modules, tenant management, security, billing, API keys & platform operations.

COMPANY ADMIN (Level 1, Scope: COMPANY)
  └── Access to company-wide administration, user provisioning, organizational structure & legal entities.

HR HEAD (Level 2, Scope: COMPANY)
  └── Access to company-wide HR operations (Employees, Recruitment, Attendance, Leave, Payroll, Performance, LMS, Relations, Analytics).

MANAGER (Level 3, Scope: DEPARTMENT)
  └── Access to department-scoped employee data, team approvals, goals, reviews & attendance monitoring.

TEAM LEAD / SUPERVISOR (Level 4, Scope: TEAM)
  └── Operational access to assigned team members (`team_id`), task assignments, team clocking & initial request reviews.

EMPLOYEE (Level 5, Scope: SELF)
  └── Ownership access (`auth.uid() -> employee_id`) to personal attendance, leave balances, payslips & service requests.
```

---

## 2. Separation of HR Head and Super Admin Roles

As required by Section 4 of the Master Prompt, `HR Head` and `Super Admin` have been separated into distinct authorization roles:
- **HR Head (`HR_HEAD`):** Manages people, recruitment, attendance, leave, payroll, performance, training, employee relations, and HR analytics. Does **not** receive platform administration control privileges (User role configuration, API keys, MFA rules, Billing).
- **Super Admin (`SUPER_ADMIN`):** Platform control plane authority overseeing multi-tenant billing, system settings, global API webhooks, security policy enforcement, and audit logs.

---

## 3. Data Masking & IDOR Safeguards

- **Field-Level Data Masking:** Confidential fields (Bank Account numbers `XXXX XXXX 8819`, PAN, Aadhar, CTC Salary breakdown, POSH harassment complaints, Disciplinary case notes) are strictly restricted from lower roles (Employees, Team Leads, General Managers).
- **Server-Side RLS Enforcement:** Supabase RLS policies validate `auth.uid() -> employee_id -> tenant_id` on every query, preventing unauthorized URL parameter manipulation (IDOR attacks).
