#!/usr/bin/env node
// scripts/workforce-gateway-agent.cjs
// ============================================================================
// WorkForceOS — Production On-Premises Biometric LAN Gateway Daemon v2.5.0
// Powered by ZKTeco Protocol Driver (node-zklib), Low-Level CMD 60 / CMD 61
// ============================================================================

const http = require('http');
const net = require('net');
const url = require('url');
const fs = require('fs');
let ZKLib;
try {
  ZKLib = require('node-zklib');
} catch (e) {
  console.warn('[AGENT] node-zklib not found, running with fallback mode.');
}

const HTTP_PORT = process.env.GATEWAY_PORT || 11108;
let pairingKey = process.env.PAIRING_KEY || '';
let tenantId = process.env.TENANT_ID || 'org-joy-01';

// Parse command line arguments
process.argv.forEach((val, index) => {
  if (val === '--pair' || val === '-p') {
    pairingKey = process.argv[index + 1] || pairingKey;
  }
  if (val === '--tenant' || val === '-t') {
    tenantId = process.argv[index + 1] || tenantId;
  }
});

console.log('================================================================');
console.log(' ⚡ WorkForceOS Biometric LAN Gateway Daemon v2.5.0');
console.log('================================================================');
console.log(` Status      : Active & Listening`);
console.log(` Driver      : ZKTeco Low-Level Driver (node-zklib + Raw TCP)`);
console.log(` Tenant ID   : ${tenantId}`);
console.log(` Pairing Key : ${pairingKey || 'Active'}`);
console.log(` Local HTTP  : http://127.0.0.1:${HTTP_PORT}`);
console.log('================================================================\n');

/**
 * Core ZKTeco Biometric Driver Class (CMD 60 & CMD 61)
 */
class ZKTecoDriver {
  constructor(ip, port = 4370) {
    this.ip = ip;
    this.port = Number(port) || 4370;
    this.zk = ZKLib ? new ZKLib(this.ip, this.port, 10000, 4000) : null;
    this.isConnected = false;
  }

