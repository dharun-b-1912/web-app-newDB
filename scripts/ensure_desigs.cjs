const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function ensureDesigs() {
  const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
  const companyId = 'c0bbfb28-1500-4ebb-aba8-453b3681f342';

  const newDesigs = [
    { title: 'FORKLIFT OPERATOR', code: 'DSG-FORK' },
    { title: 'OPERATIONS', code: 'DSG-OPERA' }
  ];

  for (const nd of newDesigs) {
    const { data: existing } = await supabase
      .from('designations')
      .select('id')
      .eq('organization_id', orgId)
      .eq('title', nd.title)
      .limit(1);

    if (!existing || existing.length === 0) {
      const { data, error } = await supabase
        .from('designations')
        .insert({
          organization_id: orgId,
          company_id: companyId,
          title: nd.title,
          code: nd.code,
          is_active: true
        })
        .select();
      console.log('Inserted designation:', nd.title, data, error);
    } else {
      console.log('Designation already exists:', nd.title);
    }
  }
}

ensureDesigs();

