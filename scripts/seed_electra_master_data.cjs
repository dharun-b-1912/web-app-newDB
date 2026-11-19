require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedElectraMasterData() {
  const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
  const compId = 'c0bbfb28-1500-4ebb-aba8-453b3681f342';

  console.log('Seeding Master Data for Electra EV (Org:', orgId, 'Comp:', compId, ')...');

  // 1. Branches / Locations
  const branchName = 'Electra EV Plant';
  const { data: existingBranches } = await supabase
    .from('branches')
    .select('id, name')
    .eq('organization_id', orgId);

  let branchId = existingBranches?.[0]?.id;
  if (!branchId) {
    const { data: newBranch, error: brErr } = await supabase
      .from('branches')
      .insert({
        organization_id: orgId,
        company_id: compId,
        name: branchName,
        code: 'EEV-PLANT',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        country: 'India',
        is_headquarters: true,
        is_active: true
      })
      .select()
      .single();

    if (brErr) {
      console.error('Error creating branch:', brErr);
    } else {
      branchId = newBranch.id;
      console.log('Created Branch:', newBranch.name, newBranch.id);
    }
  } else {
    console.log('Existing Branch found:', branchId);
  }

  // 2. Departments
  const departments = ['B-PACK', 'BESS', 'QC', 'E-BOX', 'MPL', 'Operations'];
  const deptMap = {};

  for (const deptName of departments) {
    const { data: existingDept } = await supabase
      .from('departments')
      .select('id, name')
      .eq('organization_id', orgId)
      .ilike('name', deptName)
      .maybeSingle();

    if (existingDept) {
      deptMap[deptName] = existingDept.id;
      console.log('Found existing department:', deptName, existingDept.id);
    } else {
      const deptCode = deptName.replace(/[^A-Z0-9]/gi, '').slice(0, 5).toUpperCase() || 'DEPT';
      const { data: newDept, error: deptErr } = await supabase
        .from('departments')
        .insert({
          organization_id: orgId,
          company_id: compId,
          name: deptName,
          code: deptCode,
          is_active: true
        })
        .select()
        .single();

      if (deptErr) {
        console.error(`Error creating department "${deptName}":`, deptErr);
      } else {
        deptMap[deptName] = newDept.id;
        console.log('Created department:', deptName, newDept.id);
      }
    }
  }

  // 3. Designations
  const designations = [
    'PRODUCTION ASSOCIATE',
    'TRAINEE-PRODUCTION ASSOCIATE',
    'INTERN-PRODUCTION ASSOCIATE',
    'MAINTENANCE',
    'QUALITY CONTROL',
    'EHS',
    'MPL'
  ];
  const desigMap = {};

  for (const desigTitle of designations) {
    const { data: existingDesig } = await supabase
      .from('designations')
      .select('id, title')
      .eq('organization_id', orgId)
      .ilike('title', desigTitle)
      .maybeSingle();

    if (existingDesig) {
      desigMap[desigTitle] = existingDesig.id;
      console.log('Found existing designation:', desigTitle, existingDesig.id);
    } else {
      const desigCode = 'DSG-' + desigTitle.replace(/[^A-Z0-9]/gi, '').slice(0, 5).toUpperCase();
      const { data: newDesig, error: desigErr } = await supabase
        .from('designations')
        .insert({
          organization_id: orgId,
          company_id: compId,
          title: desigTitle,
          code: desigCode,
          is_active: true
        })
        .select()
        .single();

      if (desigErr) {
        console.error(`Error creating designation "${desigTitle}":`, desigErr);
      } else {
        desigMap[desigTitle] = newDesig.id;
        console.log('Created designation:', desigTitle, newDesig.id);
      }
    }
  }

  // 4. Vendor Organization (Joy Manpower Services)
  // Let's check vendors table or vendor_companies
  try {
    const { data: existingVendors } = await supabase
      .from('vendors')
      .select('id, name')
      .eq('organization_id', orgId);
    console.log('Vendors in org:', existingVendors);
  } catch (e) {
    console.warn('Vendors table check:', e.message);
  }

  console.log('\nMaster Data Seeding Completed successfully!');
  console.log('Summary of Seeded Departments:', Object.keys(deptMap).length);
  console.log('Summary of Seeded Designations:', Object.keys(desigMap).length);
}

seedElectraMasterData();

