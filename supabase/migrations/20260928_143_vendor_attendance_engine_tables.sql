-- ===========================================================================
-- Migration 143: Vendor Attendance Engine Tables (Production & Idempotent)
-- Company → Vendor Attendance, MR Report & OT Reconciliation
-- Based on JOY SEP IN & OUT.xlsx reference workbook structure
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. TABLE: vendor_attendance_records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendor_attendance_records (
  attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all engine columns exist (idempotent addition)
ALTER TABLE vendor_attendance_records
  ADD COLUMN IF NOT EXISTS attendance_id       UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS employee_id         TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS employee_code       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS employee_name       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS vendor_id           TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_id          TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS site_id             TEXT,
  ADD COLUMN IF NOT EXISTS site_name           TEXT,
  ADD COLUMN IF NOT EXISTS department_id       TEXT,
  ADD COLUMN IF NOT EXISTS department          TEXT,
  ADD COLUMN IF NOT EXISTS category            TEXT,
  ADD COLUMN IF NOT EXISTS designation         TEXT,
  ADD COLUMN IF NOT EXISTS attendance_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS shift_id            TEXT,
  ADD COLUMN IF NOT EXISTS shift_name          TEXT,
  -- S1 → first_half_status (1st Half), S2 → second_half_status (2nd Half)
  -- Values: P, A, WO, OD, H, WP, PM, CL, PL, SL, LOP, WFH, MP
  ADD COLUMN IF NOT EXISTS first_half_status   TEXT NOT NULL DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS second_half_status  TEXT NOT NULL DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS check_in            TEXT,
  ADD COLUMN IF NOT EXISTS check_out           TEXT,
  ADD COLUMN IF NOT EXISTS late_minutes        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS early_out_minutes   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS worked_hours        NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ot_hours            NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attendance_source   TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS attendance_status   TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS submitted_by        TEXT,
  ADD COLUMN IF NOT EXISTS verified_by         TEXT,
  ADD COLUMN IF NOT EXISTS approved_by         TEXT;

-- Safety: if table previously existed from migration 138, ensure legacy NOT NULL worker_id doesn't block inserts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vendor_attendance_records' 
      AND column_name = 'worker_id' 
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE vendor_attendance_records ALTER COLUMN worker_id DROP NOT NULL;
  END IF;

  -- Backfill attendance_id from legacy id column if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_attendance_records' AND column_name = 'id'
  ) THEN
    UPDATE vendor_attendance_records SET attendance_id = id WHERE attendance_id IS NULL;
  END IF;
END $$;

-- Unique constraint: reconciliation key (company + vendor + employee + date)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_vendor_attendance_record'
  ) THEN
    BEGIN
      ALTER TABLE vendor_attendance_records
        ADD CONSTRAINT uq_vendor_attendance_record
        UNIQUE (company_id, vendor_id, employee_id, attendance_date);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'uq_vendor_attendance_record could not be added: %', SQLERRM;
    END;
  END IF;
END $$;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_var_vendor_date
  ON vendor_attendance_records (vendor_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_var_company_vendor
  ON vendor_attendance_records (company_id, vendor_id);

CREATE INDEX IF NOT EXISTS idx_var_employee_date
  ON vendor_attendance_records (employee_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_var_site_date
  ON vendor_attendance_records (site_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_var_status
  ON vendor_attendance_records (attendance_status);

-- ---------------------------------------------------------------------------
-- 2. TABLE: vendor_attendance_audit_log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendor_attendance_audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vendor_attendance_audit_log
  ADD COLUMN IF NOT EXISTS action       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS user_id      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS user_name    TEXT,
  ADD COLUMN IF NOT EXISTS user_role    TEXT,
  ADD COLUMN IF NOT EXISTS record_type  TEXT,
  ADD COLUMN IF NOT EXISTS record_id    TEXT,
  ADD COLUMN IF NOT EXISTS old_value    JSONB,
  ADD COLUMN IF NOT EXISTS new_value    JSONB,
  ADD COLUMN IF NOT EXISTS reason       TEXT,
  ADD COLUMN IF NOT EXISTS ip_address   TEXT,
  ADD COLUMN IF NOT EXISTS session_id   TEXT;

CREATE INDEX IF NOT EXISTS idx_vaal_record
  ON vendor_attendance_audit_log (record_type, record_id);

CREATE INDEX IF NOT EXISTS idx_vaal_timestamp
  ON vendor_attendance_audit_log (timestamp DESC);

-- ---------------------------------------------------------------------------
-- 3. UPDATED_AT TRIGGER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_vendor_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vendor_attendance_updated_at ON vendor_attendance_records;
CREATE TRIGGER trg_vendor_attendance_updated_at
  BEFORE UPDATE ON vendor_attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_vendor_attendance_updated_at();

-- ---------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (Zero Type-Mismatch, Explicit ::TEXT Casting)
-- ---------------------------------------------------------------------------
ALTER TABLE vendor_attendance_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_attendance_audit_log  ENABLE ROW LEVEL SECURITY;

-- Drop previous policies cleanly
DROP POLICY IF EXISTS "company_hr_rw_attendance"           ON vendor_attendance_records;
DROP POLICY IF EXISTS "vendor_admin_rw_own_attendance"     ON vendor_attendance_records;
DROP POLICY IF EXISTS "audit_log_insert"                   ON vendor_attendance_audit_log;
DROP POLICY IF EXISTS "audit_log_read_company"             ON vendor_attendance_audit_log;

-- Company HR: full access to records belonging to their organization
CREATE POLICY "company_hr_rw_attendance" ON vendor_attendance_records
  FOR ALL
  USING (
    company_id::TEXT IN (
      SELECT c.id::TEXT
      FROM companies c
      WHERE c.organization_id::TEXT = current_org_id()::TEXT
    )
    OR
    vendor_id::TEXT IN (
      SELECT v.id::TEXT
      FROM vendors v
      WHERE v.organization_id::TEXT = current_org_id()::TEXT
    )
  );

-- Vendor users: access their own records
CREATE POLICY "vendor_admin_rw_own_attendance" ON vendor_attendance_records
  FOR ALL
  USING (
    ((auth.jwt() ->> 'vendor_id') IS NOT NULL AND vendor_id::TEXT = (auth.jwt() ->> 'vendor_id')::TEXT)
    OR
    vendor_id::TEXT IN (
      SELECT v.id::TEXT
      FROM vendors v
      WHERE v.organization_id::TEXT = current_org_id()::TEXT
    )
  );

-- Audit log: insertion permitted, reads permitted
CREATE POLICY "audit_log_insert" ON vendor_attendance_audit_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "audit_log_read_company" ON vendor_attendance_audit_log
  FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- 5. REALTIME PUBLICATION
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
        AND tablename = 'vendor_attendance_records'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE vendor_attendance_records;
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. COMMENTS
-- ---------------------------------------------------------------------------
COMMENT ON TABLE vendor_attendance_records IS
  'Company→Vendor daily attendance. '
  'first_half_status = 1st Half (was S1), second_half_status = 2nd Half (was S2). '
  'Reconciliation key: company_id + vendor_id + employee_id + attendance_date. '
  'OT, MR Report and OT Matrix are computed by the application layer.';

COMMENT ON TABLE vendor_attendance_audit_log IS
  'Immutable audit trail for all vendor attendance workflow actions '
  '(submit, verify, approve, return, correct).';
