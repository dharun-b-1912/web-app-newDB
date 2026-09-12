const ZKLib = require('node-zklib');

function makeCommKey(key = 123456, sessionId = 0) {
  const numericKey = parseInt(String(key || 0).replace(/\D/g, ''), 10) || 0;
  if (numericKey === 0) return null;
  let k = 0;
  for (let i = 0; i < 32; i++) {
    if ((numericKey & (1 << i)) !== 0) {
      k = ((k << 1) | 1) >>> 0;
    } else {
      k = (k << 1) >>> 0;
    }
  }
  k = (k + sessionId) >>> 0;
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(k, 0);
  buf[0] ^= 'Z'.charCodeAt(0);
  buf[1] ^= 'K'.charCodeAt(0);
  buf[2] ^= 'S'.charCodeAt(0);
  buf[3] ^= 'O'.charCodeAt(0);
  return buf;
}

(async () => {
  const ip = '192.168.1.201';
  const port = 4370;
  const commKey = 123456;
  console.log(`\n========================================`);
  console.log(`🔌 Probing eSSL AiFace Magnum at ${ip}:${port}...`);
  console.log(`========================================\n`);

  const zk = new ZKLib(ip, port, 8000, 5000);

  try {
    await zk.createSocket();
    console.log('✓ TCP Socket connected!');

    const authPayload = makeCommKey(commKey, zk.sessionId || 0);
    if (authPayload) {
      try {
        await zk.executeCmd(1102, authPayload);
        console.log('✓ Comm Key (123456) Authenticated!');
      } catch (e) {
        console.log('⚠️ Comm Key auth notice:', e.message);
      }
    }

    // 1. Device Info
    try {
      const info = await zk.getInfo();
      console.log('\n📊 DEVICE INFO:', JSON.stringify(info, null, 2));
    } catch (e) {
      console.log('⚠️ Info error:', e.message);
    }

    // 2. Machine Users
    try {
      const usersRes = await zk.getUsers();
      const userList = usersRes?.data || (Array.isArray(usersRes) ? usersRes : []);
      console.log(`\n👥 MACHINE USERS FOUND: ${userList.length}`);
      console.log(JSON.stringify(userList, null, 2));
    } catch (e) {
      console.log('⚠️ getUsers error:', e.message);
    }

    // 3. Attendances
    try {
      const attRes = await zk.getAttendances();
      const attList = attRes?.data || (Array.isArray(attRes) ? attRes : []);
      console.log(`\n📋 ATTENDANCE LOGS FOUND: ${attList.length}`);
      if (attList.length > 0) {
        console.log('Latest 10 punches:');
        console.log(JSON.stringify(attList.slice(-10), null, 2));
      }
    } catch (e) {
      console.log('⚠️ getAttendances error:', e.message);
    }

    // 4. Try reading user count via CMD_USERTEMP_RRQ / DB queries
    try {
      // CMD_GET_USERCOUNT = 1007
      const userCountRes = await zk.executeCmd(1007, '');
      console.log('\n🔢 Raw User Count CMD 1007 Response:', userCountRes);
    } catch (_) {}

    await zk.disconnect();
    console.log('\n✓ Disconnected cleanly.');
  } catch (err) {
    console.error('❌ Connection error:', err.message || err);
  }
})();
