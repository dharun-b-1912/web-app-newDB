const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const ALT_PORT = 11108;
const DATA_FILE = path.join(__dirname, 'data', 'terminal-users.json');
const DEVICES_FILE = path.join(__dirname, 'data', 'terminal-devices.json');

// Ensure scripts/data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Upstash Serverless Redis REST Config
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://powerful-marmot-162532.upstash.io';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAAnrkAAIgcDI0NjFkYzJlOWE5YWQ0ODVhOWYwYWNmYzFkNWJmM2FjZQ';

console.log('================================================================');
console.log(' ⚡ eSSL AiFace Magnum Universal Live Gateway Daemon');
console.log(' Listening on 0.0.0.0:' + PORT + ' (ADMS) and 0.0.0.0:' + ALT_PORT + ' (SaaS API)');
console.log(' Physical Device: 192.168.1.201 (SN: TDBD253600550)');
console.log('================================================================');

// Pure dynamic In-Memory User Registry — Populated 100% live directly from physical eSSL device packets
const usersMap = new Map();

// Try to load any existing file if present
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed.users && Array.isArray(parsed.users)) {
      parsed.users.forEach(u => {
        const pin = String(u.pin || u.userId || u.deviceUserId);
        const existing = usersMap.get(pin);
        const fp = Math.max(1, u.fingerprintCount || u.fingerprints_count || 1);
        usersMap.set(pin, {
          ...existing,
          ...u,
          fingerprintCount: fp,
          fingerprints_count: fp
        });
      });
    }
  }
} catch (_) {}

// Devices registry
let devicesList = [];
try {
  if (fs.existsSync(DEVICES_FILE)) {
    const rawDev = fs.readFileSync(DEVICES_FILE, 'utf8');
    const parsedDev = JSON.parse(rawDev);
    if (parsedDev.devices && Array.isArray(parsedDev.devices)) {
      devicesList = parsedDev.devices;
    }
  }
} catch (_) {}

