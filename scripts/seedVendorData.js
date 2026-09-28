import { createClient } from '@supabase/supabase-js';

const client = createClient('https://ysiajemrqakfngasehhi.supabase.co', 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj');

async function seed() {
  const { data: vendor } = await client
    .from('vendors')
    .select('id, vendor_code, organization_id')
    .eq('vendor_code', 'VEN-000001')
    .single();

  console.log('Vendor VEN-000001:', vendor);
  if (!vendor) return;

  // Clean old if any
  await client.from('vendor_workers').delete().eq('vendor_id', vendor.id);

  // Insert workers
  const workers = [
    {
      vendor_id: vendor.id,
      organization_id: vendor.organization_id || '0c621892-e938-4707-9957-13534ea32c19',
      worker_code: 'VEN01-EMP01',
      first_name: 'Murugan',
      last_name: 'P',
      full_name: 'Murugan P',
      phone: '+91 98401 23401',
      designation: 'Security Guard',
      department: 'Physical Security',
      skill_level: 'Skilled',
      status: 'ACTIVE',
      compliance_status: 'COMPLIANT',
      joining_date: '2026-04-01',
      daily_wage_rate: 650,
      monthly_base_salary: 16900,
      overtime_eligible: true
    },
    {
      vendor_id: vendor.id,
      organization_id: vendor.organization_id || '0c621892-e938-4707-9957-13534ea32c19',
      worker_code: 'VEN01-EMP02',
      first_name: 'Anand',
      last_name: 'Kumar',
      full_name: 'Anand Kumar',
      phone: '+91 98401 23402',
      designation: 'Security Guard',
      department: 'Physical Security',
      skill_level: 'Skilled',
      status: 'ACTIVE',
      compliance_status: 'COMPLIANT',
      joining_date: '2026-04-01',
      daily_wage_rate: 650,
      monthly_base_salary: 16900,
      overtime_eligible: true
    },
    {
      vendor_id: vendor.id,
      organization_id: vendor.organization_id || '0c621892-e938-4707-9957-13534ea32c19',
      worker_code: 'VEN01-EMP03',
      first_name: 'Sangeetha',
      last_name: 'M',
      full_name: 'Sangeetha M',
      phone: '+91 98401 23403',
      designation: 'Housekeeping Lead',
      department: 'Facility Management',
      skill_level: 'Semi-Skilled',
      status: 'ACTIVE',
      compliance_status: 'COMPLIANT',
      joining_date: '2026-04-01',
      daily_wage_rate: 650,
      monthly_base_salary: 16900,
      overtime_eligible: true
    },
    {
      vendor_id: vendor.id,
      organization_id: vendor.organization_id || '0c621892-e938-4707-9957-13534ea32c19',
      worker_code: 'VEN01-EMP04',
      first_name: 'Vignesh',
      last_name: 'K',
      full_name: 'Vignesh K',
      phone: '+91 98401 23404',
      designation: 'Facility Assistant',
      department: 'Facility Management',
      skill_level: 'Unskilled',
      status: 'ACTIVE',
      compliance_status: 'COMPLIANT',
      joining_date: '2026-04-01',
      daily_wage_rate: 550,
      monthly_base_salary: 14300,
      overtime_eligible: true
    },
    {
      vendor_id: vendor.id,
      organization_id: vendor.organization_id || '0c621892-e938-4707-9957-13534ea32c19',
      worker_code: 'VEN01-EMP05',
      first_name: 'Rajesh',
      last_name: 'S',
      full_name: 'Rajesh S',
      phone: '+91 98401 23405',
      designation: 'Licensed Electrician',
      department: 'Technical Maintenance',
      skill_level: 'Highly Skilled',
      status: 'ACTIVE',
      compliance_status: 'COMPLIANT',
      joining_date: '2026-04-01',
      daily_wage_rate: 800,
      monthly_base_salary: 20800,
      overtime_eligible: true
    },
    {
      vendor_id: vendor.id,
      organization_id: vendor.organization_id || '0c621892-e938-4707-9957-13534ea32c19',
      worker_code: 'VEN01-EMP06',
      first_name: 'Priya',
      last_name: 'R',
      full_name: 'Priya R',
      phone: '+91 98401 23406',
      designation: 'Facility Associate',
      department: 'Facility Management',
      skill_level: 'Unskilled',
      status: 'ACTIVE',
      compliance_status: 'COMPLIANT',
      joining_date: '2026-04-01',
      daily_wage_rate: 550,
      monthly_base_salary: 14300,
      overtime_eligible: true
    }
  ];

  const { data: inserted, error: iErr } = await client
    .from('vendor_workers')
    .insert(workers)
    .select();

  console.log('Inserted workers count:', inserted ? inserted.length : 0, iErr ? iErr.message : 'SUCCESS');
}
seed();
