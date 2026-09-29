SELECT tablename, policyname, cmd, roles, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('attendance_punches', 'attendance_daily') 
ORDER BY tablename, policyname;
