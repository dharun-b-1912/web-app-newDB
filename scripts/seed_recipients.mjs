import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co',
  SERVICE_KEY
);

async function seed() {
  const orgId = '0c621892-e938-4707-9957-13534ea32c19';
  
  const recipients = [
    {
      organization_id: orgId,
      name: 'Executive Leadership (Director)',
      email: 'thirumalai@joyglobalcorp.com',
      phone: '919840209900',
      designation: 'Managing Director',
      role_type: 'MANAGEMENT',
      permitted_report_types: ['MORNING_CHECKIN', 'EVENING_FINAL', 'BIOMETRIC_AUDIT', 'DEPARTMENT_SUMMARY'],
      delivery_channels: ['EMAIL', 'WHATSAPP'],
      scheduled_morning: true,
      scheduled_evening: true,
      allow_bot_self_service: true,
      workforce_scope: 'ORGANIZATION',
      is_verified: true,
      is_active: true,
    },
    {
      organization_id: orgId,
      employee_id: '55f486f8-e3aa-4133-9e85-dfc519ed2825',
      name: 'Praveen B',
      email: 'praveen.b@joyglobalcorp.com',
      phone: '917825906580',
      designation: 'Manager',
      role_type: 'SUPERVISOR',
      permitted_report_types: ['MORNING_CHECKIN', 'EVENING_FINAL'],
      delivery_channels: ['EMAIL', 'WHATSAPP'],
      scheduled_morning: true,
      scheduled_evening: true,
      allow_bot_self_service: true,
      workforce_scope: 'ORGANIZATION',
      is_verified: true,
      is_active: true,
    }
  ];

  for (const r of recipients) {
    const { data, error } = await supabase.from('mis_report_recipients').upsert(r, { onConflict: 'organization_id,phone' });
    if (error) console.error('Error seeding recipient:', r.name, error);
    else console.log('Successfully seeded:', r.name);
  }

  const { data: all } = await supabase.from('mis_report_recipients').select('*');
  console.log('Total verified recipients in DB:', all?.length);
}

seed();
