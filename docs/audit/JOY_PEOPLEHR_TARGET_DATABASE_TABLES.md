# JOY PeopleHR — Target Database Table Specifications
**Document Version:** 2.0.0-PROD  
**Database Project ID:** `ysiajemrqakfngasehhi` (Greenfield Supabase / PostgreSQL 15)  
**Total Canonical Tables:** 65 Tables across 18 Functional Domains  

---

# Domain 01: Platform & SaaS Control Plane

### 1.1 `platform_users`
- **Purpose**: Authenticated SaaS platform operators and support staff (distinct from customer organization employees).
- **Domain**: `Platform & SaaS Control Plane`
- **Ownership**: Platform Layer (No `organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `auth_user_id` (UUID, NOT NULL, UNIQUE, REFERENCES `auth.users(id)` ON DELETE CASCADE)
  - `email` (VARCHAR(255), NOT NULL, UNIQUE)
  - `full_name` (VARCHAR(150), NOT NULL)
  - `role` (VARCHAR(50), NOT NULL, DEFAULT `'SUPER_ADMIN'`, CHECK (`role IN ('SUPER_ADMIN', 'BILLING_ADMIN', 'SUPPORT_LEAD', 'SECURITY_OFFICER')`))
  - `is_active` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_platform_users_auth` on (`auth_user_id`), `idx_platform_users_email` on (`email`).
- **RLS Concept**: Restricted exclusively to JWT sessions where `auth.jwt() ->> 'is_platform_admin' = 'true'`.
- **Why it exists**: Prevents SaaS platform administrators from occupying customer tenant employee directories.

### 1.2 `platform_plans`
- **Purpose**: Commercial SaaS subscription tier catalog (e.g. Starter, Growth, Enterprise).
- **Domain**: `Platform & SaaS Control Plane`
- **Ownership**: Platform Layer
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `code` (VARCHAR(50), NOT NULL, UNIQUE) — e.g. `'ENTERPRISE_HRMS'`
  - `name` (VARCHAR(100), NOT NULL)
  - `description` (TEXT)
  - `billing_interval` (VARCHAR(20), NOT NULL, DEFAULT `'MONTHLY'`, CHECK (`billing_interval IN ('MONTHLY', 'QUARTERLY', 'ANNUAL')`))
  - `base_price` (NUMERIC(15, 2), NOT NULL, DEFAULT `0.00`)
  - `price_per_employee` (NUMERIC(15, 2), NOT NULL, DEFAULT `0.00`)
  - `max_employees` (INTEGER, NOT NULL, DEFAULT `100`)
  - `feature_flags` (JSONB, NOT NULL, DEFAULT `'{}'::jsonb`)
  - `is_active` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_platform_plans_code` on (`code`).
- **RLS Concept**: Read-only for authenticated tenant admins; Write restricted to Platform Admins.

### 1.3 `saas_subscriptions`
- **Purpose**: Active commercial subscription contract binding an Organization to a SaaS Plan.
- **Domain**: `Platform & SaaS Control Plane`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `plan_id` (UUID, NOT NULL, REFERENCES `platform_plans(id)`)
  - `status` (VARCHAR(32), NOT NULL, DEFAULT `'TRIAL'`, CHECK (`status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED')`))
  - `billing_cycle` (VARCHAR(20), NOT NULL, DEFAULT `'MONTHLY'`)
  - `current_period_start` (TIMESTAMPTZ, NOT NULL)
  - `current_period_end` (TIMESTAMPTZ, NOT NULL)
  - `cancel_at_period_end` (BOOLEAN, NOT NULL, DEFAULT `false`)
  - `max_employees_allowed` (INTEGER, NOT NULL)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_saas_subs_org` on (`organization_id`), `idx_saas_subs_status` on (`status`).
- **RLS Concept**: Tenant Admins can view own subscription; Platform Admins can modify.

### 1.4 `background_jobs`
- **Purpose**: Asynchronous task queue for heavy batch workloads (monthly payroll runs, bulk payslip PDFs, daily attendance sync).
- **Domain**: `Platform & SaaS Control Plane`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `job_type` (VARCHAR(100), NOT NULL) — e.g. `'PAYROLL_BATCH_CALCULATION'`, `'BULK_PAYSLIP_EMAIL'`
  - `payload` (JSONB NOT NULL DEFAULT `'{}'::jsonb`)
  - `status` (VARCHAR(32), NOT NULL, DEFAULT `'QUEUED'`, CHECK (`status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')`))
  - `attempts` (INTEGER NOT NULL DEFAULT `0`)
  - `max_attempts` (INTEGER NOT NULL DEFAULT `3`)
  - `error_message` (TEXT)
  - `scheduled_for` (TIMESTAMPTZ NOT NULL DEFAULT `now()`)
  - `started_at` (TIMESTAMPTZ)
  - `completed_at` (TIMESTAMPTZ)
  - `created_at` (TIMESTAMPTZ NOT NULL DEFAULT `now()`)
- **Constraints & Indexes**: `idx_bg_jobs_status_sched` on (`status`, `scheduled_for`), `idx_bg_jobs_org` on (`organization_id`).

---

# Domain 02: Organization & Corporate Hierarchy

### 2.1 `organizations`
- **Purpose**: The canonical root tenant entity in JOY PeopleHR.
- **Domain**: `Organization & Corporate Hierarchy`
- **Ownership**: Canonical Tenant Root (`id` IS the tenant key)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `legal_name` (VARCHAR(200), NOT NULL) — e.g. `'Joy Corporate Solutions Private Limited'`
  - `display_name` (VARCHAR(150), NOT NULL) — e.g. `'Joy Corporate Solutions'`
  - `slug` (VARCHAR(100), NOT NULL, UNIQUE) — e.g. `'joy-corporate'`
  - `organization_code` (VARCHAR(32), NOT NULL, UNIQUE) — e.g. `'ORG-JOY-01'`
  - `industry` (VARCHAR(100))
  - `country` (VARCHAR(10), NOT NULL, DEFAULT `'IN'`)
  - `currency` (VARCHAR(10), NOT NULL, DEFAULT `'INR'`)
  - `timezone` (VARCHAR(50), NOT NULL, DEFAULT `'Asia/Kolkata'`)
  - `logo_url` (TEXT)
  - `website_url` (TEXT)
  - `status` (VARCHAR(32), NOT NULL, DEFAULT `'ACTIVE'`, CHECK (`status IN ('ACTIVE', 'ONBOARDING', 'SUSPENDED', 'INACTIVE')`))
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_orgs_slug` on (`slug`), `idx_orgs_code` on (`organization_code`).
- **RLS Concept**: Users can only read the organization record matching their active `organization_id`.

### 2.2 `companies`
- **Purpose**: Registered legal corporate entities owned by an Organization (e.g. for statutory tax registration).
- **Domain**: `Organization & Corporate Hierarchy`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `legal_name` (VARCHAR(200), NOT NULL)
  - `trade_name` (VARCHAR(150))
  - `company_code` (VARCHAR(32), NOT NULL) — e.g. `'JCS-IN'`
  - `cin_number` (VARCHAR(50))
  - `pan_number` (VARCHAR(20))
  - `gstin` (VARCHAR(30))
  - `registered_address` (TEXT)
  - `city` (VARCHAR(100), NOT NULL)
  - `state` (VARCHAR(100), NOT NULL)
  - `postal_code` (VARCHAR(20), NOT NULL)
  - `country` (VARCHAR(10), NOT NULL, DEFAULT `'IN'`)
  - `is_headquarters` (BOOLEAN, NOT NULL, DEFAULT `false`)
  - `is_active` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_companies_org_code` UNIQUE (`organization_id`, `company_code`), `idx_companies_org` on (`organization_id`).

### 2.3 `branches`
- **Purpose**: Physical offices or geographical branch operations of a legal Company.
- **Domain**: `Organization & Corporate Hierarchy`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `company_id` (UUID, NOT NULL, REFERENCES `companies(id)` ON DELETE CASCADE)
  - `name` (VARCHAR(150), NOT NULL) — e.g. `'Coimbatore Regional Hub'`
  - `branch_code` (VARCHAR(32), NOT NULL) — e.g. `'BR-CBE-01'`
  - `phone` (VARCHAR(30))
  - `email` (VARCHAR(255))
  - `city` (VARCHAR(100), NOT NULL)
  - `state` (VARCHAR(100), NOT NULL)
  - `country` (VARCHAR(10), NOT NULL, DEFAULT `'IN'`)
  - `timezone` (VARCHAR(50), NOT NULL, DEFAULT `'Asia/Kolkata'`)
  - `is_active` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_branches_org_code` UNIQUE (`organization_id`, `branch_code`), `idx_branches_org_comp` on (`organization_id`, `company_id`).

### 2.4 `work_locations`
- **Purpose**: Specific physical facilities, buildings, floors, and GPS geofence perimeters.
- **Domain**: `Organization & Corporate Hierarchy`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `branch_id` (UUID, NOT NULL, REFERENCES `branches(id)` ON DELETE CASCADE)
  - `name` (VARCHAR(150), NOT NULL) — e.g. `'Main Tower - 3rd Floor'`
  - `address_line1` (TEXT, NOT NULL)
  - `latitude` (NUMERIC(10, 7))
  - `longitude` (NUMERIC(10, 7))
  - `geofence_radius_meters` (INTEGER NOT NULL DEFAULT `100`)
  - `is_geofencing_enabled` (BOOLEAN NOT NULL DEFAULT `false`)
  - `is_active` (BOOLEAN NOT NULL DEFAULT `true`)
  - `created_at` (TIMESTAMPTZ NOT NULL DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ NOT NULL DEFAULT `now()`)
- **Constraints & Indexes**: `idx_work_loc_org` on (`organization_id`), `idx_work_loc_branch` on (`branch_id`).

### 2.5 `departments`
- **Purpose**: Departmental organizational units supporting parent-child hierarchy.
- **Domain**: `Organization & Corporate Hierarchy`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `company_id` (UUID, NOT NULL, REFERENCES `companies(id)` ON DELETE CASCADE)
  - `parent_department_id` (UUID, REFERENCES `departments(id)` ON DELETE SET NULL)
  - `name` (VARCHAR(150), NOT NULL) — e.g. `'Engineering'`
  - `code` (VARCHAR(32), NOT NULL) — e.g. `'DEP-ENG'`
  - `head_employee_id` (UUID)
  - `is_active` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_departments_org_code` UNIQUE (`organization_id`, `company_id`, `code`), `idx_departments_org` on (`organization_id`).

### 2.6 `designations`
- **Purpose**: Job titles, bands, and organizational grade levels.
- **Domain**: `Organization & Corporate Hierarchy`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `company_id` (UUID, NOT NULL, REFERENCES `companies(id)` ON DELETE CASCADE)
  - `title` (VARCHAR(150), NOT NULL) — e.g. `'Senior Software Engineer'`
  - `code` (VARCHAR(32), NOT NULL) — e.g. `'DES-SSE'`
  - `grade` (VARCHAR(32)) — e.g. `'L3'`
  - `is_active` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_designations_org_code` UNIQUE (`organization_id`, `company_id`, `code`), `idx_designations_org` on (`organization_id`).

---

# Domain 03: Identity & Access Management (IAM)

### 3.1 `user_profiles`
- **Purpose**: Application-level profile for an authenticated Supabase identity.
- **Domain**: `Identity & Access Management (IAM)`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `auth_user_id` (UUID, NOT NULL, REFERENCES `auth.users(id)` ON DELETE CASCADE)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `employee_id` (UUID)
  - `email` (VARCHAR(255), NOT NULL)
  - `full_name` (VARCHAR(150), NOT NULL)
  - `phone` (VARCHAR(30))
  - `avatar_url` (TEXT)
  - `status` (VARCHAR(32), NOT NULL, DEFAULT `'ACTIVE'`, CHECK (`status IN ('ACTIVE', 'INVITED', 'LOCKED', 'DEACTIVATED')`))
  - `last_login_at` (TIMESTAMPTZ)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_user_profiles_auth_org` UNIQUE (`auth_user_id`, `organization_id`), `idx_user_profiles_email` on (`email`).

### 3.2 `roles`
- **Purpose**: System and custom RBAC security roles defined within an Organization.
- **Domain**: `Identity & Access Management (IAM)`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `name` (VARCHAR(100), NOT NULL) — e.g. `'Company Admin'`, `'HR Head'`, `'Manager'`, `'Employee'`
  - `code` (VARCHAR(50), NOT NULL) — e.g. `'COMPANY_ADMIN'`
  - `description` (TEXT)
  - `hierarchy_level` (INTEGER, NOT NULL, DEFAULT `5`)
  - `is_system_role` (BOOLEAN, NOT NULL, DEFAULT `false`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_roles_org_code` UNIQUE (`organization_id`, `code`), `idx_roles_org` on (`organization_id`).

### 3.3 `permissions`
- **Purpose**: Universal system permission catalog.
- **Domain**: `Identity & Access Management (IAM)`
- **Ownership**: Platform Reference Table
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `module` (VARCHAR(50), NOT NULL) — e.g. `'payroll'`, `'attendance'`, `'leave'`
  - `action` (VARCHAR(50), NOT NULL) — e.g. `'view'`, `'create'`, `'approve'`, `'export'`, `'delete'`
  - `code` (VARCHAR(100), NOT NULL, UNIQUE) — e.g. `'payroll.approve'`
  - `description` (TEXT)
- **Constraints & Indexes**: `idx_permissions_code` on (`code`).

### 3.4 `role_permissions`
- **Purpose**: Associative mapping assigning specific permissions to a Role.
- **Domain**: `Identity & Access Management (IAM)`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `role_id` (UUID, NOT NULL, REFERENCES `roles(id)` ON DELETE CASCADE)
  - `permission_id` (UUID, NOT NULL, REFERENCES `permissions(id)` ON DELETE CASCADE)
  - `scope_level` (VARCHAR(32), NOT NULL, DEFAULT `'COMPANY'`, CHECK (`scope_level IN ('COMPANY', 'BRANCH', 'DEPARTMENT', 'TEAM', 'SELF')`))
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_role_perm` UNIQUE (`role_id`, `permission_id`), `idx_role_perm_org` on (`organization_id`).

### 3.5 `user_roles`
- **Purpose**: Assigns one or more active Roles to a User Profile.
- **Domain**: `Identity & Access Management (IAM)`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `user_profile_id` (UUID, NOT NULL, REFERENCES `user_profiles(id)` ON DELETE CASCADE)
  - `role_id` (UUID, NOT NULL, REFERENCES `roles(id)` ON DELETE CASCADE)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_user_roles` UNIQUE (`user_profile_id`, `role_id`), `idx_user_roles_org` on (`organization_id`).

---

# Domain 04: Workforce & Employee Core

### 4.1 `employees`
- **Purpose**: The canonical workforce employee master entity.
- **Domain**: `Workforce & Employee Core`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `company_id` (UUID, NOT NULL, REFERENCES `companies(id)`)
  - `branch_id` (UUID, REFERENCES `branches(id)`)
  - `department_id` (UUID, NOT NULL, REFERENCES `departments(id)`)
  - `designation_id` (UUID, NOT NULL, REFERENCES `designations(id)`)
  - `reporting_manager_id` (UUID, REFERENCES `employees(id)` ON DELETE SET NULL)
  - `user_id` (UUID, REFERENCES `user_profiles(id)` ON DELETE SET NULL)
  - `employee_code` (VARCHAR(50), NOT NULL) — e.g. `'EMP-1001'`
  - `first_name` (VARCHAR(100), NOT NULL)
  - `middle_name` (VARCHAR(100))
  - `last_name` (VARCHAR(100), NOT NULL)
  - `display_name` (VARCHAR(200), NOT NULL)
  - `work_email` (VARCHAR(255), NOT NULL)
  - `personal_email` (VARCHAR(255))
  - `phone` (VARCHAR(30))
  - `gender` (VARCHAR(20), CHECK (`gender IN ('MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY')`))
  - `dob` (DATE)
  - `doj` (DATE, NOT NULL)
  - `confirmation_date` (DATE)
  - `employment_type` (VARCHAR(32), NOT NULL, DEFAULT `'FULL_TIME'`, CHECK (`employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'CONSULTANT')`))
  - `employment_status` (VARCHAR(32), NOT NULL, DEFAULT `'ACTIVE'`, CHECK (`employment_status IN ('ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'SUSPENDED', 'TERMINATED', 'RESIGNED')`))
  - `avatar_url` (TEXT)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `deleted_at` (TIMESTAMPTZ)
- **Constraints & Indexes**: `uq_employees_org_code` UNIQUE (`organization_id`, `employee_code`), `uq_employees_org_work_email` UNIQUE (`organization_id`, `work_email`), `idx_employees_org_status` on (`organization_id`, `employment_status`), `idx_employees_manager` on (`reporting_manager_id`).

### 4.2 `employee_profiles`
- **Purpose**: Extended personal background, demographics, blood group, and emergency details.
- **Domain**: `Workforce & Employee Core`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, UNIQUE, REFERENCES `employees(id)` ON DELETE CASCADE)
  - `marital_status` (VARCHAR(20))
  - `blood_group` (VARCHAR(10))
  - `nationality` (VARCHAR(50), DEFAULT `'Indian'`)
  - `emergency_contact_name` (VARCHAR(150))
  - `emergency_contact_phone` (VARCHAR(30))
  - `emergency_contact_relationship` (VARCHAR(50))
  - `bio` (TEXT)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_emp_profiles_emp` on (`employee_id`).

### 4.3 `employee_addresses`
- **Purpose**: Residential addresses (Present and Permanent).
- **Domain**: `Workforce & Employee Core`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, REFERENCES `employees(id)` ON DELETE CASCADE)
  - `address_type` (VARCHAR(20), NOT NULL, CHECK (`address_type IN ('PRESENT', 'PERMANENT')`))
  - `address_line1` (TEXT, NOT NULL)
  - `address_line2` (TEXT)
  - `city` (VARCHAR(100), NOT NULL)
  - `state` (VARCHAR(100), NOT NULL)
  - `postal_code` (VARCHAR(20), NOT NULL)
  - `country` (VARCHAR(50), NOT NULL, DEFAULT `'India'`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_emp_addr_type` UNIQUE (`employee_id`, `address_type`).

### 4.4 `employee_bank_details`
- **Purpose**: Salary disbursement bank account information.
- **Domain**: `Workforce & Employee Core`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, UNIQUE, REFERENCES `employees(id)` ON DELETE CASCADE)
  - `account_holder_name` (VARCHAR(150), NOT NULL)
  - `bank_name` (VARCHAR(150), NOT NULL)
  - `account_number` (VARCHAR(50), NOT NULL)
  - `ifsc_code` (VARCHAR(20), NOT NULL)
  - `branch_name` (VARCHAR(100))
  - `account_type` (VARCHAR(20), NOT NULL, DEFAULT `'SAVINGS'`, CHECK (`account_type IN ('SAVINGS', 'CURRENT', 'SALARY')`))
  - `is_verified` (BOOLEAN, NOT NULL, DEFAULT `false`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_emp_bank_org` on (`organization_id`).

### 4.5 `employee_statutory_details`
- **Purpose**: Indian statutory numbers (Aadhaar, PAN, UAN, PF, ESI).
- **Domain**: `Workforce & Employee Core`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, UNIQUE, REFERENCES `employees(id)` ON DELETE CASCADE)
  - `pan_number` (VARCHAR(20))
  - `aadhaar_number` (VARCHAR(20))
  - `uan_number` (VARCHAR(30))
  - `pf_number` (VARCHAR(50))
  - `esi_number` (VARCHAR(50))
  - `is_pf_eligible` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `is_esi_eligible` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `is_pt_eligible` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_emp_statutory_org` on (`organization_id`).

---

# Domain 05: Employee Lifecycle & Career Events

### 5.1 `employee_onboarding`
- **Purpose**: Tracks onboarding stage, document checklist, and welcome workflows.
- **Domain**: `Employee Lifecycle & Career Events`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, UNIQUE, REFERENCES `employees(id)` ON DELETE CASCADE)
  - `stage` (VARCHAR(32), NOT NULL, DEFAULT `'PRE_JOINING'`, CHECK (`stage IN ('PRE_JOINING', 'DOCUMENT_SUBMISSION', 'HR_VERIFICATION', 'COMPLETED')`))
  - `completion_percentage` (INTEGER, NOT NULL, DEFAULT `0`)
  - `target_completion_date` (DATE)
  - `completed_at` (TIMESTAMPTZ)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_emp_onboarding_org` on (`organization_id`).

### 5.2 `employee_lifecycle_events`
- **Purpose**: Historical log of promotions, designation updates, department transfers, and salary revisions.
- **Domain**: `Employee Lifecycle & Career Events`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, REFERENCES `employees(id)` ON DELETE CASCADE)
  - `event_type` (VARCHAR(50), NOT NULL, CHECK (`event_type IN ('JOINING', 'PROBATION_CONFIRMATION', 'PROMOTION', 'TRANSFER', 'SALARY_REVISION', 'RESIGNATION', 'TERMINATION')`))
  - `effective_date` (DATE, NOT NULL)
  - `previous_payload` (JSONB NOT NULL DEFAULT `'{}'::jsonb`)
  - `new_payload` (JSONB NOT NULL DEFAULT `'{}'::jsonb`)
  - `remarks` (TEXT)
  - `created_by` (UUID, REFERENCES `user_profiles(id)`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_emp_events_emp_date` on (`employee_id`, `effective_date`).

