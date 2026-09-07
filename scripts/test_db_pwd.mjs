import pg from 'pg';
const { Client } = pg;

const PROJECT_ID = 'ysiajemrqakfngasehhi';
const HOST = 'aws-0-ap-southeast-2.pooler.supabase.com';

const passwords = [
  'Dh@run@1912',
  'joypeoplehr',
  'JoyPeopleHR@2026',
  'JoyEnterprise@2026!',
  'JoyHrHead@2026',
  'postgres',
  'dharun1912',
  'Dharun@1912'
];

async function testPasswords() {
  for (const pwd of passwords) {
    const client = new Client({
      host: HOST,
      port: 6543,
      database: 'postgres',
      user: `postgres.${PROJECT_ID}`,
      password: pwd,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000
    });

    try {
      await client.connect();
      console.log(`\n🎉 SUCCESS! Password is: ${pwd}`);
      await client.end();
      return pwd;
    } catch (err) {
      console.log(`Failed for "${pwd}": ${err.message}`);
      try { await client.end(); } catch (e) {}
    }
  }
}

testPasswords();
