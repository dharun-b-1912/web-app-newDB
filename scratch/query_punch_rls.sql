SELECT tablename, policyname, cmd, roles, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('attendance_punches', 'attendance_daily') 
ORDER BY tablename, policyname;

SELECT proname, prosecdef, proconfig 
FROM pg_proc 
WHERE proname = 'fn_record_attendance_punch';