### 5.3 `employee_separations`
- **Purpose**: Exit workflow, resignation submissions, notice period tracking, and FnF clearance status.
- **Domain**: `Employee Lifecycle & Career Events`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, REFERENCES `employees(id)` ON DELETE CASCADE)
  - `resignation_date` (DATE, NOT NULL)
  - `requested_last_working_day` (DATE, NOT NULL)
  - `approved_last_working_day` (DATE)
  - `reason_category` (VARCHAR(100), NOT NULL)
  - `reason_notes` (TEXT)
  - `status` (VARCHAR(32), NOT NULL, DEFAULT `'SUBMITTED'`, CHECK (`status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXIT_CLEARANCE_IN_PROGRESS', 'SETTLED')`))
  - `exit_interview_completed` (BOOLEAN NOT NULL DEFAULT `false`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_emp_separations_org` on (`organization_id`, `status`).

---

# Domain 06: Time, Attendance & Biometrics

### 6.1 `biometric_devices`
- **Purpose**: Physical biometric devices (eSSL, ZKTeco) registered across branches.
- **Domain**: `Time, Attendance & Biometrics`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `branch_id` (UUID, NOT NULL, REFERENCES `branches(id)` ON DELETE CASCADE)
  - `device_name` (VARCHAR(100), NOT NULL)
  - `serial_number` (VARCHAR(100), NOT NULL)
  - `ip_address` (VARCHAR(50), NOT NULL)
  - `port` (INTEGER, NOT NULL, DEFAULT `4370`)
  - `protocol` (VARCHAR(20), NOT NULL, DEFAULT `'TCP'`, CHECK (`protocol IN ('TCP', 'UDP', 'HTTP', 'CLOUD')`))
  - `direction` (VARCHAR(20), NOT NULL, DEFAULT `'BOTH'`, CHECK (`direction IN ('IN', 'OUT', 'BOTH')`))
  - `last_heartbeat_at` (TIMESTAMPTZ)
  - `is_active` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_bio_devices_org_serial` UNIQUE (`organization_id`, `serial_number`), `idx_bio_devices_org` on (`organization_id`).

### 6.2 `attendance_punches` (Immutable High-Velocity Stream)
- **Purpose**: Raw punch stream captured from biometric terminals, face apps, and GPS clocks.
- **Domain**: `Time, Attendance & Biometrics`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, REFERENCES `employees(id)` ON DELETE CASCADE)
  - `device_id` (UUID, REFERENCES `biometric_devices(id)` ON DELETE SET NULL)
  - `punch_time` (TIMESTAMPTZ, NOT NULL)
  - `punch_type` (VARCHAR(20), NOT NULL, DEFAULT `'CHECK_IN'`, CHECK (`punch_type IN ('CHECK_IN', 'CHECK_OUT', 'AUTO')`))
  - `verification_mode` (VARCHAR(32), NOT NULL, DEFAULT `'BIOMETRIC'`, CHECK (`verification_mode IN ('BIOMETRIC', 'FACE', 'GPS', 'CARD', 'MANUAL')`))
  - `latitude` (NUMERIC(10, 7))
  - `longitude` (NUMERIC(10, 7))
  - `is_processed` (BOOLEAN, NOT NULL, DEFAULT `false`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_punches_org_time` on (`organization_id`, `punch_time`), `idx_punches_emp_time` on (`employee_id`, `punch_time`).

### 6.3 `attendance_daily`
- **Purpose**: Daily processed attendance summary calculated from raw punches and shift rules.
- **Domain**: `Time, Attendance & Biometrics`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, REFERENCES `employees(id)` ON DELETE CASCADE)
  - `shift_id` (UUID, REFERENCES `shifts(id)`)
  - `attendance_date` (DATE, NOT NULL)
  - `first_check_in` (TIMESTAMPTZ)
  - `last_check_out` (TIMESTAMPTZ)
  - `total_work_minutes` (INTEGER NOT NULL DEFAULT `0`)
  - `break_minutes` (INTEGER NOT NULL DEFAULT `0`)
  - `overtime_minutes` (INTEGER NOT NULL DEFAULT `0`)
  - `late_entry_minutes` (INTEGER NOT NULL DEFAULT `0`)
  - `early_exit_minutes` (INTEGER NOT NULL DEFAULT `0`)
  - `status` (VARCHAR(32), NOT NULL, DEFAULT `'PRESENT'`, CHECK (`status IN ('PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'WEEKLY_OFF', 'HOLIDAY', 'MISSED_PUNCH')`))
  - `payable_status` (NUMERIC(3, 2), NOT NULL, DEFAULT `1.00`, CHECK (`payable_status IN (1.00, 0.50, 0.00)`))
  - `is_regularized` (BOOLEAN NOT NULL DEFAULT `false`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_attendance_emp_date` UNIQUE (`employee_id`, `attendance_date`), `idx_attendance_org_date` on (`organization_id`, `attendance_date`).

### 6.4 `attendance_regularizations`
- **Purpose**: Missed punch or attendance correction requests submitted for manager approval.
- **Domain**: `Time, Attendance & Biometrics`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, REFERENCES `employees(id)` ON DELETE CASCADE)
  - `attendance_date` (DATE, NOT NULL)
  - `requested_check_in` (TIMESTAMPTZ)
  - `requested_check_out` (TIMESTAMPTZ)
  - `reason` (TEXT, NOT NULL)
  - `status` (VARCHAR(32), NOT NULL, DEFAULT `'PENDING'`, CHECK (`status IN ('PENDING', 'APPROVED', 'REJECTED')`))
  - `approved_by` (UUID, REFERENCES `employees(id)`)
  - `approved_at` (TIMESTAMPTZ)
  - `rejection_reason` (TEXT)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_regularizations_emp` on (`employee_id`, `attendance_date`), `idx_regularizations_org_status` on (`organization_id`, `status`).

---

# Domain 07: Shifts, Rostering & Schedules

### 7.1 `shifts`
- **Purpose**: Master definitions of work timings, grace periods, and break rules.
- **Domain**: `Shifts, Rostering & Schedules`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `name` (VARCHAR(100), NOT NULL)
  - `code` (VARCHAR(32), NOT NULL)
  - `start_time` (TIME WITHOUT TIME ZONE, NOT NULL)
  - `end_time` (TIME WITHOUT TIME ZONE, NOT NULL)
  - `grace_entry_minutes` (INTEGER, NOT NULL, DEFAULT `15`)
  - `grace_exit_minutes` (INTEGER, NOT NULL, DEFAULT `15`)
  - `min_half_day_hours` (NUMERIC(4, 2), NOT NULL, DEFAULT `4.00`)
  - `min_full_day_hours` (NUMERIC(4, 2), NOT NULL, DEFAULT `8.00`)
  - `is_overnight` (BOOLEAN, NOT NULL, DEFAULT `false`)
  - `is_active` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_shifts_org_code` UNIQUE (`organization_id`, `code`).

### 7.2 `employee_shift_assignments`
- **Purpose**: Binds an employee to a default or rotational shift schedule.
- **Domain**: `Shifts, Rostering & Schedules`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, REFERENCES `employees(id)` ON DELETE CASCADE)
  - `shift_id` (UUID, NOT NULL, REFERENCES `shifts(id)` ON DELETE CASCADE)
  - `valid_from` (DATE, NOT NULL)
  - `valid_to` (DATE)
  - `weekly_offs` (INTEGER[], NOT NULL, DEFAULT `'{0, 6}'`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_emp_shifts_emp_valid` on (`employee_id`, `valid_from`).

---

# Domain 08: Leave, Holidays & Absence Management

### 8.1 `leave_types`
- **Purpose**: Catalog of available leave categories (e.g. Casual, Sick, Earned, Maternity).
- **Domain**: `Leave, Holidays & Absence Management`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `name` (VARCHAR(100), NOT NULL)
  - `code` (VARCHAR(32), NOT NULL)
  - `annual_quota` (NUMERIC(5, 2), NOT NULL, DEFAULT `12.00`)
  - `accrual_frequency` (VARCHAR(20), NOT NULL, DEFAULT `'MONTHLY'`, CHECK (`accrual_frequency IN ('MONTHLY', 'QUARTERLY', 'ANNUAL', 'NONE')`))
  - `is_carry_forward_allowed` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `max_carry_forward_days` (NUMERIC(5, 2), NOT NULL, DEFAULT `10.00`)
  - `is_encashable` (BOOLEAN, NOT NULL, DEFAULT `false`)
  - `is_paid` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `is_active` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_leave_types_org_code` UNIQUE (`organization_id`, `code`).

### 8.2 `leave_balances` (Live Snapshot)
- **Purpose**: Live snapshot of allocated, used, and remaining leave quotas per employee.
- **Domain**: `Leave, Holidays & Absence Management`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, REFERENCES `employees(id)` ON DELETE CASCADE)
  - `leave_type_id` (UUID, NOT NULL, REFERENCES `leave_types(id)` ON DELETE CASCADE)
  - `calendar_year` (INTEGER, NOT NULL)
  - `opening_balance` (NUMERIC(6, 2), NOT NULL, DEFAULT `0.00`)
  - `accrued` (NUMERIC(6, 2), NOT NULL, DEFAULT `0.00`)
  - `consumed` (NUMERIC(6, 2), NOT NULL, DEFAULT `0.00`)
  - `closing_balance` (NUMERIC(6, 2), NOT NULL, DEFAULT `0.00`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_leave_bal_emp_year` UNIQUE (`employee_id`, `leave_type_id`, `calendar_year`), `idx_leave_bal_org` on (`organization_id`).

### 8.3 `leave_requests`
- **Purpose**: Employee leave applications undergoing multi-stage approvals.
- **Domain**: `Leave, Holidays & Absence Management`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, REFERENCES `employees(id)` ON DELETE CASCADE)
  - `leave_type_id` (UUID, NOT NULL, REFERENCES `leave_types(id)`)
  - `start_date` (DATE, NOT NULL)
  - `end_date` (DATE, NOT NULL)
  - `total_days` (NUMERIC(4, 2), NOT NULL)
  - `is_half_day` (BOOLEAN, NOT NULL, DEFAULT `false`)
  - `reason` (TEXT, NOT NULL)
  - `status` (VARCHAR(32), NOT NULL, DEFAULT `'PENDING'`, CHECK (`status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')`))
  - `approved_by` (UUID, REFERENCES `employees(id)`)
  - `approved_at` (TIMESTAMPTZ)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_leave_req_emp` on (`employee_id`, `start_date`), `idx_leave_req_org_status` on (`organization_id`, `status`).

### 8.4 `leave_ledger_entries` (Immutable Transaction Log)
- **Purpose**: Append-only transactional ledger recording every credit, debit, and adjustment to leave balances.
- **Domain**: `Leave, Holidays & Absence Management`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, REFERENCES `employees(id)` ON DELETE CASCADE)
  - `leave_type_id` (UUID, NOT NULL, REFERENCES `leave_types(id)`)
  - `leave_request_id` (UUID, REFERENCES `leave_requests(id)`)
  - `entry_type` (VARCHAR(32), NOT NULL, CHECK (`entry_type IN ('ACCRUAL', 'CONSUMPTION', 'ADJUSTMENT', 'CARRY_FORWARD', 'ENCASHMENT', 'LAPSE')`))
  - `units` (NUMERIC(5, 2), NOT NULL)
  - `running_balance_after` (NUMERIC(6, 2), NOT NULL)
  - `transaction_date` (DATE, NOT NULL)
  - `remarks` (TEXT)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_leave_ledger_emp` on (`employee_id`, `transaction_date`).

### 8.5 `holidays`
- **Purpose**: Organization and location-specific public and declared annual holidays.
- **Domain**: `Leave, Holidays & Absence Management`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `company_id` (UUID, REFERENCES `companies(id)`)
  - `branch_id` (UUID, REFERENCES `branches(id)`)
  - `name` (VARCHAR(150), NOT NULL) — e.g. `'Independence Day'`, `'Diwali'`
  - `holiday_date` (DATE, NOT NULL)
  - `is_restricted` (BOOLEAN, NOT NULL, DEFAULT `false`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_holidays_org_date` on (`organization_id`, `holiday_date`).

---

# Domain 09: Universal Approvals Engine

### 9.1 `approval_workflows`
- **Purpose**: Configurable multi-step approval pipelines for Leave, Attendance, Expenses, and Resignations.
- **Domain**: `Universal Approvals Engine`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `module` (VARCHAR(50), NOT NULL)
  - `name` (VARCHAR(150), NOT NULL)
  - `is_active` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_appr_wf_org_module` UNIQUE (`organization_id`, `module`).

### 9.2 `approval_instances`
- **Purpose**: Running instance of an approval workflow attached to a specific transaction record.
- **Domain**: `Universal Approvals Engine`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `workflow_id` (UUID, NOT NULL, REFERENCES `approval_workflows(id)`)
  - `target_entity_type` (VARCHAR(50), NOT NULL)
  - `target_entity_id` (UUID, NOT NULL)
  - `requester_employee_id` (UUID, NOT NULL, REFERENCES `employees(id)`)
  - `current_step_order` (INTEGER, NOT NULL, DEFAULT `1`)
  - `status` (VARCHAR(32), NOT NULL, DEFAULT `'IN_PROGRESS'`, CHECK (`status IN ('IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED')`))
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_appr_inst_target` on (`target_entity_type`, `target_entity_id`).

### 9.3 `approval_actions`
- **Purpose**: Individual approve/reject actions logged with timestamps and reviewer remarks.
- **Domain**: `Universal Approvals Engine`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `approval_instance_id` (UUID, NOT NULL, REFERENCES `approval_instances(id)` ON DELETE CASCADE)
  - `actor_employee_id` (UUID, NOT NULL, REFERENCES `employees(id)`)
  - `action` (VARCHAR(32), NOT NULL, CHECK (`action IN ('APPROVE', 'REJECT', 'DELEGATE', 'REQUEST_INFO')`))
  - `comments` (TEXT)
  - `action_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_appr_actions_inst` on (`approval_instance_id`).

---

# Domain 10: Payroll, Compensation & Statutory Engine

### 10.1 `salary_components`
- **Purpose**: Master catalog of compensation components (Basic, HRA, Special Allowance, PF, ESIC, PT, TDS).
- **Domain**: `Payroll, Compensation & Statutory Engine`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `name` (VARCHAR(150), NOT NULL)
  - `code` (VARCHAR(50), NOT NULL)
  - `type` (VARCHAR(20), NOT NULL, CHECK (`type IN ('EARNING', 'DEDUCTION', 'REIMBURSEMENT', 'STATUTORY_EMPLOYER')`))
  - `calculation_type` (VARCHAR(20), NOT NULL, DEFAULT `'FLAT'`, CHECK (`calculation_type IN ('FLAT', 'PERCENTAGE', 'FORMULA')`))
  - `is_taxable` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `is_statutory` (BOOLEAN, NOT NULL, DEFAULT `false`)
  - `is_active` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_salary_comp_org_code` UNIQUE (`organization_id`, `code`).

### 10.2 `salary_structures`
- **Purpose**: Standardized compensation templates grouped by designation grade.
- **Domain**: `Payroll, Compensation & Statutory Engine`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `name` (VARCHAR(150), NOT NULL)
  - `code` (VARCHAR(50), NOT NULL)
  - `description` (TEXT)
  - `is_active` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_salary_struc_org_code` UNIQUE (`organization_id`, `code`).

### 10.3 `salary_structure_components`
- **Purpose**: Maps salary components with percentage/formula definitions to a Salary Structure.
- **Domain**: `Payroll, Compensation & Statutory Engine`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `salary_structure_id` (UUID, NOT NULL, REFERENCES `salary_structures(id)` ON DELETE CASCADE)
  - `salary_component_id` (UUID, NOT NULL, REFERENCES `salary_components(id)`)
  - `value` (NUMERIC(15, 2), NOT NULL, DEFAULT `0.00`)
  - `formula_expression` (TEXT)
  - `display_order` (INTEGER, NOT NULL, DEFAULT `1`)
- **Constraints & Indexes**: `uq_struc_comp` UNIQUE (`salary_structure_id`, `salary_component_id`).

### 10.4 `employee_salary_assignments`
- **Purpose**: Point-in-time CTC and salary structure assignment for an Employee.
- **Domain**: `Payroll, Compensation & Statutory Engine`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, REFERENCES `employees(id)` ON DELETE CASCADE)
  - `salary_structure_id` (UUID, NOT NULL, REFERENCES `salary_structures(id)`)
  - `annual_ctc` (NUMERIC(15, 2), NOT NULL)
  - `monthly_gross` (NUMERIC(15, 2), NOT NULL)
  - `effective_from` (DATE, NOT NULL)
  - `effective_to` (DATE)
  - `is_active` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_emp_salary_assign` on (`employee_id`, `effective_from`).

### 10.5 `payroll_runs`
- **Purpose**: Monthly payroll batch execution cycle for an Organization/Company.
- **Domain**: `Payroll, Compensation & Statutory Engine`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `company_id` (UUID, NOT NULL, REFERENCES `companies(id)`)
  - `month` (INTEGER, NOT NULL, CHECK (`month BETWEEN 1 AND 12`))
  - `year` (INTEGER, NOT NULL)
  - `total_employees` (INTEGER, NOT NULL DEFAULT `0`)
  - `total_gross_pay` (NUMERIC(15, 2), NOT NULL DEFAULT `0.00`)
  - `total_deductions` (NUMERIC(15, 2), NOT NULL DEFAULT `0.00`)
  - `total_net_pay` (NUMERIC(15, 2), NOT NULL DEFAULT `0.00`)
  - `status` (VARCHAR(32), NOT NULL, DEFAULT `'DRAFT'`, CHECK (`status IN ('DRAFT', 'CALCULATED', 'VERIFIED', 'APPROVED', 'DISBURSED', 'LOCKED')`))
  - `processed_by` (UUID, REFERENCES `user_profiles(id)`)
  - `approved_by` (UUID, REFERENCES `user_profiles(id)`)
  - `disbursed_at` (TIMESTAMPTZ)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_payroll_runs_comp_period` UNIQUE (`company_id`, `year`, `month`), `idx_payroll_runs_org` on (`organization_id`).

### 10.6 `payroll_line_items` (Immutable Financial Records)
- **Purpose**: Individual employee gross-to-net payslip calculation lines generated during a payroll run.
- **Domain**: `Payroll, Compensation & Statutory Engine`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `payroll_run_id` (UUID, NOT NULL, REFERENCES `payroll_runs(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, REFERENCES `employees(id)`)
  - `total_working_days` (NUMERIC(4, 2), NOT NULL)
  - `payable_days` (NUMERIC(4, 2), NOT NULL)
  - `lop_days` (NUMERIC(4, 2), NOT NULL DEFAULT `0.00`)
  - `gross_earnings` (NUMERIC(15, 2), NOT NULL)
  - `total_deductions` (NUMERIC(15, 2), NOT NULL)
  - `net_pay` (NUMERIC(15, 2), NOT NULL)
  - `earnings_breakdown` (JSONB NOT NULL DEFAULT `'{}'::jsonb`)
  - `deductions_breakdown` (JSONB NOT NULL DEFAULT `'{}'::jsonb`)
  - `statutory_employer_contributions` (JSONB NOT NULL DEFAULT `'{}'::jsonb`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_payroll_line_emp` UNIQUE (`payroll_run_id`, `employee_id`), `idx_payroll_line_emp` on (`employee_id`).

### 10.7 `payslips`
- **Purpose**: Rendered and distributed employee digital payslip metadata.
- **Domain**: `Payroll, Compensation & Statutory Engine`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `payroll_line_item_id` (UUID, NOT NULL, UNIQUE, REFERENCES `payroll_line_items(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, REFERENCES `employees(id)`)
  - `payslip_number` (VARCHAR(50), NOT NULL, UNIQUE)
  - `storage_path` (TEXT)
  - `is_published` (BOOLEAN, NOT NULL, DEFAULT `false`)
  - `published_at` (TIMESTAMPTZ)
  - `downloaded_at` (TIMESTAMPTZ)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_payslips_emp` on (`employee_id`, `is_published`).

---

# Domain 11: Vendor & Manpower OS

### 11.1 `vendors`
- **Purpose**: Third-party staffing agencies and contractor vendor masters.
- **Domain**: `Vendor & Manpower OS`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `legal_name` (VARCHAR(200), NOT NULL)
  - `vendor_code` (VARCHAR(50), NOT NULL)
  - `pan_number` (VARCHAR(20))
  - `gstin` (VARCHAR(30))
  - `labour_license_number` (VARCHAR(50))
  - `contact_person` (VARCHAR(150))
  - `contact_email` (VARCHAR(255), NOT NULL)
  - `contact_phone` (VARCHAR(30))
  - `status` (VARCHAR(32), NOT NULL, DEFAULT `'ACTIVE'`, CHECK (`status IN ('ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'TERMINATED')`))
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_vendors_org_code` UNIQUE (`organization_id`, `vendor_code`).

### 11.2 `vendor_workers`
- **Purpose**: Contractual manpower personnel deployed by an external vendor agency.
- **Domain**: `Vendor & Manpower OS`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `vendor_id` (UUID, NOT NULL, REFERENCES `vendors(id)` ON DELETE CASCADE)
  - `worker_code` (VARCHAR(50), NOT NULL)
  - `full_name` (VARCHAR(150), NOT NULL)
  - `aadhaar_number` (VARCHAR(20))
  - `deployed_company_id` (UUID, REFERENCES `companies(id)`)
  - `deployed_department_id` (UUID, REFERENCES `departments(id)`)
  - `daily_wage_rate` (NUMERIC(10, 2), NOT NULL DEFAULT `0.00`)
  - `status` (VARCHAR(32), NOT NULL, DEFAULT `'ACTIVE'`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_vendor_workers_code` UNIQUE (`vendor_id`, `worker_code`), `idx_vendor_workers_org` on (`organization_id`).

### 11.3 `vendor_invoices`
- **Purpose**: Invoices submitted by staffing vendors for worker attendance and service fees.
- **Domain**: `Vendor & Manpower OS`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `vendor_id` (UUID, NOT NULL, REFERENCES `vendors(id)` ON DELETE CASCADE)
  - `invoice_number` (VARCHAR(100), NOT NULL)
  - `invoice_date` (DATE, NOT NULL)
  - `total_workers` (INTEGER, NOT NULL)
  - `total_amount` (NUMERIC(15, 2), NOT NULL)
  - `tax_amount` (NUMERIC(15, 2), NOT NULL DEFAULT `0.00`)
  - `status` (VARCHAR(32), NOT NULL, DEFAULT `'SUBMITTED'`, CHECK (`status IN ('SUBMITTED', 'UNDER_AUDIT', 'APPROVED', 'PAID', 'REJECTED')`))
  - `document_url` (TEXT)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_vendor_inv_org_num` UNIQUE (`organization_id`, `vendor_id`, `invoice_number`).

---

# Domain 12: Performance & Talent Management

### 12.1 `performance_cycles`
- **Purpose**: Annual or quarterly appraisal evaluation periods.
- **Domain**: `Performance & Talent Management`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `name` (VARCHAR(150), NOT NULL)
  - `start_date` (DATE, NOT NULL)
  - `end_date` (DATE, NOT NULL)
  - `status` (VARCHAR(32), NOT NULL, DEFAULT `'DRAFT'`, CHECK (`status IN ('DRAFT', 'ACTIVE', 'IN_REVIEW', 'COMPLETED', 'CLOSED')`))
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_perf_cycles_org` on (`organization_id`).

### 12.2 `performance_goals`
- **Purpose**: OKRs, KPIs, and key result areas mapped to an employee.
- **Domain**: `Performance & Talent Management`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `cycle_id` (UUID, NOT NULL, REFERENCES `performance_cycles(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, REFERENCES `employees(id)` ON DELETE CASCADE)
  - `title` (VARCHAR(255), NOT NULL)
  - `metric_type` (VARCHAR(32), NOT NULL, DEFAULT `'PERCENTAGE'`, CHECK (`metric_type IN ('PERCENTAGE', 'NUMERIC', 'MILESTONE', 'CURRENCY')`))
  - `target_value` (NUMERIC(15, 2), NOT NULL DEFAULT `100.00`)
  - `current_value` (NUMERIC(15, 2), NOT NULL DEFAULT `0.00`)
  - `weightage` (INTEGER NOT NULL DEFAULT `20`)
  - `status` (VARCHAR(32), NOT NULL, DEFAULT `'IN_PROGRESS'`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_perf_goals_emp` on (`employee_id`, `cycle_id`).

### 12.3 `performance_reviews`
- **Purpose**: Completed reviews containing self-appraisal, manager ratings, and 9-box talent matrix coordinates.
- **Domain**: `Performance & Talent Management`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `cycle_id` (UUID, NOT NULL, REFERENCES `performance_cycles(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, REFERENCES `employees(id)` ON DELETE CASCADE)
  - `reviewer_employee_id` (UUID, NOT NULL, REFERENCES `employees(id)`)
  - `self_rating` (NUMERIC(3, 2))
  - `manager_rating` (NUMERIC(3, 2))
  - `final_normalized_score` (NUMERIC(3, 2))
  - `talent_matrix_box` (VARCHAR(20))
  - `feedback_summary` (TEXT)
  - `status` (VARCHAR(32), NOT NULL, DEFAULT `'SUBMITTED'`, CHECK (`status IN ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'FINALIZED')`))
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_perf_review_cycle_emp` UNIQUE (`cycle_id`, `employee_id`, `reviewer_employee_id`).

---

# Domain 13: Learning & Training (LMS)

### 13.1 `lms_courses`
- **Purpose**: Internal training catalog and mandatory compliance courses.
- **Domain**: `Learning & Training (LMS)`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `title` (VARCHAR(200), NOT NULL)
  - `code` (VARCHAR(50), NOT NULL)
  - `category` (VARCHAR(100), NOT NULL)
  - `is_mandatory` (BOOLEAN, NOT NULL, DEFAULT `false`)
  - `duration_minutes` (INTEGER, NOT NULL DEFAULT `60`)
  - `is_active` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_lms_courses_org_code` UNIQUE (`organization_id`, `code`).

### 13.2 `lms_enrollments`
- **Purpose**: Tracks course completion, assessment scores, and certification issues.
- **Domain**: `Learning & Training (LMS)`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `course_id` (UUID, NOT NULL, REFERENCES `lms_courses(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, REFERENCES `employees(id)` ON DELETE CASCADE)
  - `progress_percentage` (INTEGER, NOT NULL DEFAULT `0`)
  - `score` (NUMERIC(5, 2))
  - `status` (VARCHAR(32), NOT NULL, DEFAULT `'ENROLLED'`, CHECK (`status IN ('ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'FAILED')`))
  - `certificate_url` (TEXT)
  - `completed_at` (TIMESTAMPTZ)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_lms_enroll` UNIQUE (`course_id`, `employee_id`).

---

# Domain 14: Documents & Digital File Storage

### 14.1 `document_types`
- **Purpose**: System catalog of required document classifications (Aadhaar, Degree, Offer Letter).
- **Domain**: `Documents & Digital File Storage`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `name` (VARCHAR(150), NOT NULL)
  - `code` (VARCHAR(50), NOT NULL)
  - `is_mandatory_for_onboarding` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `requires_verification` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_doc_types_org_code` UNIQUE (`organization_id`, `code`).

### 14.2 `employee_documents`
- **Purpose**: Secure metadata reference for uploaded employee files in Supabase Storage.
- **Domain**: `Documents & Digital File Storage`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, REFERENCES `employees(id)` ON DELETE CASCADE)
  - `document_type_id` (UUID, NOT NULL, REFERENCES `document_types(id)`)
  - `file_name` (VARCHAR(255), NOT NULL)
  - `storage_path` (TEXT, NOT NULL)
  - `file_size_bytes` (BIGINT, NOT NULL)
  - `mime_type` (VARCHAR(100), NOT NULL)
  - `verification_status` (VARCHAR(32), NOT NULL, DEFAULT `'PENDING'`, CHECK (`verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')`))
  - `verified_by` (UUID, REFERENCES `employees(id)`)
  - `verified_at` (TIMESTAMPTZ)
  - `rejection_reason` (TEXT)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_emp_docs_emp` on (`employee_id`, `document_type_id`).

---

# Domain 15: Employee Requests, Helpdesk & ER

### 15.1 `employee_requests`
- **Purpose**: Generic service desk catalog (Salary Certificate, Experience Letter, Address Update).
- **Domain**: `Employee Requests, Helpdesk & ER`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, REFERENCES `employees(id)` ON DELETE CASCADE)
  - `request_type` (VARCHAR(50), NOT NULL)
  - `subject` (VARCHAR(255), NOT NULL)
  - `description` (TEXT, NOT NULL)
  - `priority` (VARCHAR(20), NOT NULL, DEFAULT `'MEDIUM'`, CHECK (`priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')`))
  - `status` (VARCHAR(32), NOT NULL, DEFAULT `'OPEN'`, CHECK (`status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')`))
  - `assigned_to` (UUID, REFERENCES `employees(id)`)
  - `resolution_notes` (TEXT)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_emp_requests_org_status` on (`organization_id`, `status`), `idx_emp_requests_emp` on (`employee_id`).

### 15.2 `posh_and_grievance_cases` (Confidential Vault)
- **Purpose**: Highly confidential POSH committee and internal grievance inquiries.
- **Domain**: `Employee Requests, Helpdesk & ER`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `case_number` (VARCHAR(50), NOT NULL, UNIQUE)
  - `complainant_employee_id` (UUID, REFERENCES `employees(id)`)
  - `respondent_employee_id` (UUID, REFERENCES `employees(id)`)
  - `incident_date` (DATE, NOT NULL)
  - `status` (VARCHAR(32), NOT NULL, DEFAULT `'UNDER_INVESTIGATION'`)
  - `presiding_officer_id` (UUID, REFERENCES `employees(id)`)
  - `findings_summary` (TEXT)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_posh_org` on (`organization_id`).

---

# Domain 16: Assets & Inventory Management

### 16.1 `assets`
- **Purpose**: Hardware, laptops, phones, access keys, and vehicle inventory.
- **Domain**: `Assets & Inventory Management`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `company_id` (UUID, NOT NULL, REFERENCES `companies(id)`)
  - `asset_code` (VARCHAR(50), NOT NULL) — e.g. `'AST-LAP-042'`
  - `name` (VARCHAR(150), NOT NULL) — e.g. `'MacBook Pro M3 16-inch'`
  - `category` (VARCHAR(50), NOT NULL, CHECK (`category IN ('HARDWARE', 'SOFTWARE_LICENSE', 'FURNITURE', 'VEHICLE', 'KEY_CARD')`))
  - `serial_number` (VARCHAR(100))
  - `purchase_date` (DATE)
  - `purchase_cost` (NUMERIC(15, 2))
  - `status` (VARCHAR(32), NOT NULL, DEFAULT `'AVAILABLE'`, CHECK (`status IN ('AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'RETIRED')`))
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_assets_org_code` UNIQUE (`organization_id`, `asset_code`).

### 16.2 `asset_assignments`
- **Purpose**: Assignment and return audit history linking assets to employees.
- **Domain**: `Assets & Inventory Management`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `asset_id` (UUID, NOT NULL, REFERENCES `assets(id)` ON DELETE CASCADE)
  - `employee_id` (UUID, NOT NULL, REFERENCES `employees(id)` ON DELETE CASCADE)
  - `assigned_date` (DATE, NOT NULL)
  - `returned_date` (DATE)
  - `condition_on_assignment` (TEXT)
  - `condition_on_return` (TEXT)
  - `status` (VARCHAR(32), NOT NULL, DEFAULT `'ACTIVE'`, CHECK (`status IN ('ACTIVE', 'RETURNED')`))
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_asset_assign_emp` on (`employee_id`, `asset_id`).

---

# Domain 17: Talent Acquisition & ATS

### 17.1 `job_openings`
- **Purpose**: Career requisitions and published vacancies.
- **Domain**: `Talent Acquisition & ATS`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `company_id` (UUID, NOT NULL, REFERENCES `companies(id)`)
  - `department_id` (UUID, NOT NULL, REFERENCES `departments(id)`)
  - `title` (VARCHAR(200), NOT NULL) — e.g. `'Staff React Engineer'`
  - `requisition_code` (VARCHAR(50), NOT NULL) — e.g. `'REQ-2026-08'`
  - `vacancies_count` (INTEGER NOT NULL DEFAULT `1`)
  - `experience_years_required` (NUMERIC(3, 1))
  - `job_description` (TEXT, NOT NULL)
  - `status` (VARCHAR(32), NOT NULL, DEFAULT `'OPEN'`, CHECK (`status IN ('DRAFT', 'OPEN', 'ON_HOLD', 'CLOSED')`))
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `uq_job_openings_org_code` UNIQUE (`organization_id`, `requisition_code`).

### 17.2 `job_applicants`
- **Purpose**: Candidate pipeline, interview stages, evaluation scores, and offer letter generation.
- **Domain**: `Talent Acquisition & ATS`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `job_opening_id` (UUID, NOT NULL, REFERENCES `job_openings(id)` ON DELETE CASCADE)
  - `candidate_name` (VARCHAR(150), NOT NULL)
  - `candidate_email` (VARCHAR(255), NOT NULL)
  - `candidate_phone` (VARCHAR(30))
  - `resume_url` (TEXT)
  - `stage` (VARCHAR(32), NOT NULL, DEFAULT `'APPLIED'`, CHECK (`stage IN ('APPLIED', 'SCREENING', 'INTERVIEW_SCHEDULED', 'OFFER_EXTENDED', 'HIRED', 'REJECTED')`))
  - `rating` (INTEGER, CHECK (`rating BETWEEN 1 AND 5`))
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
  - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_applicants_job_stage` on (`job_opening_id`, `stage`).

---

# Domain 18: Audit, Webhooks & Notifications Mesh

### 18.1 `audit_logs` (Immutable Forensics)
- **Purpose**: Append-only security and operational audit trail tracking every mutation.
- **Domain**: `Audit, Webhooks & Notifications Mesh`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `user_id` (UUID, REFERENCES `user_profiles(id)`)
  - `entity_type` (VARCHAR(100), NOT NULL)
  - `entity_id` (UUID, NOT NULL)
  - `action` (VARCHAR(50), NOT NULL)
  - `old_values` (JSONB)
  - `new_values` (JSONB)
  - `ip_address` (VARCHAR(50))
  - `user_agent` (TEXT)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_audit_org_created` on (`organization_id`, `created_at`), `idx_audit_entity` on (`entity_type`, `entity_id`).

### 18.2 `notification_events`
- **Purpose**: Multi-channel outbox dispatching transactional emails (Resend), SMS, and web push notifications.
- **Domain**: `Audit, Webhooks & Notifications Mesh`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `recipient_user_id` (UUID, REFERENCES `user_profiles(id)`)
  - `channel` (VARCHAR(20), NOT NULL, DEFAULT `'IN_APP'`, CHECK (`channel IN ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP', 'PUSH')`))
  - `title` (VARCHAR(255), NOT NULL)
  - `message` (TEXT, NOT NULL)
  - `action_url` (TEXT)
  - `is_read` (BOOLEAN, NOT NULL, DEFAULT `false`)
  - `is_sent` (BOOLEAN, NOT NULL, DEFAULT `false`)
  - `sent_at` (TIMESTAMPTZ)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_notifs_user_unread` on (`recipient_user_id`, `is_read`), `idx_notifs_org_sent` on (`organization_id`, `is_sent`).

### 18.3 `webhook_endpoints`
- **Purpose**: Webhook endpoints registered to receive outbound HTTP event triggers.
- **Domain**: `Audit, Webhooks & Notifications Mesh`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `target_url` (TEXT, NOT NULL)
  - `secret_key` (VARCHAR(255), NOT NULL)
  - `subscribed_events` (TEXT[], NOT NULL) — e.g. `ARRAY['employee.created', 'payroll.disbursed']`
  - `is_active` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`)
- **Constraints & Indexes**: `idx_webhooks_org` on (`organization_id`).

### 18.4 `webhook_deliveries`
- **Purpose**: Delivery attempt and response logs for webhook dispatching.
- **Domain**: `Audit, Webhooks & Notifications Mesh`
- **Ownership**: Direct Organization Ownership (`organization_id`)
- **Columns**:
  - `id` (UUID, NOT NULL, PK, DEFAULT `gen_random_uuid()`)
  - `organization_id` (UUID, NOT NULL, REFERENCES `organizations(id)` ON DELETE CASCADE)
  - `webhook_endpoint_id` (UUID, NOT NULL, REFERENCES `webhook_endpoints(id)` ON DELETE CASCADE)
  - `event_name` (VARCHAR(100), NOT NULL)
  - `payload` (JSONB, NOT NULL)
  - `response_status_code` (INTEGER)
  - `response_body` (TEXT)
  - `delivered_at` (TIMESTAMPTZ NOT NULL DEFAULT `now()`)
- **Constraints & Indexes**: `idx_webhook_deliv_endpoint` on (`webhook_endpoint_id`, `delivered_at`).
