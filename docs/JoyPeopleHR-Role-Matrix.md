# Joy PeopleHR — Role Hierarchy & Access Control Matrix

**Authoritative RBAC & Multi-Tenant Authorization Specification**  
**Source Code Reference:** [`types.ts`](file:///d:/web-app%20(2)/Joy%20PeopleHR/src/lib/rbac/types.ts), [`permissionEngine.ts`](file:///d:/web-app%20(2)/Joy%20PeopleHR/src/lib/rbac/permissionEngine.ts), and Supabase RLS Migration `20260915_114_enterprise_identity_and_role_hierarchy.sql`.

---

## 1. System Role Hierarchy & Data Scopes

| Role Name | Primary Portal | Authorization Scope | Primary Purpose | Web Access | Mobile Access |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **Super Admin** | Platform Control Plane | `PLATFORM` (Global) | SaaS operator, tenant provisioning, cross-tenant system health, billing plans | Yes | No |
| **Organization Admin** | HRMS Enterprise | `ORGANIZATION` | Enterprise group administrator across all subsidiary companies | Yes | No |
| **Company Admin** | HRMS Enterprise | `COMPANY` | Legal company executive, company policies, legal compliance | Yes | No |
| **HR Head** | HRMS Enterprise | `HR` (Company-wide) | Complete HR lifecycle, payroll runs, attendance policies, salary structures | Yes | Yes (Optional) |
| **HR Admin** | HRMS Enterprise | `HR` (Operational) | Day-to-day operations: onboarding, leave approvals, document verification | Yes | No |
| **Payroll Admin / Finance**| HRMS Enterprise | `FINANCE` | Salary computation, tax rules, bank disbursement file exports, statutory filings | Yes | No |
| **Manager** | HRMS Enterprise | `MANAGER` (Subordinates) | Shift assignments, leave approvals, overtime approvals, team performance | Yes | Yes |
| **Team Lead** | HRMS Enterprise | `TEAM` (Assigned Team) | Team roster tracking, shift handovers, initial leave recommendation | Yes | Yes |
| **Employee** | Mobile ESS & Web ESS | `SELF` (Own records only)| Personal clock-in, leave apply, payslip downloads, KYC uploads | Yes (ESS) | Yes (Primary) |
| **Vendor Admin** | Dedicated Vendor Portal | `VENDOR` (Agency only) | Contract workforce deployments, invoice submissions, Form V compliance | Yes (Portal)| No |
| **Recruiter** | HRMS Enterprise | `RECRUITMENT` | Job requisitions, applicant tracking, interview scheduling | Yes | No |
| **Compliance Admin** | HRMS Enterprise | `COMPLIANCE` | Labor law compliance audits, POSH complaints, statutory inspection logs | Yes | No |

---

## 2. Role ➔ Module Access Matrix

*Legend:*  
- **FULL**: View, Create, Edit, Delete, Approve, Export  
- **MANAGE**: View, Create, Edit, Approve, Export (No destructive delete)  
- **APPROVE**: View, Approve / Reject, Comment  
- **VIEW**: Read-only access  
- **SELF**: Access restricted strictly to user's own employee identity  
- **DENIED**: Complete access barrier enforced at Router & PostgreSQL RLS level  

| Module / Route Area | Super Admin | Org / Company Admin | HR Head | Payroll / Finance | Manager | Team Lead | Employee (ESS) | Vendor Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Platform Control Plane** | **FULL** | DENIED | DENIED | DENIED | DENIED | DENIED | DENIED | DENIED |
| **Executive Dashboard** | **VIEW** | **FULL** | **FULL** | **VIEW** | **VIEW** | **VIEW** | DENIED | DENIED |
| **Employee Directory** | **VIEW** | **MANAGE** | **MANAGE** | **VIEW** | **VIEW (Team)**| **VIEW (Team)**| **VIEW (Public)**| DENIED |
| **Onboarding Wizard** | DENIED | **FULL** | **FULL** | **VIEW** | DENIED | DENIED | DENIED | DENIED |
| **Salary Structures** | DENIED | **MANAGE** | **MANAGE** | **MANAGE** | DENIED | DENIED | DENIED | DENIED |
| **Attendance Muster** | DENIED | **MANAGE** | **MANAGE** | **VIEW** | **VIEW (Team)**| **VIEW (Team)**| **SELF** | DENIED |
| **Biometric Devices** | **FULL** | **MANAGE** | **MANAGE** | DENIED | DENIED | DENIED | DENIED | DENIED |
| **Attendance Regularization**| DENIED | **APPROVE** | **APPROVE**| DENIED | **APPROVE** | **VIEW** | **SELF (Apply)**| DENIED |
| **Leave Management** | DENIED | **MANAGE** | **MANAGE** | **VIEW** | **APPROVE** | **VIEW** | **SELF (Apply)**| DENIED |
| **Shift Scheduling** | DENIED | **MANAGE** | **MANAGE** | DENIED | **MANAGE (Team)**| **VIEW** | **SELF (View)** | DENIED |
| **Payroll Processing** | DENIED | **FULL** | **FULL** | **FULL** | DENIED | DENIED | DENIED | DENIED |
| **Bank Disbursement** | DENIED | **MANAGE** | **MANAGE** | **FULL** | DENIED | DENIED | DENIED | DENIED |
| **Digital Payslips** | DENIED | **MANAGE** | **MANAGE** | **FULL** | DENIED | DENIED | **SELF (Download)**| DENIED |
| **Vendor Hub & Contracts**| DENIED | **FULL** | **FULL** | **VIEW** | DENIED | DENIED | DENIED | DENIED |
| **Vendor 3-Way Match** | DENIED | **FULL** | **FULL** | **FULL** | DENIED | DENIED | DENIED | DENIED |
| **Vendor Portal Workspace**| DENIED | DENIED | DENIED | DENIED | DENIED | DENIED | DENIED | **FULL** |
| **Mobile Geofence Punch** | DENIED | DENIED | **SELF** | DENIED | **SELF** | **SELF** | **SELF** | DENIED |
| **Asset Management** | DENIED | **MANAGE** | **MANAGE** | DENIED | **VIEW** | DENIED | **SELF (Assigned)**| DENIED |
| **Audit Logs & Ledger** | **FULL** | **FULL** | **VIEW** | **VIEW** | DENIED | DENIED | DENIED | DENIED |
