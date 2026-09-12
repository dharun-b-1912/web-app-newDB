const net = require('net');

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

function createTcpHeader(commandId, sessionId, replyId, data = Buffer.alloc(0)) {
  if (typeof data === 'string') data = Buffer.from(data, 'ascii');
  const buf = Buffer.alloc(8 + 8 + data.length);
  // TCP magic: 0x5050827d (LE: 7d 82 50 50)
  buf.writeUInt32LE(0x5050827d, 0);
  buf.writeUInt32LE(8 + data.length, 4);
  buf.writeUInt16LE(commandId, 8);
  buf.writeUInt16LE(0, 10); // Checksum placeholder
  buf.writeUInt16LE(sessionId, 12);
  buf.writeUInt16LE(replyId, 14);
  if (data.length > 0) {
    data.copy(buf, 16);
  }
  return buf;
}

const socket = new net.Socket();
let sessionId = 0;
let replyId = 0;

socket.connect(4370, '192.168.1.201', () => {
  console.log('✓ TCP Socket connected to 192.168.1.201:4370');
  // Send CMD_CONNECT (1000)
  replyId++;
  const connPkt = createTcpHeader(1000, 0, replyId);
  socket.write(connPkt);
});

socket.on('data', (data) => {
  console.log('<< Received', data.length, 'bytes:', data.toString('hex').slice(0, 80));
  if (data.length >= 16) {
    const cmdId = data.readUInt16LE(8);
    const sess = data.readUInt16LE(12);
    const rep = data.readUInt16LE(14);
    console.log(`Parsed Header: cmd=${cmdId}, sess=${sess}, rep=${rep}`);

    if (sessionId === 0 && (cmdId === 2000 || cmdId === 2005)) {
      sessionId = sess;
      console.log('✓ Session established:', sessionId);
      
      // Send Auth
      replyId++;
      const authKey = makeCommKey(123456, sessionId);
      const authPkt = createTcpHeader(1102, sessionId, replyId, authKey);
      socket.write(authPkt);
    } else if (cmdId === 2000) {
      console.log('✓ Command ACK_OK received!');
      // Register for Real-Time Events: CMD_REG_EVENT = 500, mask = 0xffff (all events: attlog, finger, verify, etc.)
      const regMask = Buffer.alloc(4);
      regMask.writeUInt32LE(0xffff, 0);
      replyId++;
      const regPkt = createTcpHeader(500, sessionId, replyId, regMask);
      socket.write(regPkt);
      console.log('Sent CMD_REG_EVENT (500) with mask 0xffff');
    } else if (cmdId === 500 || cmdId === 1500 || cmdId === 1501 || data.length > 16) {
      // Event received!
      console.log('🔔 REAL-TIME HARDWARE EVENT RECEIVED!', data.toString('hex'));
    }
  }
});

setTimeout(() => {
  console.log('Listening for 10s...');
}, 1000);

setTimeout(() => {
  socket.destroy();
  console.log('Done test.');
}, 12000);