  async connect() {
    if (!this.zk) return false;
    try {
      await this.zk.createSocket();
      this.isConnected = true;
      return true;
    } catch (err) {
      console.error(`[DRIVER] Failed to connect to device ${this.ip}:${this.port}:`, err.message);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect() {
    try {
      if (this.isConnected && this.zk) {
        await this.zk.disconnect();
        this.isConnected = false;
      }
    } catch (_) {}
  }

  async getDeviceInfo() {
    if (!this.zk || !this.isConnected) return {};
    try {
      const info = await this.zk.getInfo();
      return info || {};
    } catch (err) {
      return {};
    }
  }

  async getUsers() {
    if (!this.zk || !this.isConnected) return [];
    try {
      const res = await this.zk.getUsers();
      return res?.data || [];
    } catch (err) {
      return [];
    }
  }

  /**
   * CRITICAL METHOD: Remote Fingerprint Enrollment Trigger
   * Sends low-level ZKTeco protocol binary commands (CMD 60 and CMD 61)
   */
  async startEnrollment(userId, fingerIndex = 0) {
    if (!this.zk || !this.isConnected) return false;
    try {
      console.log(`[DRIVER] Cancelling active capture on ${this.ip}:${this.port} (CMD 60)...`);
      // 1. Cancel any active scan / capture loop on the terminal (CMD 60)
      try {
        await this.zk.executeCmd(60, '');
        await new Promise((resolve) => setTimeout(resolve, 250));
      } catch (_) {}

      const numericUid = parseInt(String(userId).replace(/\D/g, ''), 10) || 1;
      console.log(`[DRIVER] Sending CMD 61 to ${this.ip}:${this.port} for UID #${numericUid} (Finger #${fingerIndex})...`);

      // 2. Try Format A: 3-byte payload (2-byte UInt16LE UID + 1-byte Finger Index)
      try {
        const buf3 = Buffer.alloc(3);
        buf3.writeUInt16LE(numericUid, 0);
        buf3.writeUInt8(fingerIndex, 2);
        const res3 = await this.zk.executeCmd(61, buf3);
        if (res3 !== false) {
          console.log(`[DRIVER] CMD 61 Format A accepted by hardware!`);
          return true;
        }
      } catch (e) {
        console.warn('[DRIVER] Format A notice:', e.message);
      }

      // 3. Fallback: Format B: 5-byte payload (4-byte UInt32LE UID + 1-byte Finger Index)
      try {
        const buf5 = Buffer.alloc(5);
        buf5.writeUInt32LE(numericUid, 0);
        buf5.writeUInt8(fingerIndex, 4);
        const res5 = await this.zk.executeCmd(61, buf5);
        if (res5 !== false) {
          console.log(`[DRIVER] CMD 61 Format B accepted by hardware!`);
          return true;
        }
      } catch (e) {
        console.warn('[DRIVER] Format B notice:', e.message);
      }

      return false;
    } catch (err) {
      console.error('[DRIVER] Hardware startEnrollment error:', err.message);
      return false;
    }
  }
}

// Real hardware users extracted from device memory / user.dat
function getDatUsers() {
  const users = [];
  const datPath = 'G:\\user.dat';
  if (fs.existsSync(datPath)) {
    try {
      const userBuf = fs.readFileSync(datPath);
      const recordSize = 72;
      const totalUsers = userBuf.length / recordSize;
      for (let i = 0; i < totalUsers; i++) {
        const chunk = userBuf.slice(i * recordSize, (i + 1) * recordSize);
        const uid = chunk.readUInt16LE(0);
        const privilege = chunk.readUInt8(2);
        const password = chunk.slice(3, 11).toString('ascii').replace(/\0/g, '').trim();
        const name = chunk.slice(11, 35).toString('ascii').replace(/\0/g, '').trim();
        const card = chunk.readUInt32LE(35);
        const groupId = chunk.readUInt8(39);
        const pin = chunk.slice(48, 72).toString('ascii').replace(/\0/g, '').trim();

        if (pin) {
          users.push({
            uid: String(uid),
            userId: pin,
            biometric_pin: pin,
            name: name || `Employee ${pin}`,
            privilege: privilege === 14 || privilege === 2 ? 'ADMIN' : 'USER',
            passwordConfigured: password.length > 0,
            cardNumber: card ? `CARD-${card}` : null,
            groupId: String(groupId || 1),
            timezone: 'Asia/Kolkata',
            enabled: true,
            fingerprintCount: 1,
            faceCount: null,
            faceEnrolled: false,
            palmEnrolled: false,
            irisEnrolled: false,
            source: 'PHYSICAL_DEVICE_ZKTECO',
          });
        }
      }
    } catch (err) {
      console.error('[AGENT] Error reading user.dat:', err.message);
    }
  }
  return users;
}

// Real hardware punches extracted from device memory / CGKK223862906_attlog.dat
function getDatPunches() {
  const punches = [];
  const attlogPath = 'G:\\CGKK223862906_attlog.dat';
  if (fs.existsSync(attlogPath)) {
    try {
      const content = fs.readFileSync(attlogPath, 'utf8');
      const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
      for (const line of lines) {
        const parts = line.trim().split(/\t|\s{2,}/);
        if (parts.length >= 2) {
          const pin = parts[0];
          const timestamp = parts[1];
          const verifyType = parts[2] === '1' ? 'Fingerprint' : parts[2] === '15' ? 'Face' : parts[2] === '4' ? 'Card' : 'Normal';
          const punchState = parts[3] === '0' ? 'Check-In' : parts[3] === '1' ? 'Check-Out' : 'Check-In';

          punches.push({
            pin,
            timestamp,
            verifyType,
            punchState,
            deviceSerial: 'CGKK223862906',
          });
        }
      }
    } catch (err) {
      console.error('[AGENT] Error reading attlog.dat:', err.message);
    }
  }
  return punches;
}

// In-memory active enrollment sessions registry
const activeEnrollmentSessions = new Map();
const enrolledUsersRegistry = {};

// HTTP Bridge Server
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 1. HEALTH
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ONLINE',
        agent_version: '2.5.0-enterprise',
        driver: 'ZKTeco Protocol (node-zklib)',
        pairing_key: pairingKey,
        tenant_id: tenantId,
        platform: process.platform,
        uptime_seconds: process.uptime(),
      })
    );
    return;
  }

  // 2. PROBE HARDWARE
  if (pathname === '/probe') {
    const targetIp = parsedUrl.query.ip || '192.168.1.58';
    const targetPort = Number(parsedUrl.query.port) || 4370;

    console.log(`[PROBE] Probing hardware terminal at ${targetIp}:${targetPort}...`);
    const socket = new net.Socket();
    const startTime = Date.now();
    let isResolved = false;

    socket.setTimeout(2500);
    socket.connect(targetPort, targetIp, () => {
      const latency = Date.now() - startTime;
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        console.log(`[PROBE] Response received in ${latency}ms.`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            status: 'ONLINE',
            ip_address: targetIp,
            port: targetPort,
            latency_ms: latency,
            vendor: 'ZKTeco',
            model: 'ZKTeco Time Attendance Terminal (ZLM60_TFT)',
            message: `TCP socket established successfully (${latency}ms latency).`,
          })
        );
      }
    });

    socket.on('error', (err) => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            status: 'NO_NETWORK',
            ip_address: targetIp,
            port: targetPort,
            latency_ms: 0,
            message: err.message,
          })
        );
      }
    });

    socket.on('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            status: 'NO_POWER',
            ip_address: targetIp,
            port: targetPort,
            latency_ms: 0,
            message: 'Connection timed out.',
          })
        );
      }
    });
    return;
  }

  // 3. FETCH ENROLLED USERS
  if (pathname === '/users') {
    const targetIp = parsedUrl.query.ip || '192.168.1.58';
    const targetPort = Number(parsedUrl.query.port) || 4370;
    console.log(`[USERS] Fetching enrolled hardware users from ${targetIp}:${targetPort}...`);

    let liveUsers = [];
    try {
      const driver = new ZKTecoDriver(targetIp, targetPort);
      const ok = await driver.connect();
      if (ok) {
        const zkUsers = await driver.getUsers();
        liveUsers = zkUsers.map((u) => ({
          uid: String(u.uid),
          userId: String(u.userId),
          biometric_pin: String(u.userId),
          name: u.name || `User ${u.userId}`,
          privilege: u.role === 14 || u.role === 2 ? 'ADMIN' : 'USER',
          passwordConfigured: !!u.password,
          cardNumber: u.cardno ? `CARD-${u.cardno}` : null,
          groupId: '1',
          timezone: 'Asia/Kolkata',
          enabled: true,
          fingerprintCount: 1,
          faceCount: null,
          faceEnrolled: false,
          palmEnrolled: false,
          irisEnrolled: false,
          source: 'PHYSICAL_DEVICE_ZKTECO_LIVE',
        }));
        await driver.disconnect();
      }
    } catch (e) {
      console.warn('[USERS] Live fetch warning:', e.message);
    }

    const datUsers = getDatUsers();
    const dynamicUsers = enrolledUsersRegistry[targetIp] || [];

    const map = new Map();
    for (const u of datUsers) map.set(u.userId, u);
    for (const u of liveUsers) map.set(u.userId, u);
    for (const u of dynamicUsers) map.set(u.userId || u.biometric_pin, u);
    const users = Array.from(map.values());

    console.log(`[USERS] Returning ${users.length} enrolled users for ${targetIp}.`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, count: users.length, deviceSerial: 'CGKK223862906', users }));
    return;
  }

  // 4. FETCH PUNCHES
  if (pathname === '/punches') {
    const punches = getDatPunches();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, count: punches.length, deviceSerial: 'CGKK223862906', punches }));
    return;
  }

  // 5. START REAL REMOTE ENROLLMENT SESSION (CMD 60 + CMD 61)
  if (pathname === '/enroll-session' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const {
          sessionId = `enr_${Date.now()}`,
          ip = '192.168.1.58',
          port = 4370,
          pin = '101',
          fingerCode = 'RIGHT_THUMB',
          vendorFingerIndex = 0,
          userName = 'Employee',
          employeeId = 'EMP-001',
        } = payload;

        console.log(`\n======================================================`);
        console.log(`[ENROLL-SESSION] Initiating remote enrollment for ${userName} (${employeeId})`);
        console.log(`[ENROLL-SESSION] Target Hardware: ${ip}:${port} • PIN: #${pin} • Finger: ${fingerCode} (#${vendorFingerIndex})`);
        console.log(`======================================================`);

        const sessionState = {
          sessionId,
          ip,
          port,
          pin: String(pin),
          fingerCode,
          vendorFingerIndex,
          userName,
          employeeId,
          status: 'CONNECTING_TO_DEVICE',
          progressStep: 0,
          totalSteps: 3,
          message: 'Connecting to physical biometric terminal...',
          startedAt: Date.now(),
          completedAt: null,
        };

        activeEnrollmentSessions.set(sessionId, sessionState);

        // Execute Real ZKTeco Hardware Trigger
        (async () => {
          try {
            const driver = new ZKTecoDriver(ip, port);
            const connected = await driver.connect();

            if (!connected) {
              sessionState.status = 'FAILED';
              sessionState.message = `Cannot establish TCP connection to ${ip}:${port}`;
              return;
            }

            sessionState.status = 'DEVICE_PREPARING';
            sessionState.message = 'Sending CMD 60 & CMD 61 to hardware sensor...';

            const triggered = await driver.startEnrollment(pin, vendorFingerIndex);
            await driver.disconnect();

            if (triggered) {
              sessionState.status = 'WAITING_FOR_FINGER';
              sessionState.message = `Terminal optical sensor activated! Place ${userName}'s finger on scanner now (3 scans).`;
              console.log(`[ENROLL-SESSION] Hardware sensor activated on physical device ${ip}:${port}!`);
            } else {
              sessionState.status = 'FAILED';
              sessionState.message = 'Device rejected enrollment command (CMD 61).';
            }
          } catch (err) {
            sessionState.status = 'FAILED';
            sessionState.message = err.message || 'Hardware error';
          }
        })();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, sessionId, status: sessionState.status, message: sessionState.message }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 6. ENROLLMENT STATUS POLLER
  if (pathname === '/enroll-status') {
    const sessionId = parsedUrl.query.sessionId;
    const session = activeEnrollmentSessions.get(sessionId);
    if (!session) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Enrollment session not found' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, session }));
    return;
  }

  // 7. CANCEL ENROLLMENT
  if (pathname === '/enroll-cancel' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { sessionId, ip = '192.168.1.58', port = 4370 } = payload;
        const session = activeEnrollmentSessions.get(sessionId);
        if (session) {
          session.status = 'CANCELLED';
          session.message = 'Enrollment cancelled';
        }

        // Send CMD 60 to hardware to cancel capture
        try {
          const driver = new ZKTecoDriver(ip, port);
          if (await driver.connect()) {
            await driver.zk.executeCmd(60, '');
            await driver.disconnect();
          }
        } catch (_) {}

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Capture cancelled on hardware.' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`[HTTP] Gateway daemon server listening on port ${HTTP_PORT}\n`);
});
