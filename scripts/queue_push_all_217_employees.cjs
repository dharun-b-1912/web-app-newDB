const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(envConfig.VITE_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY);

const UPSTASH_URL = envConfig.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = envConfig.UPSTASH_REDIS_REST_TOKEN;
const SN = 'JNP2263200782';

async function queueEmployeesToMB160() {
  const orgId = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
  const { data: emps, error } = await sb.from('employees')
    .select('id, employee_code, first_name, last_name, display_name, employment_status')
    .eq('organization_id', orgId)
    .eq('employment_status', 'ACTIVE')
    .order('employee_code', { ascending: true });

  if (error || !emps) {
    console.error('Failed to load employees:', error);
    return;
  }

  console.log(`Loaded ${emps.length} active employees to push to eSSL MB160 (${SN})`);

  let cmdId = 1000;
  const commands = [];

  // Command 1: Ping / Check
  commands.push(`C:${cmdId++}:CHECK`);
  // Command 2: Query historical attendance log
  commands.push(`C:${cmdId++}:DATA QUERY ATTLOG`);

  // Commands 3..219: Push every employee to device
  for (const emp of emps) {
    let pin = '';
    const code = emp.employee_code.trim();
    if (code.startsWith('EEV')) {
      pin = code.replace(/\D/g, ''); // e.g. 8420
    } else if (code.startsWith('TEMP-')) {
      const num = parseInt(code.replace(/\D/g, ''), 10);
      pin = String(num); // 1, 2, ... 45
    } else if (code === 'SUB01') {
      pin = '9001';
    } else {
      pin = code.replace(/\D/g, '') || String(cmdId);
    }

    const rawName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.display_name || code;
    // Clean name for terminal (max 24 chars, no tabs or control chars)
    const cleanName = rawName.replace(/[\t\r\n]/g, ' ').slice(0, 24).trim();

    commands.push(`C:${cmdId++}:DATA UPDATE USERINFO PIN=${pin}\tName=${cleanName}\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=0`);
  }

  const payload = commands.join('\n');
  console.log(`Generated ${commands.length} commands for terminal ${SN}. Sample commands:\n` + commands.slice(0, 8).join('\n') + '\n...\n' + commands.slice(-3).join('\n'));

  // Push to Upstash Redis queue for JNP2263200782
  const queueKey = `adms_cmd_queue:${SN}`;
  const lockKey = `adms_auto_lock:${SN}`;

  // 1. Set command queue with TTL of 7 days (604800s)
  const setRes = await fetch(`${UPSTASH_URL}/set/${queueKey}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'text/plain'
    },
    body: payload
  });
  const setJson = await setRes.json();
  console.log(`Redis SET ${queueKey}:`, setJson);

  // Set TTL on the queue key
  await fetch(`${UPSTASH_URL}/expire/${queueKey}/604800`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
  });

  // 2. Clear auto-lock so terminal immediately executes when it next polls
  const delRes = await fetch(`${UPSTASH_URL}/del/${lockKey}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
  });
  const delJson = await delRes.json();
  console.log(`Redis DEL ${lockKey}:`, delJson);

  // 3. Update device registered_users_count in Supabase
  const { data: devUpd, error: devUpdErr } = await sb.from('biometric_devices')
    .update({
      registered_users_count: emps.length,
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('serial_number', SN)
    .select();
  console.log('Updated biometric_devices in DB:', { devUpd, devUpdErr });

  console.log(`\n🎉 SUCCESS! All ${emps.length} active Electra EV employees queued for terminal ${SN}. Next polling handshake from the MB160 terminal will ingest all ${commands.length} commands.`);
}

queueEmployeesToMB160();

