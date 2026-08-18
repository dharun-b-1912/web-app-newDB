// scripts/test-zk-udp.cjs
const dgram = require('dgram');

const ip = '192.168.1.58';
const port = 4370;

function createZkChecksum(buf) {
  let chk = 0;
  for (let i = 0; i < buf.length; i += 2) {
    if (i === buf.length - 1) {
      chk += buf[i];
    } else {
      chk += buf.readUInt16LE(i);
    }
    while (chk > 0xffff) {
      chk = (chk & 0xffff) + (chk >> 16);
    }
  }
  return (~chk) & 0xffff;
}

function buildRaw8(cmd, session = 0, reply = 0) {
  const buf = Buffer.alloc(8);
  buf.writeUInt16LE(cmd, 0);
  buf.writeUInt16LE(0, 2);
  buf.writeUInt16LE(session, 4);
  buf.writeUInt16LE(reply, 6);
  buf.writeUInt16LE(createZkChecksum(buf), 2);
  return buf;
}

console.log('Testing UDP socket to 192.168.1.58:4370...');
const client = dgram.createSocket('udp4');

client.on('message', (msg, rinfo) => {
  console.log(`[UDP RESPONSE] From ${rinfo.address}:${rinfo.port}, ${msg.length} bytes:`, msg.toString('hex'));
  if (msg.length >= 8) {
    const cmdCode = msg.readUInt16LE(0);
    const sessionId = msg.readUInt16LE(4);
    console.log(`Command Code: ${cmdCode}, Session ID: ${sessionId}`);
    if (cmdCode === 2000) {
      console.log('✅ ZK UDP PROTOCOL ACCEPTED! Requesting Users (CMD_USER_RRQ = 9)...');
      const userReq = buildRaw8(9, sessionId, 1);
      client.send(userReq, port, ip);
    }
  }
});

client.on('error', (err) => {
  console.log('[UDP ERROR]', err.message);
});

const connectBuf = buildRaw8(1000, 0, 0);
client.send(connectBuf, port, ip, (err) => {
  if (err) console.log('Send error:', err);
  else console.log('UDP CMD_CONNECT packet sent!');
});

setTimeout(() => {
  console.log('Closing UDP client.');
  client.close();
}, 4000);
