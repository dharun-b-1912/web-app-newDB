# JOY PeopleHR — DIRECT TENANT USER PROVISIONING WALKTHROUGH
## Direct Provisioning Workflow: Company Admin → HR Head → Employee

---

## 1. Direct HR Head Creation Workflow (Company Admin)

1. **Company Admin Logs in:**
   - Navigates to **Administration $\rightarrow$ User Provisioning** or **Access & Roles (RBAC)**.
   - Top Header correctly shows `Company Admin (Company)` (Identity bug resolved).
2. **Opens Provisioning Modal:**
   - Clicks **Provision User** / **Create User**.
   - Modal defaults to **Direct Account Creation (Immediate Login)**.
   - Enters Full Name (e.g. "Priya Sharma"), Work Email (e.g. `priya@companya.com`), Role (`HR Head`), and Department (`Human Resources`).
3. **Submits Form:**
   - The application immediately calls `adminApi.provisionUserDirectly`.
   - A real GoTrue Auth user is created with temporary password `joypeoplehr` and `must_change_password: true`.
   - `user_profiles` and `user_roles` are linked to `roles.code = 'HR_HEAD'` and the company's tenant context.
   - The newly provisioned HR Head immediately appears in the **Active Users** list with status **Active**.
   - **No email delivery or pending invitation is required.**

---

## 2. First-Login Experience (HR Head)

1. **HR Head navigates to JOY PeopleHR Login:**
   - Enters `priya@companya.com` + `joypeoplehr`.
   - Supabase GoTrue Auth validates the credentials.
2. **Password Setup Modal Appears:**
   - Mandatory modal prompts the user to enter their permanent password.
   - `supabase.auth.updateUser({ password: newPassword })` updates the GoTrue password hash.
   - `must_change_password` is updated to `false` in `user_profiles`.
3. **Portal Navigation:**
   - `roleResolutionService` resolves `primaryRole = 'HR Head'`.
   - User is directed to the **HR Administrative Dashboard** (`/dashboard`).

---

## 3. Employee Onboarding & Cross-Client Verification (HR Head $\rightarrow$ Employee)

1. **HR Head Onboards Employee:**
   - Enters employee details and work email (e.g. `ramesh@companya.com`).
   - The system automatically provisions the Supabase Auth user with temporary password `joypeoplehr` and links role `EMPLOYEE`.
2. **Employee Logs In on Web or Flutter:**
   - Enters `ramesh@companya.com` + `joypeoplehr`.
   - On first login, sets permanent password.
   - Lands on **Employee Self-Service** (`/ess-dashboard`).
3. **Cross-Platform Consistency:**
   - Web ESS and Flutter mobile share the exact same Supabase Auth user (`auth.users.id`) and PostgreSQL database records.

---

## 4. Code & UI Refinements Applied

1. **`src/services/organizationContextService.ts`**:
   - Fixed `formatCleanRoleTitle` to normalize snake_case role codes (`COMPANY_ADMIN`, `HR_HEAD`, `SUPER_ADMIN`).
2. **`src/components/shell/UserMenu.tsx`**:
   - Direct binding of `effectiveRoleBadge` to user role code, eliminating the `Employee (Self)` fallback.
3. **`src/services/adminApi.ts`**:
   - Added `provisionUserDirectly` to create Supabase Auth accounts and role bindings without hardcoded IDs.
4. **`src/features/admin/subviews/UserManagementView.tsx`**:
   - Added direct provisioning mode with immediate table refresh into Active Users.
5. **`src/features/rbac/RbacView.tsx`**:
   - Connected `handleCreateUser` to `userAuthProvisionerService.provisionUser` with dynamic tenant scoping.
6. **`src/services/platform/platformAuthInvitationService.ts`**:
   - Routed GoTrue user provisioning through universal provisioner.

---

## 5. Verification Summary

- **Web Build:** `npm run build` $\rightarrow$ Passed with 0 errors.
- **Flutter Static Analysis:** `flutter analyze` $\rightarrow$ Passed with 0 issues.
- **Decommissioned Project References (`wmqjmyzzamgxyeuotbki`):** 0 active references.
- **Client Secrets Scan:** 0 exposures of `service_role`.
- **Final Classification:** **GREEN — PASS**
