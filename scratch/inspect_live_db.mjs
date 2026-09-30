import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const s = createClient(URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  const { data: users } = await s.auth.admin.listUsers();
  const { data: profs } = await s.from('user_profiles').select('*');
  const { data: emps } = await s.from('employees').select('*');
  const { data: orgs } = await s.from('organizations').select('*');
  const { data: comps } = await s.from('companies').select('*');
  const { data: locs } = await s.from('work_locations').select('*');
  const { data: locAssign } = await s.from('employee_work_location_assignments').select('*');
  const { data: punches } = await s.from('attendance_punches').select('*').order('punch_time', { ascending: false }).limit(20);
  const { data: daily } = await s.from('attendance_daily').select('*').order('attendance_date', { ascending: false }).limit(20);
  const { data: dts } = await s.from('document_types').select('*');
  const { data: empDocs } = await s.from('employee_documents').select('*');
  const { data: docsTbl } = await s.from('documents').select('*');
  const { data: docReqs } = await s.from('document_requests').select('*');
  const { data: docReqsLegacy } = await s.from('document_requirements').select('*');
  const { data: notifs } = await s.from('notification_events').select('*').order('created_at', { ascending: false }).limit(20);
  const { data: buckets } = await s.storage.listBuckets();

  const out = {
    authUsers: users?.users?.map(u => ({ id: u.id, email: u.email, confirmed: !!u.email_confirmed_at, meta: u.user_metadata })),
    userProfiles: profs,
    employees: emps,
    organizations: orgs,
    companies: comps,
    workLocations: locs,
    locationAssignments: locAssign,
    recentPunches: punches,
    recentDaily: daily,
    documentTypes: dts,
    employeeDocuments: empDocs,
    documentsTable: docsTbl,
    documentRequests: docReqs,
    documentRequirementsLegacy: docReqsLegacy,
    notificationEvents: notifs,
    buckets: buckets?.map(b => ({ id: b.id, name: b.name, public: b.public })),
  };

  fs.writeFileSync('scratch/db_dump.json', JSON.stringify(out, null, 2));
  console.log('Done! Saved to scratch/db_dump.json');
}

main().catch(console.error);
