# JCS WorkforceOS — Production Employee Authentication, Supabase Auth, Tenant Isolation & Phone OTP Implementation Plan

## Executive Summary
This implementation plan establishes an enterprise-grade authentication and identity architecture for JCS WorkforceOS. It cleanly decouples **Identity** (Supabase Auth / Phone / Credentials), **HR Employee Master** (`employees` table), **Tenant Membership** (`organizations` / `companies`), and **Authorization / Permissions** (`roles` / RLS), eliminating test-only shortcuts (`password123`, hardcoded mock users) and providing an automated employee provisioning lifecycle with Phone OTP and phone-password authentication.

---

## Architecture Blueprint

```
                            HR Creates Employee (WorkForceOS)
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │    1. Validate Employee Master Data     │
                      │    2. Insert Employee Record            │
                      │    3. Normalize Phone (E.164: +91...)   │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │   Idempotent Auth Provisioning RPC      │
                      │   - Check tenant duplicate phone        │
                      │   - Create employee_auth_identities     │
                      │   - Status: INVITED / PROVISIONING      │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │   Server-Side Supabase Admin API        │
                      │   (Edge Function / Secure Backend)      │
                      │   - Create Supabase Auth User           │
                      │   - Link auth_user_id to Employee       │
                      │   - Send SMS Activation OTP / Link      │
                      └─────────────────────────────────────────┘
                                           │
         ┌─────────────────────────────────┴─────────────────────────────────┐
         ▼                                                                   ▼
   Employee First Login                                              Standard Login
┌────────────────────────────┐                                  ┌───────────────────────────┐
│ 1. Enter Phone (+91...)    │                                  │ 1. Phone + Password       │
│ 2. Verify OTP (SMS)        │                                  │    OR                     │
│ 3. Set Personal Password   │                                  │    Phone + OTP            │
│ 4. Status -> ACTIVE        │                                  │ 2. Verify Credentials     │
│ 5. first_login_done = true │                                  │ 3. Issue Session / JWT    │
└──────────────┬─────────────┘                                  └─────────────┬─────────────┘
               │                                                              │
               └──────────────────────────────┬───────────────────────────────┘
                                              ▼
                                 Tenant & Role Resolver
                                 - Resolve Tenant Context
                                 - Resolve Employee Profile
                                 - Resolve Application Role & Permissions
                                              │
                      ┌───────────────────────┼───────────────────────┐
                      ▼                       ▼                       ▼
               Super Admin               HR / Admin               Employee
          (/platform-dashboard)          (/dashboard)         (/ess-dashboard)
```

---

## Proposed Changes

### 1. Database & Security Schema Migrations

#### [NEW] [20260824_044_production_employee_auth_and_tenant_isolation.sql](file:///d:/workforceos-enterprise-hrms/supabase/migrations/20260824_044_production_employee_auth_and_tenant_isolation.sql)
- **`employee_auth_identities` table**:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `tenant_id VARCHAR NOT NULL REFERENCES organizations(id)`
  - `employee_id VARCHAR NOT NULL`
  - `auth_user_id UUID UNIQUE` (references `auth.users(id)`)
  - `phone VARCHAR(50) NOT NULL` (E.164 normalized format e.g. `+919876543210`)
  - `email VARCHAR(255)`
  - `status VARCHAR(50) DEFAULT 'INVITED'` (`PENDING`, `INVITED`, `ACTIVE`, `SUSPENDED`, `LOCKED`, `TERMINATED`, `DISABLED`)
  - `activation_status VARCHAR(50) DEFAULT 'INVITED'` (`NOT_STARTED`, `PROVISIONING`, `INVITED`, `PHONE_VERIFIED`, `PASSWORD_SET`, `ACTIVE`, `FAILED`)
  - `first_login_completed BOOLEAN DEFAULT false`
  - `password_change_required BOOLEAN DEFAULT false`
  - `otp_enabled BOOLEAN DEFAULT true`
  - `failed_login_attempts INTEGER DEFAULT 0`
  - `lockout_until TIMESTAMPTZ`
  - `last_login_at TIMESTAMPTZ`
  - `last_login_ip VARCHAR(100)`
  - `created_at TIMESTAMPTZ DEFAULT NOW()`
  - `updated_at TIMESTAMPTZ DEFAULT NOW()`
  - Unique constraint: `UNIQUE(tenant_id, employee_id)` and `UNIQUE(tenant_id, phone)`
