-- ============================================================================
-- Migration: 20261117_employee_face_attendance_toggle.sql
-- Description: Adds per-employee Face Attendance exemption & toggle.
--              Allows HR to enable/disable Face Attendance for individual
--              employees (e.g. broken camera, field exemptions, hardware issues).
-- ============================================================================

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS face_attendance_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS face_attendance_exemption_reason TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_employees_face_attend 
  ON public.employees(organization_id, face_attendance_enabled);

-- Update RLS policies on employees to ensure authenticated users and service_role can read/update these fields appropriately
COMMENT ON COLUMN public.employees.face_attendance_enabled IS 'Toggle whether FaceAttend is required for this specific employee. When false, mobile app hides FaceAttend menu and permits regular one-tap location check-in without camera.';
COMMENT ON COLUMN public.employees.face_attendance_exemption_reason IS 'Reason for FaceAttend exemption (e.g. broken camera, hardware defect, exempted by HR).';

