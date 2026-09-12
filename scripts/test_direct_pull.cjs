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
  console.log(`Connecting to ${ip}:${port}...`);
  const zk = new ZKLib(ip, port, 5000, 4000);

  try {
    await zk.createSocket();
    console.log('Connected! Session:', zk.zklibTcp.sessionId);
    
    const authKey = makeCommKey(123456, zk.zklibTcp.sessionId);
    const authRes = await zk.zklibTcp.executeCmd(1102, authKey);
    console.log('Auth result:', authRes);

    // Let's test getAttendances
    try {
      const att = await zk.getAttendances();
      console.log('zk.getAttendances():', att ? (att.data ? att.data.length : att.length) : 'null');
      if (att && att.data) {
        console.log('Sample punch:', att.data.slice(-5));
      }
    } catch (attErr) {
      console.log('zk.getAttendances() error:', attErr.message);
    }

    // Let's test getUsers
    try {
      const users = await zk.getUsers();
      console.log('zk.getUsers():', users ? (users.data ? users.data.length : users.length) : 'null');
      if (users && users.data) {
        console.log('Sample users:', users.data.slice(0, 5));
      }
    } catch (uErr) {
      console.log('zk.getUsers() error:', uErr.message);
    }

    await zk.disconnect();
  } catch (err) {
    console.error('Fatal error:', err);
  }
})();
