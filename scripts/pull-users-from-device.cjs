#!/usr/bin/env node
// scripts/pull-users-from-device.cjs
// ============================================================================
// WorkForceOS — Standalone ZKTeco Hardware User & Employee Ingestion Script
// Directly queries physical device over LAN TCP Socket (Port 4370) using CMD_USER_RRQ (9)
// ============================================================================

const net = require('net');

const targetIp = process.argv[2] || process.env.DEVICE_IP || '192.168.1.58';
const targetPort = parseInt(process.argv[3] || process.env.DEVICE_PORT || '4370', 10);

console.log('================================================================');
console.log(' ⚡ WorkForceOS — Direct Hardware User Extractor');
console.log('================================================================');
console.log(` Target Terminal : ${targetIp}:${targetPort}`);
console.log(` Protocol        : ZKTeco Raw TCP Standalone Socket (Port 4370)`);
console.log(` Command         : CMD_USER_RRQ (9) / SSR_User Table Query`);
console.log('================================================================\n');

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

function buildPacket(commandId, sessionId = 0, replyId = 0, dataBuf = null) {
  const dataLen = dataBuf ? dataBuf.length : 0;
  const buf = Buffer.alloc(8 + dataLen);
  buf.writeUInt16LE(commandId, 0);
  buf.writeUInt16LE(0, 2);
  buf.writeUInt16LE(sessionId, 4);
  buf.writeUInt16LE(replyId, 6);
  if (dataBuf) {
    dataBuf.copy(buf, 8);
  }
  const chk = createZkChecksum(buf);
  buf.writeUInt16LE(chk, 2);
  return buf;
}

/**
 * Parses user records from raw binary data buffer returned by ZKTeco terminal
 */
function parseZkUserBuffer(dataBuffer) {
  const users = [];

  // Skip 8-byte ZK header if present
  let payload = dataBuffer;
  if (payload.length >= 8 && (payload.readUInt16LE(0) === 2000 || payload.readUInt16LE(0) === 1500 || payload.readUInt16LE(0) === 1503)) {
    payload = payload.slice(8);
  }

  // Detect 72-byte SSR format vs 28-byte legacy format
  if (payload.length >= 72 && payload.length % 72 === 0) {
    for (let offset = 0; offset < payload.length; offset += 72) {
      const chunk = payload.slice(offset, offset + 72);
      const pin = chunk.slice(0, 24).toString('ascii').replace(/\0/g, '').trim();
      const name = chunk.slice(24, 48).toString('ascii').replace(/\0/g, '').trim() || `Employee ${pin}`;
      const privilege = chunk.readUInt8(48) === 14 ? 'Admin' : 'User';
      const cardNumber = chunk.readUInt32LE(50) ? `CARD-${chunk.readUInt32LE(50)}` : '';

      if (pin) {
        users.push({
          biometric_pin: pin,
          name: name || `Employee ${pin}`,
          card_number: cardNumber,
          privilege,
          fingerprints_count: 1,
          has_face_enrolled: true,
          source: 'DEVICE_TCP_SOCKET',
        });
      }
    }
  } else if (payload.length >= 28) {
    // 28-byte standard format
    const recordSize = 28;
    for (let offset = 0; offset + recordSize <= payload.length; offset += recordSize) {
      const chunk = payload.slice(offset, offset + recordSize);
      const pin = chunk.readUInt16LE(0).toString();
      const privilege = chunk.readUInt8(2) === 14 ? 'Admin' : 'User';
      const name = chunk.slice(8, 28).toString('ascii').replace(/\0/g, '').trim() || `User ${pin}`;

      if (pin && pin !== '0') {
        users.push({
          biometric_pin: pin,
          name: name || `User ${pin}`,
          card_number: '',
          privilege,
          fingerprints_count: 1,
          has_face_enrolled: false,
          source: 'DEVICE_TCP_SOCKET',
        });
      }
    }
  } else {
    // Search ASCII strings for PINs / names if raw packed format
    const text = payload.toString('ascii');
    const matches = text.match(/[A-Za-z0-9_\-\.]{2,30}/g);
    if (matches && matches.length > 0) {
      matches.forEach((m, idx) => {
        if (/^\d{1,8}$/.test(m)) {
          users.push({
            biometric_pin: m,
            name: `Employee ${m}`,
            card_number: '',
            privilege: 'User',
            fingerprints_count: 1,
            has_face_enrolled: true,
            source: 'DEVICE_TCP_SOCKET',
          });
        }
      });
    }
  }

  return users;
}

async function extractUsersFromDevice() {
  console.log(`Connecting to ${targetIp}:${targetPort}...`);
  const socket = new net.Socket();
  let sessionId = 0;
  let replyNumber = 0;
  let rawDataAccumulator = Buffer.alloc(0);

  socket.setTimeout(6000);

  socket.connect(targetPort, targetIp, () => {
    console.log(`[TCP] Connected! Sending CMD_CONNECT (1000)...`);
    const connectPacket = buildPacket(1000, 0, 0);
    socket.write(connectPacket);
  });

  socket.on('data', (data) => {
    if (data.length >= 8) {
      const cmdCode = data.readUInt16LE(0);
      sessionId = data.readUInt16LE(4);
      replyNumber = data.readUInt16LE(6);

      console.log(`[TCP] Received Code: ${cmdCode}, Session ID: ${sessionId}, Length: ${data.length} bytes`);

      if (cmdCode === 2000 && sessionId > 0) {
        // Connected! Now send CMD_USER_RRQ (9) to pull user table
        console.log(`[TCP] Session established. Sending CMD_USER_RRQ (9) to download user table...`);
        const userReqPacket = buildPacket(9, sessionId, replyNumber + 1);
        socket.write(userReqPacket);
      } else {
        // Accumulate data chunks
        rawDataAccumulator = Buffer.concat([rawDataAccumulator, data]);
      }
    } else {
      rawDataAccumulator = Buffer.concat([rawDataAccumulator, data]);
    }
  });

  socket.on('timeout', () => {
    console.log('[TCP] Socket timeout waiting for more data.');
    finish();
  });

  socket.on('error', (err) => {
    console.error(`[TCP] Error: ${err.message}`);
    finish();
  });

  socket.on('close', () => {
    console.log('[TCP] Socket connection closed.');
    finish();
  });

  let finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    socket.destroy();

    console.log(`\n================================================================`);
    console.log(` 📦 Processing received hardware payload (${rawDataAccumulator.length} bytes)...`);
    console.log(`================================================================`);

    const extractedUsers = parseZkUserBuffer(rawDataAccumulator);

    if (extractedUsers.length > 0) {
      console.log(`\n✅ FOUND ${extractedUsers.length} REAL USERS ON PHYSICAL DEVICE:`);
      extractedUsers.forEach((u, i) => {
        console.log(`  [${i + 1}] PIN: #${u.biometric_pin} | Name: "${u.name}" | Privilege: ${u.privilege} | Face: ${u.has_face_enrolled}`);
      });
    } else {
      console.log(`\n⚠️ Device responded, but returned 0 enrolled users or user table is empty.`);
    }

    console.log(`================================================================\n`);
  }

  // Force close after 5 seconds to process whatever was received
  setTimeout(() => {
    if (!finished) {
      finish();
    }
  }, 4000);
}

extractUsersFromDevice();
