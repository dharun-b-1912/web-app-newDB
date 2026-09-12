import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function seedPeriods() {
  await supabase.auth.signInWithPassword({
    email: 'marimuthu@joycorporatesolutions.com',
    password: 'joypeoplehr',
  });

  const orgId = '0c621892-e938-4707-9957-13534ea32c19';
  const companyId = '2030277f-a6a1-427f-beaf-4fc677a3bae2';

  const periodsToEnsure = [
    {
      period_name: 'July 2026',
      start_date: '2026-07-01',
      end_date: '2026-07-31',
      pay_date: '2026-07-31',
      month: 7,
      year: 2026,
      status: 'CALCULATED',
    },
    {
      period_name: 'August 2026',
      start_date: '2026-08-01',
      end_date: '2026-08-31',
      pay_date: '2026-08-31',
      month: 8,
      year: 2026,
      status: 'CALCULATED',
    },
    {
      period_name: 'September 2026',
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      pay_date: '2026-09-30',
      month: 9,
      year: 2026,
      status: 'OPEN',
    },
    {
      period_name: 'October 2026',
      start_date: '2026-10-01',
      end_date: '2026-10-31',
      pay_date: '2026-10-31',
      month: 10,
      year: 2026,
      status: 'OPEN',
    },
  ];

  for (const p of periodsToEnsure) {
    const { data: existing } = await supabase
      .from('payroll_periods')
      .select('id')
      .eq('period_name', p.period_name)
      .maybeSingle();

    if (!existing) {
      const { data: ins, error: err } = await supabase
        .from('payroll_periods')
        .insert({
          organization_id: orgId,
          tenant_id: orgId,
          company_id: companyId,
          period_name: p.period_name,
          start_date: p.start_date,
          end_date: p.end_date,
          pay_date: p.pay_date,
          month: p.month,
          year: p.year,
          status: p.status,
          policy_version: 'v1.0',
          is_locked: false,
        })
        .select();

      console.log('Inserted period:', p.period_name, err || ins);
    } else {
      console.log('Period already exists:', p.period_name);
    }
  }
}

seedPeriods();
