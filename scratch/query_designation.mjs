import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://ysiajemrqakfngasehhi.supabase.co',
  'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj'
);

async function check() {
  const { data } = await sb
    .from('designations')
    .select('*')
    .eq('id', 'fd2762cd-b1bb-402e-a7ee-81a80aa0eab7');

  console.log('Designation:', data);

  const { data: dept } = await sb
    .from('departments')
    .select('*')
    .eq('id', '0cdef8b4-014c-4487-895c-cf264824a0da');

  console.log('Department:', dept);

  const { data: comp } = await sb
    .from('companies')
    .select('*')
    .eq('id', '2030277f-a6a1-427f-beaf-4fc677a3bae2');

  console.log('Company:', comp);
}

check();
