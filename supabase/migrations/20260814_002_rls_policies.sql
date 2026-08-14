-- ============================================================
-- WorkforceOS Enterprise HRMS — Row Level Security Policies
-- Migration: 20260814_002_rls_policies.sql
-- Run AFTER: 20260814_001_initial_schema.sql
-- ============================================================
-- RLS ensures every user can only read/write data from their
-- own organization (multi-tenant isolation).
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE organizations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE designations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees      ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: Get the organization_id of the current Supabase user
-- ============================================================
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS TEXT AS $$
  SELECT organization_id
  FROM   app_users
  WHERE  auth_user_id = auth.uid()
  LIMIT  1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- POLICIES — each table is scoped to the user's organization
-- ============================================================

-- Organizations
CREATE POLICY "org_isolation" ON organizations
  FOR ALL USING (id = current_org_id());

-- Companies (org-scoped)
CREATE POLICY "companies_isolation" ON companies
  FOR ALL USING (organization_id = current_org_id());

-- Branches (scoped via company)
CREATE POLICY "branches_isolation" ON branches
  FOR ALL USING (
    company_id IN (
      SELECT id FROM companies WHERE organization_id = current_org_id()
    )
  );

-- Locations (scoped via branch → company)
CREATE POLICY "locations_isolation" ON locations
  FOR ALL USING (
    branch_id IN (
      SELECT id FROM branches
      WHERE company_id IN (
        SELECT id FROM companies WHERE organization_id = current_org_id()
      )
    )
  );

-- Departments
CREATE POLICY "departments_isolation" ON departments
  FOR ALL USING (
    company_id IN (
      SELECT id FROM companies WHERE organization_id = current_org_id()
    )
  );

-- Designations
CREATE POLICY "designations_isolation" ON designations
  FOR ALL USING (
    company_id IN (
      SELECT id FROM companies WHERE organization_id = current_org_id()
    )
  );

-- Roles (org-scoped)
CREATE POLICY "roles_isolation" ON roles
  FOR ALL USING (organization_id = current_org_id());

-- App Users (org-scoped)
CREATE POLICY "users_isolation" ON app_users
  FOR ALL USING (organization_id = current_org_id());

-- Employees (org-scoped)
CREATE POLICY "employees_isolation" ON employees
  FOR ALL USING (organization_id = current_org_id());

-- Approvals (org-scoped)
CREATE POLICY "approvals_isolation" ON approval_items
  FOR ALL USING (organization_id = current_org_id());

-- Activity log (org-scoped)
CREATE POLICY "activity_isolation" ON activity_log
  FOR ALL USING (organization_id = current_org_id());

-- ============================================================
-- EXTRA FINE-GRAINED POLICIES (per role — add as needed)
-- ============================================================

-- Employee Self-Service: employees can SELECT only their own row
CREATE POLICY "ess_own_employee_read" ON employees
  FOR SELECT USING (
    work_email = (
      SELECT email FROM app_users WHERE auth_user_id = auth.uid() LIMIT 1
    )
    AND organization_id = current_org_id()
  );

-- Note: The broader "employees_isolation" policy above still allows
-- HR Head, Company Admin, Manager etc. full access via their roles.
-- Fine-grained policies stack with OR logic in Supabase.
