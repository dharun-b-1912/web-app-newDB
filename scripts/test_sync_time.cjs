// scripts/test_sync_time.cjs
const net = require('net');
let ZKLib;
try {
  ZKLib = require('node-zklib');
} catch (e) {}

function encodeZkTime(d = new Date()) {
  const year = d.getFullYear() % 100;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours();
  const minute = d.getMinutes();
  const second = d.getSeconds();

  const val = ((((year) * 12 * 31 + ((month - 1) * 31) + day - 1) * 86400) + (hour * 3600 + minute * 60 + second)) >>> 0;
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(val, 0);
  return buf;
}

async function syncHardwareTime(ip = '192.168.1.201', port = 4370) {
  const zk = new ZKLib(ip, port, 10000, 4000);
  try {
    await zk.createSocket();
    const timeBuf = encodeZkTime(new Date());
    await zk.executeCmd(1002, timeBuf); // CMD_SET_TIME = 1002
    console.log(`[TIME-SYNC] ✓ CMD 1002 (CMD_SET_TIME) executed! Hardware time synced.`);
    await zk.executeCmd(1013, ''); // CMD_REFRESHDATA
    await zk.disconnect();
  } catch (err) {
    console.error(`[TIME-SYNC] Error:`, err.message);
  }
}

syncHardwareTime();
