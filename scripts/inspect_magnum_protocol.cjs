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

function createTcpPacket(cmd, sessionId, replyId, payload = Buffer.alloc(0)) {
  if (typeof payload === 'string') payload = Buffer.from(payload, 'utf8');
  const buf = Buffer.alloc(16 + payload.length);
  // TCP magic: 0x5050 0x827d (50 50 82 7d)
  buf.writeUInt16LE(0x5050, 0);
  buf.writeUInt16LE(0x827d, 2);
  buf.writeUInt32LE(8 + payload.length, 4); // length
  buf.writeUInt16LE(cmd, 8);
  buf.writeUInt16LE(0, 10); // checksum (0 for tcp)
  buf.writeUInt16LE(sessionId, 12);
  buf.writeUInt16LE(replyId, 14);
  if (payload.length > 0) payload.copy(buf, 16);
  return buf;
}

function parseTcpPacket(buf) {
  if (buf.length < 16) return null;
  const magic1 = buf.readUInt16LE(0);
  const magic2 = buf.readUInt16LE(2);
  const len = buf.readUInt32LE(4);
  const cmd = buf.readUInt16LE(8);
  const chk = buf.readUInt16LE(10);
  const sessionId = buf.readUInt16LE(12);
  const replyId = buf.readUInt16LE(14);
  const data = buf.subarray(16);
  return { magic1, magic2, len, cmd, chk, sessionId, replyId, data };
}

async function run() {
  const ip = '192.168.1.201';
  const port = 4370;

  console.log(`Connecting direct TCP to ${ip}:${port}...`);
  const client = new net.Socket();

  let sessionId = 0;
  let replyId = 0;

  const send = (cmd, payload = Buffer.alloc(0)) => {
    return new Promise((resolve, reject) => {
      replyId = (replyId + 1) & 0xffff;
      const pkt = createTcpPacket(cmd, sessionId, replyId, payload);
      
      const onData = (data) => {
        client.removeListener('data', onData);
        client.removeListener('error', onError);
        const parsed = parseTcpPacket(data);
        resolve(parsed);
      };
      const onError = (err) => {
        client.removeListener('data', onData);
        client.removeListener('error', onError);
        reject(err);
      };

      client.once('data', onData);
      client.once('error', onError);
      client.write(pkt);
    });
  };

  await new Promise((res, rej) => {
    client.connect(port, ip, () => res(true));
    client.on('error', rej);
  });

  console.log('Connected to socket!');

  // 1. CMD_CONNECT = 1000
  const connRes = await send(1000);
  console.log('CMD_CONNECT reply:', connRes ? `cmd=${connRes.cmd}, sessionId=${connRes.sessionId}` : 'no response');
  if (connRes) sessionId = connRes.sessionId;

  // 2. CMD_AUTH = 1102 with commKey 123456
  const authKey = makeCommKey(123456, sessionId);
  if (authKey) {
    const authRes = await send(1102, authKey);
    console.log('CMD_AUTH reply:', authRes ? `cmd=${authRes.cmd}` : 'no response');
  }

  // 3. Query Device Name / Firmware / Serial via CMD_OPTIONS_RRQ (CMD 11)
  const optQueries = [
    '~DeviceName',
    '~SerialNumber',
    '~Platform',
    '~OEMVendor',
    '~OS',
    'FaceVersion',
    'FPVersion',
    'UserCount',
    'AttCount',
    'FaceCount',
    'FPCount'
  ];

  for (const q of optQueries) {
    const res = await send(11, `${q}\0`);
    const txt = res?.data ? res.data.toString('utf8').replace(/\0/g, '') : '';
    console.log(`Option [${q}]:`, txt || `(cmd=${res?.cmd})`);
  }

  // 4. CMD_GET_TIME = 201
  const timeRes = await send(201);
  if (timeRes && timeRes.data && timeRes.data.length >= 4) {
    const t = timeRes.data.readUInt32LE(0);
    // decode ZK time
    const second = t % 60;
    const minute = Math.floor(t / 60) % 60;
    const hour = Math.floor(t / 3600) % 24;
    const day = Math.floor(t / (3600 * 24)) % 31 + 1;
    const month = Math.floor(t / (3600 * 24 * 31)) % 12;
    const year = Math.floor(t / (3600 * 24 * 31 * 12)) + 2000;
    console.log(`Device Clock (CMD 201): ${year}-${month + 1}-${day} ${hour}:${minute}:${second}`);
  }

  // 5. Test Table Read: user table / SSR users (CMD_TABLE_RRQ = 1503 or DATA_QUERY)
  console.log('\nQuerying user table (CMD 1503)...');
  try {
    const tableRes = await send(1503, 'user\0');
    console.log('Table reply cmd:', tableRes?.cmd, 'data len:', tableRes?.data?.length);
    if (tableRes?.data) {
      console.log('Table data preview:', tableRes.data.toString('utf8').slice(0, 200));
    }
  } catch (e) {
    console.log('Table query notice:', e.message);
  }

  // 6. Test CMD 9 (CMD_USERTEMP_RRQ) with user request
  console.log('\nQuerying CMD 9 (USERTEMP_RRQ)...');
  try {
    const reqBuf = Buffer.alloc(4);
    reqBuf.writeUInt16LE(5, 0); // 5 = FCT_USER
    const uRes = await send(9, reqBuf);
    console.log('CMD 9 reply:', uRes?.cmd, 'data len:', uRes?.data?.length);
  } catch (e) {
    console.log('CMD 9 notice:', e.message);
  }

  // Disconnect CMD_EXIT = 1001
  await send(1001);
  client.destroy();
  console.log('\nDone.');
}

run().catch(console.error);
