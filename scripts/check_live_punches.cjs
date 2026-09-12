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
  console.log(`\n======================================================`);
  console.log(`🔌 Checking Live Attendance Logs on ${ip}:${port}...`);
  console.log(`======================================================\n`);

  const zk = new ZKLib(ip, port, 5000, 4000);

  try {
    await zk.createSocket();
    console.log('✓ TCP Socket connected!');

    const authKey = makeCommKey(123456, zk.sessionId || 0);
    if (authKey) {
      try {
        await zk.executeCmd(1102, authKey);
        console.log('✓ Comm Key Authenticated!');
      } catch (e) {
        console.log('Auth notice:', e.message);
      }
    }

    // Query Attendances
    let records = [];
    try {
      const attRes = await zk.getAttendances();
      records = attRes?.data || (Array.isArray(attRes) ? attRes : []);
    } catch (e) {
      console.log('getAttendances notice:', e.message);
    }

    console.log(`\n📋 TOTAL ATTENDANCE PUNCHES ON HARDWARE: ${records.length}`);
    if (records.length > 0) {
      console.log('\n--- Recent 10 Punches on Machine ---');
      records.slice(-10).forEach((r, idx) => {
        const pin = r.deviceUserId || r.userId || r.pin;
        const time = r.recordTime;
        const vType = r.verifyType === 15 ? 'Face' : r.verifyType === 1 ? 'Fingerprint' : r.verifyType === 4 ? 'Card' : `Mode (${r.verifyType})`;
        const state = r.punchState === 1 ? 'Check-Out' : 'Check-In';
        console.log(`${idx + 1}. PIN: #${pin} | Verification: ${vType} | Time: ${time} | State: ${state}`);
      });
    }

    await zk.disconnect();
    console.log('\n✓ Socket closed.');
  } catch (err) {
    console.error('Connection error:', err);
  }
})();