- **`auth_audit_logs` table**:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `tenant_id VARCHAR NOT NULL`
  - `actor_id VARCHAR NOT NULL`
  - `actor_type VARCHAR(50) NOT NULL` (`EMPLOYEE`, `ADMIN`, `SYSTEM`, `DEVICE`)
  - `event_type VARCHAR(100) NOT NULL` (`LOGIN_SUCCESS`, `LOGIN_FAILURE`, `OTP_REQUESTED`, `OTP_VERIFIED`, `PASSWORD_CHANGED`, `PASSWORD_RESET`, `SESSION_REVOKED`, `ACCOUNT_SUSPENDED`, `ACCOUNT_ACTIVATED`, `EMPLOYEE_TERMINATED`, `PROVISIONING_SUCCESS`, `PROVISIONING_FAILED`, etc.)
  - `details JSONB` (guaranteed sanitization: NEVER OTP codes or passwords)
  - `ip_address VARCHAR(100)`
  - `user_agent TEXT`
  - `created_at TIMESTAMPTZ DEFAULT NOW()`
- **`auth_active_sessions` table**:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `tenant_id VARCHAR NOT NULL`
  - `auth_user_id UUID`
  - `employee_id VARCHAR NOT NULL`
  - `device_info TEXT`
  - `browser TEXT`
  - `os TEXT`
  - `ip_address TEXT`
  - `is_revoked BOOLEAN DEFAULT false`
  - `last_active_at TIMESTAMPTZ DEFAULT NOW()`
  - `created_at TIMESTAMPTZ DEFAULT NOW()`
- **Stored Procedures & RPCs**:
  - `provision_employee_auth_identity(p_tenant_id, p_employee_id, p_phone, p_email, p_role)`: Idempotent transactional provisioning with phone uniqueness enforcement.
  - `resolve_authenticated_identity(p_auth_user_id)`: Server-side identity resolution returning tenant, employee, role, and permission grants.
- **Row Level Security (RLS)**:
  - Strict tenant boundary policies ensuring users cannot query or mutate records belonging to other tenants.

---

### 2. Edge Function for Server-Side Supabase Auth Provisioning

#### [NEW] [supabase/functions/employee-auth-provisioner/index.ts](file:///d:/workforceos-enterprise-hrms/supabase/functions/employee-auth-provisioner/index.ts)
- Secure Deno edge function executed with `SUPABASE_SERVICE_ROLE_KEY`.
- Accepts requests authenticated by an HR Admin.
- Validates the admin's tenant permissions.
- Calls `supabase.auth.admin.createUser({ phone, email, password, phone_confirm: true })`.
- Inserts/updates `employee_auth_identities` linking `auth_user_id` with `employee_id`.
- Records audit log in `auth_audit_logs`.

---

### 3. Authentication & SMS Service Layer

#### [NEW] [src/services/auth/smsProviderService.ts](file:///d:/workforceos-enterprise-hrms/src/services/auth/smsProviderService.ts)
- `ISMSProvider` interface with pluggable provider adapters:
  - `Msg91SMSAdapter` (India TRAI/DLT compliant templates & sender IDs)
  - `TwilioSMSAdapter` (Global SMS / OTP delivery)
  - `ConsoleMockSMSAdapter` (Safe development fallback showing generated OTP in developer console & test banner without sending external SMS charges)
- Automatic phone normalization: `normalizePhoneNumber('+91 98401 22334')` -> `+919840122334`.

#### [NEW] [src/services/auth/employeeAuthService.ts](file:///d:/workforceos-enterprise-hrms/src/services/auth/employeeAuthService.ts)
- Core service managing employee authentication lifecycle:
  - `provisionEmployeeAuth(...)`: Idempotent provisioning linking employee and auth identity.
  - `signInWithPhonePassword(phone, password, tenantId)`: Authenticates via Supabase Auth or verified database identity.
  - `requestLoginOtp(phone, tenantId)`: Sends login OTP with rate-limiting & 60s cooldown.
  - `verifyLoginOtp(phone, otpCode, tenantId)`: Validates OTP and creates session.
  - `requestActivationOtp(phone, tenantId)`: Sends first-time activation code.
  - `verifyActivationAndSetPassword(phone, otpCode, newPassword, tenantId)`: Verifies activation code and sets personal password.
  - `requestPasswordResetOtp(phone, tenantId)`: Initiates password reset.
  - `resetPasswordWithOtp(phone, otpCode, newPassword, tenantId)`: Verifies reset OTP and updates credentials, invalidating older sessions.
  - `suspendEmployeeAuth(employeeId, tenantId)`: Disables login immediately.
  - `activateEmployeeAuth(employeeId, tenantId)`: Restores access.
  - `terminateEmployeeAuth(employeeId, tenantId)`: Revokes all sessions, preserves historical records.
  - `getEmployeeAuthStatus(employeeId, tenantId)`: Returns current identity & security status.
  - `getAuthAuditLogs(employeeId?, tenantId)`: Fetches audit trail.

