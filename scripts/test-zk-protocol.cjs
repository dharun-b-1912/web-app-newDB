// scripts/test-zk-protocol.cjs
const net = require('net');
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

// 1. Standard 8-byte packet
function buildRaw8(cmd, session = 0, reply = 0) {
  const buf = Buffer.alloc(8);
  buf.writeUInt16LE(cmd, 0);
  buf.writeUInt16LE(0, 2);
  buf.writeUInt16LE(session, 4);
  buf.writeUInt16LE(reply, 6);
  buf.writeUInt16LE(createZkChecksum(buf), 2);
  return buf;
}

// 2. TCP Wrapped with 0x5050827d header
function buildTcpMagic(cmd, session = 0, reply = 0) {
  const inner = buildRaw8(cmd, session, reply);
  const outer = Buffer.alloc(8 + inner.length);
  outer.writeUInt32LE(0x5050827d, 0); // Magic
  outer.writeUInt32LE(inner.length, 4); // Length
  inner.copy(outer, 8);
  return outer;
}

console.log('Testing TCP Magic Wrapper to 192.168.1.58:4370...');
const socket = new net.Socket();
socket.setTimeout(3000);

socket.connect(port, ip, () => {
  console.log('[TCP] Connected! Sending 0x5050827d Magic CONNECT...');
  socket.write(buildTcpMagic(1000, 0, 0));
});

socket.on('data', (data) => {
  console.log(`[TCP DATA] Received ${data.length} bytes:`, data.toString('hex'));
});

socket.on('error', (err) => console.log('[TCP ERROR]', err.message));
socket.on('close', () => console.log('[TCP CLOSED]'));
socket.on('timeout', () => {
  console.log('[TCP TIMEOUT]');
  socket.destroy();
});
