SELECT table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('employees', 'employee_profiles', 'work_locations', 'attendance_daily', 'attendance_punches', 'attendance_regularizations', 'employee_shift_assignments', 'employee_work_location_assignments')
ORDER BY table_name, ordinal_position;
