SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relnamespace = 'storage'::regnamespace;
