#!/usr/bin/env node
// scripts/workforce-gateway-agent.cjs
// ============================================================================
// WorkForceOS — Production On-Premises Biometric LAN Gateway Daemon
// Real TCP Socket (Port 4370) Scanner, ZKTeco Standalone Driver & HTTP/WS Bridge
// ============================================================================

const http = require('http');
const net = require('net');
const url = require('url');

const HTTP_PORT = 11105;
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
console.log(' ⚡ WorkForceOS Biometric LAN Gateway Daemon v2.4.0');
console.log('================================================================');
console.log(` Status      : Initializing Local Agent`);
console.log(` Tenant ID   : ${tenantId}`);
console.log(` Pairing Key : ${pairingKey || 'Awaiting Web Pairing'}`);
console.log(` Local HTTP  : http://127.0.0.1:${HTTP_PORT}`);
console.log('================================================================\n');

/**
 * Calculates 16-bit 1's complement checksum for ZKTeco binary protocol
 */
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

/**
 * Creates ZKTeco CMD_CONNECT (1000) binary packet
 */
function buildZkConnectPacket(sessionId = 0, replyId = 0) {
  const buf = Buffer.alloc(8);
  buf.writeUInt16LE(1000, 0); // CMD_CONNECT = 1000
  buf.writeUInt16LE(0, 2);    // Checksum placeholder
  buf.writeUInt16LE(sessionId, 4);
  buf.writeUInt16LE(replyId, 6);

  const checksum = createZkChecksum(buf);
  buf.writeUInt16LE(checksum, 2);
  return buf;
}

/**
 * Performs REAL TCP Socket Handshake to hardware terminal
 */
function probeHardwareSocket(targetIp, targetPort = 4370, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();

    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
      }
    };

    socket.setTimeout(timeoutMs);

    socket.connect(targetPort, targetIp, () => {
      const latency = Date.now() - startTime;

      // Send ZKTeco CMD_CONNECT packet
      const connectPacket = buildZkConnectPacket(0, 0);
      socket.write(connectPacket);

      socket.once('data', (data) => {
        cleanup();
        let cmdCode = 0;
        let sessionId = 0;
        if (data.length >= 8) {
          cmdCode = data.readUInt16LE(0);
          sessionId = data.readUInt16LE(4);
        }

        resolve({
          success: true,
          status: 'ONLINE',
          ip_address: targetIp,
          port: targetPort,
          latency_ms: latency,
          vendor: targetPort === 11100 ? 'Mantra' : targetPort === 8000 ? 'Matrix COSEC' : 'ZKTeco',
          model: targetPort === 11100 ? 'MFS100' : 'Standalone Terminal',
          protocol_response: {
            cmd_code: cmdCode,
            session_id: sessionId,
            raw_bytes_received: data.length,
          },
          message: `Hardware TCP Socket responded in ${latency}ms (Session ID: ${sessionId}).`,
        });
      });

      // Fallback if device connects but sends no raw response within 1.5s
      setTimeout(() => {
        if (!resolved) {
          cleanup();
          resolve({
            success: true,
            status: 'ONLINE',
            ip_address: targetIp,
            port: targetPort,
            latency_ms: latency,
            vendor: 'ZKTeco',
            model: 'ZKTeco Time Attendance Terminal',
            message: `TCP Port ${targetPort} open and connected in ${latency}ms.`,
          });
        }
      }, 1500);
    });

    socket.on('error', (err) => {
      cleanup();
      const code = err.code || 'ERR_SOCKET_FAILED';
      let status = 'NO_NETWORK';
      let reason = 'Network unreachable or host down.';

      if (code === 'ECONNREFUSED') {
        status = 'PORT_CLOSED';
        reason = `IP ${targetIp} is active, but TCP Port ${targetPort} was refused. Service stopped.`;
      } else if (code === 'ETIMEDOUT') {
        status = 'NO_POWER';
        reason = `Connection timed out (100% packet loss). Device is likely powered off or disconnected.`;
      } else if (code === 'EHOSTUNREACH' || code === 'ENETUNREACH') {
        status = 'NO_NETWORK';
        reason = `Host ${targetIp} is unreachable from this subnet. Check network routing or Wi-Fi.`;
      }

      resolve({
        success: false,
        status,
        ip_address: targetIp,
        port: targetPort,
        latency_ms: 0,
        error_code: code,
        failure_reason: reason,
        message: `${status}: ${reason} (${code})`,
      });
    });

    socket.on('timeout', () => {
      cleanup();
      resolve({
        success: false,
        status: 'NO_POWER',
        ip_address: targetIp,
        port: targetPort,
        latency_ms: 0,
        error_code: 'ETIMEDOUT',
        failure_reason: `Socket timed out after ${timeoutMs}ms. Hardware has no power or no response.`,
        message: `NO_POWER: Socket timed out after ${timeoutMs}ms (ETIMEDOUT).`,
      });
    });
  });
}

// Local HTTP Bridge Server for WorkForceOS Frontend
const server = http.createServer(async (req, res) => {
  // Enable CORS for WorkForceOS web application
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

  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ONLINE',
        agent_version: '2.4.0-enterprise',
        pairing_key: pairingKey,
        tenant_id: tenantId,
        platform: process.platform,
        uptime_seconds: process.uptime(),
        local_time: new Date().toISOString(),
      })
    );
    return;
  }

  if (pathname === '/probe') {
    const targetIp = parsedUrl.query.ip || '192.168.1.58';
    const targetPort = parseInt(parsedUrl.query.port, 10) || 4370;

    console.log(`[PROBE] Probing real hardware TCP socket -> ${targetIp}:${targetPort}...`);
    const probeResult = await probeHardwareSocket(targetIp, targetPort, 3000);
    console.log(`[PROBE] Result: ${probeResult.status} (${probeResult.message})`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(probeResult));
    return;
  }

  if (pathname === '/scan') {
    const subnetPrefix = (parsedUrl.query.subnet || '192.168.1').split('.').slice(0, 3).join('.');
    console.log(`[SCAN] Scanning subnet ${subnetPrefix}.1 -> ${subnetPrefix}.254 on ports 4370, 11100, 8000...`);

    const targets = [];
    for (let i = 1; i <= 254; i++) {
      targets.push(`${subnetPrefix}.${i}`);
    }

    const discovered = [];
    const portsToProbe = [4370, 11100, 8000];

    // Probe in concurrent chunks
    for (let i = 0; i < targets.length; i += 20) {
      const chunk = targets.slice(i, i + 20);
      const promises = chunk.flatMap((ip) =>
        portsToProbe.map((p) => probeHardwareSocket(ip, p, 1000))
      );
      const results = await Promise.all(promises);
      for (const r of results) {
        if (r.success) {
          discovered.push(r);
          console.log(`[SCAN] Discovered Terminal -> ${r.ip_address}:${r.port} (${r.vendor})`);
        }
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ discovered_count: discovered.length, devices: discovered }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(HTTP_PORT, '127.0.0.1', () => {
  console.log(` Ready! WorkForceOS LAN Gateway Agent listening on http://127.0.0.1:${HTTP_PORT}`);
  console.log(' Send probe requests or use WorkForceOS UI to discover real hardware on your LAN.\n');
});
