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
    console.log('✓ Connected! SessionId:', zk.zklibTcp.sessionId);

    // Authenticate CommKey
    const authKey = makeCommKey(123456, zk.zklibTcp.sessionId);
    const authRes = await zk.zklibTcp.executeCmd(1102, authKey);
    console.log('✓ Auth reply:', authRes);

    // Query Device Name
    const nameRes = await zk.zklibTcp.executeCmd(11, '~DeviceName\0');
    console.log('✓ DeviceName:', nameRes ? nameRes.toString('utf8') : 'empty');

    // Query Serial Number
    const snRes = await zk.zklibTcp.executeCmd(11, '~SerialNumber\0');
    console.log('✓ Serial Number:', snRes ? snRes.toString('utf8') : 'empty');

    // Query Platform
    const platRes = await zk.zklibTcp.executeCmd(11, '~Platform\0');
    console.log('✓ Platform:', platRes ? platRes.toString('utf8') : 'empty');

    // Query User Count
    const ucRes = await zk.zklibTcp.executeCmd(11, 'UserCount\0');
    console.log('✓ UserCount:', ucRes ? ucRes.toString('utf8') : 'empty');

    // Query Face Count
    const fcRes = await zk.zklibTcp.executeCmd(11, 'FaceCount\0');
    console.log('✓ FaceCount:', fcRes ? fcRes.toString('utf8') : 'empty');

    // Query FP Count
    const fpcRes = await zk.zklibTcp.executeCmd(11, 'FPCount\0');
    console.log('✓ FPCount:', fpcRes ? fpcRes.toString('utf8') : 'empty');

    // Query Att Record Count
    const attcRes = await zk.zklibTcp.executeCmd(11, 'AttCount\0');
    console.log('✓ AttCount:', attcRes ? attcRes.toString('utf8') : 'empty');

    // Query Get Time (CMD 201)
    const timeRes = await zk.zklibTcp.getTime();
    console.log('✓ Device Time:', timeRes);

    // Try reading SSR User Data (CMD 9 = CMD_USERTEMP_RRQ)
    console.log('\n--- Reading SSR / User Data ---');
    try {
      // CMD_GET_USER = 9, with parameter 5 (FCT_USER)
      const reqData = Buffer.alloc(4);
      reqData.writeUInt16LE(5, 0);
      const userRes = await zk.zklibTcp.executeCmd(9, reqData);
      console.log('CMD 9 user reply len:', userRes ? userRes.length : 0);
      if (userRes && userRes.length > 0) {
        console.log('Raw user bytes:', userRes.toString('hex').slice(0, 100));
      }
    } catch (e) {
      console.log('CMD 9 notice:', e.message);
    }

    // Try reading Attendance Records (CMD 13 = CMD_ATTLOG_RRQ)
    console.log('\n--- Reading Attendance Logs ---');
    try {
      const attRes = await zk.zklibTcp.executeCmd(13, '');
      console.log('CMD 13 att reply len:', attRes ? attRes.length : 0);
      if (attRes && attRes.length > 0) {
        console.log('Raw attendance bytes:', attRes.toString('hex').slice(0, 100));
      }
    } catch (e) {
      console.log('CMD 13 notice:', e.message);
    }

    await zk.disconnect();
    console.log('\n✓ Disconnected.');
  } catch (err) {
    console.error('Error:', err);
  }
})();