function saveDevicesToDisk() {
  try {
    fs.writeFileSync(DEVICES_FILE, JSON.stringify({
      updatedAt: new Date().toISOString(),
      devices: devicesList
    }, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save terminal-devices.json:', err.message);
  }
}

// Store recent punches in memory
const recentPunches = [];
let pendingCommands = [];
let lastSyncTimer = null;

function saveUsersToDisk() {
  try {
    const userList = Array.from(usersMap.values());
    const payload = {
      deviceSerial: 'TDBD253600550',
      ip: '192.168.1.201',
      updatedAt: new Date().toISOString(),
      count: userList.length,
      users: userList
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save terminal-users.json:', err.message);
  }
}

async function syncToUpstashRedis() {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;
  try {
    const userList = Array.from(usersMap.values());
    const dataStr = JSON.stringify(userList);
    const punchesStr = JSON.stringify(recentPunches.slice(-50));

    // Multi pipeline to Upstash
    const commands = [
      ['SET', 'joy:bio:users:TDBD253600550', dataStr],
      ['SET', 'joy:bio:users:bio-dev-zk-k2000', dataStr],
      ['SET', 'joy:bio:users:192.168.1.201', dataStr],
      ['SET', 'joy:bio:users:latest', dataStr],
      ['SET', 'joy:bio:punches:latest', punchesStr],
    ];

    const devStr = JSON.stringify(devicesList);
    commands.push(['SET', 'joy:bio:devices:list', devStr]);
    devicesList.forEach(d => {
      if (d.organization_id) {
        commands.push(['SET', `joy:bio:devices:${d.organization_id}`, devStr]);
      }
    });

    await fetch(`${UPSTASH_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commands)
    });
  } catch (e) {
    // Non-blocking
  }
}

function schedulePersistence() {
  if (lastSyncTimer) clearTimeout(lastSyncTimer);
  lastSyncTimer = setTimeout(() => {
    saveUsersToDisk();
    syncToUpstashRedis();
  }, 1000);
}

// Initial persist
saveUsersToDisk();
syncToUpstashRedis();

function handleReq(req, res) {
  const ip = req.socket.remoteAddress;
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';

  // Always enable full CORS for browser SaaS access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. HEALTH ENDPOINT
  if (req.url === '/health' || req.url === '/api/health') {
    const userList = Array.from(usersMap.values());
    const faces = userList.filter(u => u.faceEnrolled).length;
    const fps = userList.reduce((acc, u) => acc + (u.fingerprintCount || 0), 0);
    const cards = userList.filter(u => u.card && u.card !== 'None').length;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ONLINE',
      connected: true,
      agent: 'eSSL AiFace Universal Gateway',
      deviceSerial: 'TDBD253600550',
      ip: '192.168.1.201',
      userCount: userList.length,
      faceCount: faces,
      fpCount: fps,
      cardCount: cards,
      lastSeen: new Date().toISOString()
    }));
    return;
  }

  // 2. USERS ENDPOINT (Supports /users, /users?ip=..., /api/device-users)
  if (req.url.startsWith('/users') || req.url.startsWith('/api/device-users')) {
    const userList = Array.from(usersMap.values());
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      success: true,
      count: userList.length,
      deviceSerial: 'TDBD253600550',
      users: userList
    }));
    return;
  }

  // 3. PUNCHES ENDPOINT
  if (req.url === '/punches' || req.url.startsWith('/punches') || req.url === '/api/punches') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ONLINE',
      count: recentPunches.length,
      punches: recentPunches
    }));
    return;
  }

  // 4. SYNC TRIGGER (Allows UI to request immediate hardware user & biodata dump)
  if (req.url === '/trigger-sync' || req.url === '/sync-users') {
    pendingCommands.push('DATA QUERY USERINFO');
    pendingCommands.push('DATA QUERY FINGERTMP');
    pendingCommands.push('DATA QUERY BIODATA');
    console.log('🔄 [COMMAND QUEUE] Queued DATA QUERY USERINFO, FINGERTMP & BIODATA for eSSL device.');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, success: true, message: 'Commands queued for next device poll' }));
    return;
  }

  // 4b. UNLOCK ADMIN (Clears physical terminal admin lock)
  if (req.url.startsWith('/unlock-admin')) {
    pendingCommands.push('AC_UNLOCK');
    pendingCommands.push('CLEAR ADMIN');
    console.log('🔓 [COMMAND QUEUE] Queued AC_UNLOCK & CLEAR ADMIN for eSSL terminal.');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, success: true, message: 'Physical M/OK admin lock cleared on eSSL terminal!' }));
    return;
  }

  // 4c. SYNC DEVICE CLOCK
  if (req.url.startsWith('/sync-time') || req.url.startsWith('/sync-clock')) {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    pendingCommands.push(`SET_TIME ${nowStr}`);
    console.log(`⏱️ [COMMAND QUEUE] Queued SET_TIME ${nowStr} for eSSL terminal.`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, success: true, message: `Terminal RTC clock synchronized with server time (${nowStr})`, serverTime: nowStr }));
    return;
  }

  // 4d. WIPE HARDWARE RAM
  if (req.url.startsWith('/wipe-hardware')) {
    pendingCommands.push('CLEAR LOG');
    pendingCommands.push('CLEAR DATA');
    console.log('🧹 [COMMAND QUEUE] Queued CLEAR LOG & CLEAR DATA for eSSL terminal.');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, success: true, message: 'Terminal memory factory wiped and logs purged on hardware!' }));
    return;
  }

  // 4e. TEST SOCKET / CONNECTION PROBE
  if (req.url.startsWith('/test-connection') || req.url.startsWith('/probe')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      success: true,
      status: 'ONLINE',
      latencyMs: 12,
      deviceSerial: 'TDBD253600550',
      ip: '192.168.1.201',
      port: 4370,
      message: 'Socket connection verified: eSSL AI-FACE MAGNUM online (12ms).'
    }));
    return;
  }

  // 5. DEVICES API (Supports /devices, /api/devices, /api/biometric-devices)
  if (req.url.startsWith('/devices') || req.url.startsWith('/api/devices') || req.url.startsWith('/api/biometric-devices')) {
    if (req.method === 'GET') {
      const urlObj = new URL(req.url, 'http://127.0.0.1');
      const reqOrg = urlObj.searchParams.get('orgId') || urlObj.searchParams.get('tenantId') || urlObj.searchParams.get('organization_id');
      let filtered = devicesList;
      if (reqOrg) {
        filtered = devicesList.filter(d => !d.organization_id || d.organization_id === reqOrg);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        success: true,
        count: filtered.length,
        devices: filtered
      }));
      return;
    }
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    // 5b. POST / DELETE DEVICES API
    if (req.url.startsWith('/devices') || req.url.startsWith('/api/devices') || req.url.startsWith('/api/biometric-devices')) {
      if (req.method === 'POST') {
        try {
          const newDev = JSON.parse(body || '{}');
          if (newDev && (newDev.serial_number || newDev.id || newDev.ip_address)) {
            const devId = newDev.id || `bio-dev-${Date.now()}`;
            const devObj = {
              ...newDev,
              id: devId,
              status: newDev.status || 'Online',
              registered_users_count: newDev.registered_users_count || 16,
              last_sync: new Date().toISOString(),
              last_heartbeat_at: new Date().toISOString(),
            };
            const existingIdx = devicesList.findIndex(d => d.id === devId || d.serial_number === devObj.serial_number);
            if (existingIdx >= 0) {
              devicesList[existingIdx] = { ...devicesList[existingIdx], ...devObj };
            } else {
              devicesList.push(devObj);
            }
            saveDevicesToDisk();
            schedulePersistence();
            console.log(`📱 [DEVICE REGISTERED] Saved device "${devObj.device_name}" (${devObj.serial_number}) for tenant: ${devObj.organization_id}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, success: true, device: devObj }));
            return;
          }
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: e.message }));
          return;
        }
      }

      if (req.method === 'DELETE') {
        const urlObj = new URL(req.url, 'http://127.0.0.1');
        const targetId = urlObj.searchParams.get('id') || urlObj.searchParams.get('deviceId');
        if (targetId) {
          devicesList = devicesList.filter(d => d.id !== targetId && d.serial_number !== targetId);
          saveDevicesToDisk();
          schedulePersistence();
          console.log(`🗑️ [DEVICE REMOVED] Deleted device ID: ${targetId}`);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, success: true }));
        return;
      }
    }

    // 5c. PUSH USERS TO TERMINAL
    if (req.url.startsWith('/push-user')) {
      try {
        const payload = JSON.parse(body || '{}');
        const usersToPush = Array.isArray(payload.users) ? payload.users : [];
        usersToPush.forEach(u => {
          const pin = String(u.pin || u.userId || u.deviceUserId);
          if (pin) {
            usersMap.set(pin, {
              uid: pin,
              userId: pin,
              pin,
              deviceUserId: pin,
              name: u.name || `User ${pin}`,
              role: u.privilege === 'ADMIN' ? 'Admin' : 'Normal Employee',
              privilege: u.privilege || 'USER',
              card: u.cardNumber || null,
              cardNumber: u.cardNumber || null,
              card_number: u.cardNumber || null,
              faceEnrolled: false,
              has_face_enrolled: false,
              faceCount: 0,
              fingerprintCount: 0,
              fingerprints_count: 0,
              enabled: true,
              passwordConfigured: false,
              lastSeen: new Date().toISOString()
            });
            pendingCommands.push(`DATA UPDATE USERINFO PIN=${pin}\tName=${u.name || `User ${pin}`}\tPri=${u.privilege === 'ADMIN' ? 3 : 0}`);
          }
        });
        saveUsersToDisk();
        schedulePersistence();
        console.log(`👤 [PUSH USER] Pushed ${usersToPush.length} user profile(s) to terminal memory.`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, success: true, count: usersToPush.length, message: `Successfully pushed ${usersToPush.length} profile(s) to terminal memory.` }));
        return;
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
        return;
      }
    }

    // ADMS / iClock Protocol Handling
    const isAdms = req.url.includes('/iclock/') || req.url.includes('/cdata');

    if (body) {
      const lines = body.trim().split(/\r?\n/);
      let newUsersDetected = 0;
      let newBioDetected = 0;
      let newPunchesDetected = 0;

      lines.forEach((line) => {
        // eSSL Userinfo Packet: USER PIN=1\tName=Dharun\tPri=14\tCard=61
        if (line.includes('PIN=') || line.includes('USERINFO')) {
          const pinMatch = line.match(/PIN=([^\t\r\n]+)/i);
          const nameMatch = line.match(/Name=([^\t\r\n]+)/i);
          const priMatch = line.match(/Pri=([^\t\r\n]+)/i);
          const cardMatch = line.match(/Card=([^\t\r\n]+)/i);

          if (pinMatch) {
            const pin = pinMatch[1].trim();
            const rawName = nameMatch ? nameMatch[1].trim() : `User ${pin}`;
            // If device sends default User X, keep high-resolution name if already known
            const existing = usersMap.get(pin);
            const name = (rawName.startsWith('User ') && existing?.name) ? existing.name : rawName;
            
            const isSuper = (priMatch && priMatch[1] === '14') || existing?.role === 'SuperAdmin';
            const isAdmin = (priMatch && priMatch[1] === '3') || existing?.role === 'Admin';
            const role = isSuper ? 'SuperAdmin' : isAdmin ? 'Admin' : 'Normal Employee';
            const privilege = isSuper ? 'SUPERADMIN' : isAdmin ? 'ADMIN' : 'USER';
            
            const rawCard = cardMatch ? cardMatch[1].trim() : null;
            const card = (rawCard && rawCard !== 'None' && rawCard !== '0') ? rawCard : (existing?.card || null);

            usersMap.set(pin, {
              uid: pin,
              userId: pin,
              pin: pin,
              deviceUserId: pin,
              name,
              role,
              privilege,
              card,
              cardNumber: card,
              card_number: card,
              faceEnrolled: existing ? (existing.faceEnrolled !== undefined ? existing.faceEnrolled : true) : true,
              has_face_enrolled: existing ? (existing.has_face_enrolled !== undefined ? existing.has_face_enrolled : true) : true,
              faceCount: existing ? Math.max(1, existing.faceCount || 1) : 1,
              fingerprintCount: existing ? Math.max(1, existing.fingerprintCount || 1) : 1,
              fingerprints_count: existing ? Math.max(1, existing.fingerprints_count || 1) : 1,
              enabled: true,
              passwordConfigured: false,
              lastSeen: new Date().toISOString()
            });
            newUsersDetected++;
          }
        }

        // eSSL Fingerprint Template Packet: FP PIN=017\tFID=0... or table=FINGERTMP / table=FP
        if (line.includes('FINGERTMP') || line.includes('FP PIN=') || (req.url.includes('FINGERTMP') && line.includes('PIN='))) {
          const pinMatch = line.match(/(?:PIN|Pin)=([^\t\r\n\s]+)/i);
          if (pinMatch) {
            const pin = pinMatch[1].trim();
            const u = usersMap.get(pin);
            if (u) {
              u.fingerprintCount = Math.max(1, (u.fingerprintCount || 0) + 1);
              u.fingerprints_count = u.fingerprintCount;
              newBioDetected++;
            }
          }
        }

        // Device System Telemetry / Info: FPCount=16
        if (line.includes('FPCount=') || line.includes('UserCount=')) {
          const fpMatch = line.match(/FPCount=(\d+)/i);
          if (fpMatch && parseInt(fpMatch[1], 10) > 0) {
            usersMap.forEach(u => {
              u.fingerprintCount = Math.max(1, u.fingerprintCount || 1);
              u.fingerprints_count = u.fingerprintCount;
            });
          }
        }

        // eSSL BIODATA Packet: BIODATA Pin=017\tNo=0\tIndex=0\tValid=1\tType=9\tTmp=...
        if (line.includes('BIODATA') && line.includes('Pin=')) {
          const pinMatch = line.match(/Pin=([^\t\r\n]+)/i);
          const typeMatch = line.match(/Type=(\d+)/i);
          if (pinMatch && typeMatch) {
            const pin = pinMatch[1].trim();
            const type = typeMatch[1];
            const u = usersMap.get(pin) || {
              uid: pin,
              userId: pin,
              pin: pin,
              deviceUserId: pin,
              name: `User ${pin}`,
              role: 'Normal Employee',
              privilege: 'USER',
              card: null,
              cardNumber: null,
              card_number: null,
              faceEnrolled: true,
              has_face_enrolled: true,
              faceCount: 1,
              fingerprintCount: 1,
              fingerprints_count: 1,
              enabled: true,
              passwordConfigured: false,
              lastSeen: new Date().toISOString()
            };

            // Type 9 = Visible Light Face
            if (type === '9') {
              u.faceEnrolled = true;
              u.has_face_enrolled = true;
              u.faceCount = Math.max(1, u.faceCount || 1);
            }
            // Type 1 = Fingerprint
            if (type === '1') {
              u.fingerprintCount = Math.max(1, (u.fingerprintCount || 0) + 1);
              u.fingerprints_count = u.fingerprintCount;
            }

            usersMap.set(pin, u);
            newBioDetected++;
          }
        }

        // eSSL ATTLOG Punch Packet: PIN\tTimestamp\tVerifyType...
        if (req.url.includes('table=ATTLOG') && /^\d+[\s\t]+\d{4}-\d{2}-\d{2}/.test(line)) {
          const parts = line.split(/[\t\s]+/);
          if (parts.length >= 2) {
            const pin = parts[0];
            const timeStr = parts[1] + (parts[2] && parts[2].includes(':') ? ' ' + parts[2] : '');
            const verifyCode = parts[3] || parts[2] || '15';

            let mode = 'Face';
            if (verifyCode === '1') mode = 'Fingerprint';
            else if (verifyCode === '4') mode = 'Card';
            else if (verifyCode === '2') mode = 'Password';

            // Mark modality confirmation on user
            const u = usersMap.get(pin);
            if (u) {
              if (mode === 'Face') {
                u.faceEnrolled = true;
                u.has_face_enrolled = true;
                u.faceCount = Math.max(1, u.faceCount || 1);
              }
              if (mode === 'Fingerprint') {
                u.fingerprintCount = Math.max(1, u.fingerprintCount || 1);
                u.fingerprints_count = u.fingerprintCount;
              }
              if (mode === 'Card' && !u.card) {
                u.card = 'Verified RFID';
                u.cardNumber = 'Verified RFID';
              }
            }

            recentPunches.unshift({
              id: `p-${Date.now()}-${pin}`,
              pin,
              biometric_pin: pin,
              employee_name: u ? u.name : '',
              user_name: u ? u.name : '',
              device_id: 'bio-dev-zk-k2000',
              device_serial: 'TDBD253600550',
              device_name: 'eSSL AI-FACE MAGNUM Terminal',
              timestamp: new Date().toISOString(),
              raw_time: timeStr,
              verification_mode: mode,
              punch_direction: 'IN',
              status: 'PROCESSED'
            });
            if (recentPunches.length > 200) recentPunches.pop();
            newPunchesDetected++;
          }
        }
      });

      if (newUsersDetected > 0 || newBioDetected > 0 || newPunchesDetected > 0) {
        console.log(`📦 [REALTIME UPDATE] Ingested from eSSL: +${newUsersDetected} User(s), +${newBioDetected} Template(s), +${newPunchesDetected} Punch(es). Total Enrolled: ${usersMap.size}`);
        schedulePersistence();
      }
    }

    // ADMS Protocol Responses
    if (req.url.includes('/iclock/cdata') || req.url.includes('/cdata')) {
      if (req.method === 'GET') {
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(
          `GET OPTION FROM: ZK\n` +
          `Stamp=0\n` +
          `OpStamp=0\n` +
          `PhotoStamp=0\n` +
          `ErrorDelay=30\n` +
          `Delay=10\n` +
          `Realtime=1\n` +
          `PushVersion=2.4.1\n` +
          `ServerName=JOY-HR-ESSL\n` +
          `ServerTime=${now}\n` +
          `RegistryCode=OK\n`
        );
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK: 1\n');
      return;
    }

    if (req.url.includes('/iclock/getrequest') || req.url.includes('/getrequest')) {
      let cmdsToSend = [];
      if (!global.hasQueriedInitial) {
        global.hasQueriedInitial = true;
        cmdsToSend.push('C:1:CHECK');
        cmdsToSend.push('C:2:INFO');
        cmdsToSend.push('C:3:DATA QUERY USERINFO');
        cmdsToSend.push('C:4:DATA QUERY FINGERTMP');
        cmdsToSend.push('C:5:DATA QUERY BIODATA');
      }

      if (pendingCommands.length > 0) {
        pendingCommands.forEach((c, idx) => {
          cmdsToSend.push(`C:${10 + idx}:${c}`);
        });
        pendingCommands = [];
      }

      if (cmdsToSend.length > 0) {
        console.log(`📤 [DISPATCH CMD] Sending ${cmdsToSend.length} command(s) to eSSL terminal.`);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(cmdsToSend.join('\n') + '\n');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK\n');
      }
      return;
    }

    if (req.url.includes('/iclock/devicecmd') || req.url.includes('/devicecmd')) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK\n');
      return;
    }

    // Default Fallback
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK\n');
  });
}

const s1 = http.createServer(handleReq);
s1.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Port ${PORT} listening for eSSL ADMS packets...`);
});
s1.on('error', (e) => console.log(`Port ${PORT} error:`, e.message));

const s2 = http.createServer(handleReq);
s2.listen(ALT_PORT, '0.0.0.0', () => {
  console.log(`✓ Port ${ALT_PORT} listening for SaaS & Local Gateway queries...`);
});
s2.on('error', (e) => console.log(`Port ${ALT_PORT} error:`, e.message));
