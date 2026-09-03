// scripts/probe_device_biometrics.cjs
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
  const zk = new ZKLib(ip, port, 5000, 4000);

  try {
    console.log(`Connecting to ${ip}:${port}...`);
    await zk.createSocket();
    console.log('Socket established!');

    const authPayload = makeCommKey(123456, zk.sessionId || 0);
    if (authPayload) {
      try {
        await zk.executeCmd(1102, authPayload);
        console.log('Comm Key Authenticated!');
      } catch (e) {
        console.log('Comm key auth error:', e.message);
      }
    }

    const info = await zk.getInfo().catch(e => ({ error: e.message }));
    console.log('DEVICE INFO:', JSON.stringify(info, null, 2));

    const users = await zk.getUsers().catch(e => ({ error: e.message }));
    console.log('USERS ON HARDWARE:', JSON.stringify(users, null, 2));

    if (typeof zk.getTemplates === 'function') {
      const tmps = await zk.getTemplates().catch(e => ({ error: e.message }));
      console.log('FINGERPRINT TEMPLATES:', JSON.stringify(tmps, null, 2));
    }

    if (typeof zk.getAttendances === 'function') {
      const atts = await zk.getAttendances().catch(e => ({ error: e.message }));
      const list = atts?.data || [];
      console.log(`ATTENDANCES: ${list.length} total records`);
      if (list.length > 0) {
        console.log('Recent 10 punches:', JSON.stringify(list.slice(-10), null, 2));
      }
    }

    await zk.disconnect();
  } catch (err) {
    console.error('Fatal error:', err);
  }
})();
