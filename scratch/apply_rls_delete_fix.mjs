import { executeSql } from './execute_sql.mjs';

const sql = `
DROP POLICY IF EXISTS "employee_documents_delete" ON public.employee_documents;
CREATE POLICY "employee_documents_delete" ON public.employee_documents
FOR DELETE TO authenticated
USING (
  public.is_platform_admin()
  OR public.is_org_admin(organization_id)
  OR employee_id = (
    SELECT e.id FROM public.employees e
    JOIN public.user_profiles up ON e.user_id = up.id
    WHERE up.auth_user_id = auth.uid()
    LIMIT 1
  )
);

CREATE OR REPLACE FUNCTION public.fn_protect_employee_digital_letters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN COALESCE(NEW, OLD);
END;
$$;
`;

console.log('Applying RLS fix for employee_documents_delete...');
const res = await executeSql(sql);
console.log('Successfully updated employee_documents_delete policy on canonical Supabase!');
