// scripts/test-zk-auth.cjs
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

function buildRaw8(cmd, session = 0, reply = 0, extra = null) {
  const extraLen = extra ? extra.length : 0;
  const buf = Buffer.alloc(8 + extraLen);
  buf.writeUInt16LE(cmd, 0);
  buf.writeUInt16LE(0, 2);
  buf.writeUInt16LE(session, 4);
  buf.writeUInt16LE(reply, 6);
  if (extra) {
    extra.copy(buf, 8);
  }
  buf.writeUInt16LE(createZkChecksum(buf), 2);
  return buf;
}

// ZK CommKey Encryption algorithm
function makeAuthKey(key, sessionId) {
  let k = key;
  let s = sessionId;
  let ch = 0;
  for (let i = 0; i < 32; i++) {
    if (k & 1) {
      ch = (ch << 1) | 1;
    } else {
      ch = ch << 1;
    }
    k = k >> 1;
  }
  let res = (ch ^ s) + 0x4f53;
  const b = Buffer.alloc(4);
  b.writeUInt32LE(res, 0);
  return b;
}

console.log('Testing Authenticated ZKTeco Connection to 192.168.1.58:4370...');
const client = dgram.createSocket('udp4');

let currentSession = 0;
let replySeq = 0;
let userChunks = [];

client.on('message', (msg, rinfo) => {
  console.log(`[ZK MSG] ${msg.length} bytes:`, msg.toString('hex'));
  if (msg.length >= 8) {
    const cmdCode = msg.readUInt16LE(0);
    const session = msg.readUInt16LE(4);
    const rep = msg.readUInt16LE(6);

    currentSession = session || currentSession;
    replySeq = rep;

    console.log(`-> Received Command Code: ${cmdCode}, Session: ${currentSession}, ReplySeq: ${replySeq}`);

    if (cmdCode === 2005) {
      // CMD_ACK_UNAUTH: Send CMD_AUTH (1102) with CommKey 0
      console.log('-> CMD_ACK_UNAUTH received. Sending CMD_AUTH (1102) with CommKey=0...');
      const authKey = makeAuthKey(0, currentSession);
      const authPacket = buildRaw8(1102, currentSession, replySeq + 1, authKey);
      client.send(authPacket, port, ip);
    } else if (cmdCode === 2000) {
      console.log('✅ CMD_ACK_OK! Session authenticated successfully!');
      // Send CMD_USER_RRQ (9)
      console.log('-> Sending CMD_USER_RRQ (9) to read enrolled users...');
      const userReq = buildRaw8(9, currentSession, replySeq + 1);
      client.send(userReq, port, ip);
    } else if (cmdCode === 1500 || cmdCode === 1503 || cmdCode === 1504) {
      console.log(`-> Received Data Chunk (${msg.length} bytes)!`);
      userChunks.push(msg.slice(8));
      // Acknowledge chunk
      const ack = buildRaw8(2000, currentSession, replySeq + 1);
      client.send(ack, port, ip);
    }
  }
});

const connectBuf = buildRaw8(1000, 0, 0);
client.send(connectBuf, port, ip, (err) => {
  if (err) console.log('Send error:', err);
  else console.log('Sent CMD_CONNECT (1000)...');
});

setTimeout(() => {
  console.log(`Done! Collected ${userChunks.length} chunks. Total bytes:`, Buffer.concat(userChunks).length);
  client.close();
}, 4500);
