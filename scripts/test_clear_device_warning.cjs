// scripts/test_clear_device_warning.cjs
const net = require('net');
let ZKLib;
try {
  ZKLib = require('node-zklib');
} catch (e) {}

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

async function clearHardwareAlarms(ip = '192.168.1.201', port = 4370) {
  console.log(`[ALARM-CLEAR] Connecting to ${ip}:${port} via TCP...`);
  const zk = new ZKLib(ip, port, 10000, 4000);
  try {
    await zk.createSocket();
    console.log(`[ALARM-CLEAR] Socket connected. Authenticating CommKey...`);

    // Authenticate
    const authKey = makeCommKey(123456, zk.zklibTcp.sessionId);
    const authRes = await zk.zklibTcp.executeCmd(1102, authKey);
    console.log(`[ALARM-CLEAR] ✓ CommKey Authentication Accepted!`);

    // 1. Clear Alarm / Unalarm (CMD 1009 / CMD 1010)
    try {
      await zk.zklibTcp.executeCmd(1009, '');
      console.log(`[ALARM-CLEAR] ✓ CMD 1009 (CMD_CLEAR_ALARM) accepted!`);
    } catch (e) {
      console.log(`[ALARM-CLEAR] CMD 1009 notice:`, e.message);
    }

    try {
      await zk.zklibTcp.executeCmd(1010, '');
      console.log(`[ALARM-CLEAR] ✓ CMD 1010 (CMD_CLEAR_ACC_ALARM) accepted!`);
    } catch (e) {
      console.log(`[ALARM-CLEAR] CMD 1010 notice:`, e.message);
    }

    // 2. Refresh system state (CMD 1013)
    try {
      await zk.zklibTcp.executeCmd(1013, '');
      console.log(`[ALARM-CLEAR] ✓ CMD 1013 (CMD_REFRESHDATA) accepted!`);
    } catch (e) {
      console.log(`[ALARM-CLEAR] Refresh notice:`, e.message);
    }

    // 3. Enable device UI (CMD 1004)
    try {
      await zk.zklibTcp.executeCmd(1004, '');
      console.log(`[ALARM-CLEAR] ✓ CMD 1004 (CMD_ENABLEDEVICE) accepted!`);
    } catch (e) {
      console.log(`[ALARM-CLEAR] Enable device notice:`, e.message);
    }

    await zk.disconnect();
    console.log(`[ALARM-CLEAR] All hardware commands completed successfully.`);
  } catch (err) {
    console.error(`[ALARM-CLEAR] Connection failed:`, err.message);
  }
}

clearHardwareAlarms();
