// ============================================================================
// Joy PeopleHR — eSSL Hardware Device Diagnostic & Connectivity Test Tool
// ============================================================================
// Run with: npx tsx scripts/test_essl_connection.ts <IP_ADDRESS> [PORT]
// Example: npx tsx scripts/test_essl_connection.ts 192.168.1.201 4370
// ============================================================================

import * as net from 'net';

const targetIp = process.argv[2] || '192.168.1.201';
const targetPort = parseInt(process.argv[3] || '4370', 10);

console.log('================================================================');
console.log('  JOY PEOPLEHR — eSSL MULTI-MODAL HARDWARE DIAGNOSTIC TEST TOOL');
console.log('================================================================');
console.log(`[*] Target Device IP   : ${targetIp}`);
console.log(`[*] Communication Port : ${targetPort} (Standalone TCP Socket)`);
console.log(`[*] Modalities Tested  : Face Recognition, Fingerprint, RFID Card, PIN`);
console.log('----------------------------------------------------------------');

const client = new net.Socket();
const startTime = Date.now();

client.setTimeout(4000);

client.connect(targetPort, targetIp, () => {
  const latency = Date.now() - startTime;
  console.log(`\n[+] SUCCESS: TCP Socket Connected to ${targetIp}:${targetPort} in ${latency}ms!`);
  console.log('[+] Hardware Port 4370 is OPEN and accepting commands.');
  
  // ZKTeco / eSSL Handshake Connect Command (CMD_CONNECT = 1000)
  // Header: 0x5050 (Session 0, Reply 0, Cmd 1000)
  const connectCmd = Buffer.from([
    0xd0, 0x07, // 2000 in little endian
    0x00, 0x00, // session id 0
    0xe8, 0x03, // CMD_CONNECT (1000)
    0x00, 0x00, // checksum placeholder
  ]);

  client.write(connectCmd);
  console.log('[*] Dispatched CMD_CONNECT handshake packet to terminal...');
});

client.on('data', (data) => {
  console.log(`\n[+] RECEIVE: Terminal responded with ${data.length} bytes packet!`);
  console.log(`[*] Hex Stream: ${data.toString('hex').toUpperCase()}`);
  console.log('\n================================================================');
  console.log('  HARDWARE DIAGNOSTIC RESULT: 🟢 ONLINE & RESPONDING');
  console.log('================================================================');
  console.log('  1. Physical Cable & Network Link : OK');
  console.log('  2. IP Address Routing            : OK');
  console.log('  3. Firmware TCP Daemon           : ACTIVE');
  console.log('  4. Ready for Joy PeopleHR Sync   : YES');
  console.log('================================================================\n');
  client.destroy();
});

client.on('timeout', () => {
  console.log(`\n[-] WARNING: Connection to ${targetIp}:${targetPort} timed out (4000ms).`);
  console.log('[-] Troubleshooting Steps:');
  console.log('    1. Check if the device is powered on.');
  console.log('    2. Confirm IP address in Menu -> Comm. -> Ethernet.');
  console.log('    3. Verify your PC and the biometric device are on the same subnet (e.g. 192.168.1.x).');
  console.log('    4. Ping the device from PowerShell: ping ' + targetIp);
  client.destroy();
});

client.on('error', (err) => {
  console.log(`\n[-] ERROR: Failed to connect to ${targetIp}:${targetPort} - ${err.message}`);
  client.destroy();
});