---

### 4. UI & Auth Flow Modernization

#### [MODIFY] [src/features/auth/LoginForm.tsx](file:///d:/workforceos-enterprise-hrms/src/features/auth/LoginForm.tsx)
- Replaces mock hardcoded `'password123'` check with real production authentication flow:
  - Tab selector: **Phone + Password** vs **Phone + OTP**.
  - E.164 Phone Input with Country Code selector (+91 default).
  - 6-digit OTP Input with 60s countdown timer & resend throttling.
  - "First Time Logging In? Activate Account" button.
  - "Forgot Password?" trigger.
  - Development quick-login demo pills isolated behind `VITE_AUTH_DEV_BYPASS` flag.
  - Proper role-based redirection based on resolved persona (`Super Admin`, `HR Head`, `Team Lead`, `Employee`).

#### [NEW] [src/features/auth/EmployeeActivationModal.tsx](file:///d:/workforceos-enterprise-hrms/src/features/auth/EmployeeActivationModal.tsx)
- 4-step first-time employee onboarding modal:
  1. Enter registered phone number.
  2. Enter OTP sent to phone.
  3. Create personal secure password (with validation meter).
  4. Confirmation & auto-login to Employee Dashboard.

#### [MODIFY] [src/features/auth/ForgotPasswordModal.tsx](file:///d:/workforceos-enterprise-hrms/src/features/auth/ForgotPasswordModal.tsx)
- Upgrade from email-only mockup to real Phone OTP password reset flow:
  1. Enter registered phone.
  2. Verify OTP.
  3. Enter and confirm new password.
  4. Session invalidation & success notice.

#### [MODIFY] [src/features/people/EmployeeCreateWizardModal.tsx](file:///d:/workforceos-enterprise-hrms/src/features/people/EmployeeCreateWizardModal.tsx) & [WizardSuccessScreen.tsx](file:///d:/workforceos-enterprise-hrms/src/features/people/wizard/WizardSuccessScreen.tsx)
- Integrates automatic Auth Account Provisioning during employee creation.
- Normalizes phone numbers before saving.
- Displays auth provisioning status on the success screen (`Login Access: Provisioned (+91 XXXXX XXXXX) - Status: Invited`).
- Provides 1-click **"Retry Authentication Provisioning"** if network or SMS provider fails, without creating duplicate employee records.

#### [MODIFY] [src/features/people/EmployeeProfileDrawer.tsx](file:///d:/workforceos-enterprise-hrms/src/features/people/EmployeeProfileDrawer.tsx)
- Adds a new **"Access & Security"** tab (`id: 'access'`) for HR Admins to:
  - Inspect Login Status (Active / Invited / Suspended / Terminated).
  - Check First Login completion status and last login timestamp & IP.
  - Trigger "Resend Activation Instructions" or "Send Password Reset".
  - One-click "Suspend Login Access" / "Reactivate Access".
  - View "Active Device Sessions" & "Revoke All Sessions".
  - View real-time "Authentication Audit Trail".

---

## Verification Plan

### Automated & Unit Verifications
- Test phone normalization: verify `+919876543210`, `09876543210`, `9876543210`, and formatted variations all resolve to valid E.164.
- Test idempotent provisioning: verify calling provisioning multiple times on the same employee/phone does not create duplicate identities.
- Test login flows:
  - Valid Phone + Password -> succeeds and returns correct role & tenant.
  - Invalid Password -> fails cleanly without leaking account existence.
  - Phone OTP request -> generates code, enforces 60s cooldown timer.
  - OTP verification -> activates account, marks `first_login_completed = true`.
  - Password reset -> verifies OTP, changes password, revokes previous sessions.
- Test account suspension and termination: verify suspended/terminated users are rejected at login.
- Test tenant isolation: verify queries cannot access auth identities or records belonging to a different tenant.

### Manual Verification
- Create a new employee in **People -> Add Employee Wizard**:
  - Observe automatic auth account creation.
  - Check success screen displays the provisioned login phone and status.
- Open **Employee Profile Drawer -> Access & Security Tab**:
  - Verify login status, action buttons (Suspend, Reset, Revoke sessions).
- Test **Employee First-Time Login**:
  - Go to Login -> Click "Activate Account" -> Enter phone -> Enter OTP -> Set password -> Sign in.
- Test **Forgot Password Flow**:
  - Click "Forgot Password" -> Request OTP -> Reset password -> Login with new credentials.
