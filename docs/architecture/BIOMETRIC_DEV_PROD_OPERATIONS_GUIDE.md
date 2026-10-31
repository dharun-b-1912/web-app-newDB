# JOY PeopleHR — Biometric Engine: Complete Dev & Production Operations Manual

---

## 1. Architecture Overview

```
                                 +---------------------------------------+
                                 |         JOY PeopleHR Frontend         |
                                 |  (React 19 / Vite / Modern UI System) |
                                 +---------------------------------------+
                                                     |
                                   REST API / Event Bus / WebSockets
                                                     |
                                                     v
                                 +---------------------------------------+
                                 |    WorkForceOS Biometric Gateway      |
                                 | (Node.js Daemon / Port 11108 & 8080)  |
                                 +---------------------------------------+
                                           /                  \
                                          /                    \
              Direct TCP Socket (Port 4370)                     ADMS Cloud Push (Port 8080)
            [Immediate Real-Time Commands]                    [Push-based Live Events / Logs]
                                        \                        /
                                         \                      /
                                  +------------------------------------+
                                  |    Physical Biometric Terminal     |
                                  |   (eSSL AiFace Magnum / ZKTeco)    |
                                  |       IP: 192.168.1.201:4370       |
                                  +------------------------------------+
```

---

## 2. Development Mode Setup (`DEV`)

### Fast Start (Single Command)
Run both the Vite dev server and the Biometric Gateway daemon simultaneously:
```bash
npm run dev:all
```

### Individual Service Commands
If running in separate terminals:
1. **Frontend Server**:
   ```bash
   npm run dev
   # Runs on http://localhost:3000
   ```
2. **Biometric Gateway Daemon**:
   ```bash
   npm run gateway
   # Listens on Port 11108 (REST API) and Port 8080 (ADMS Push Receiver)
   ```

---

## 3. Production Deployment Setup (`PRODUCTION`)

### Method A: PM2 Enterprise Process Manager (Recommended)
PM2 ensures auto-restart on crashes, zero-downtime reloads, and managed log rotation.
```bash
# 1. Build the production web bundle
npm run build

# 2. Start PM2 cluster with ecosystem configuration
npx pm2 start ecosystem.config.cjs

# 3. Save PM2 state for system boot
npx pm2 save
npx pm2 startup
```

### Method B: Docker & Docker Compose
```bash
# Start Web App + Biometric Ingestion Gateway in containerized mode
docker-compose -f docker-compose.biometric.yml up -d --build
```

### Method C: On-Premises Windows Gateway Service
For on-premises gateway host PCs located in the same LAN as turnstiles and biometric sensors:
1. Run `scripts/install-gateway-service.bat` or configure it as a Windows Startup Task.
2. The daemon binds to `0.0.0.0:11108` and `0.0.0.0:8080` automatically.

### Method D: Linux systemd Service
```bash
sudo cp scripts/workforce-gateway.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable workforce-gateway
sudo systemctl start workforce-gateway
```

---

## 4. Hardware Configuration Guide (eSSL AiFace Magnum)

To configure the physical terminal to talk directly to the Gateway & Cloud:

| Setting Screen | Menu Path | Recommended Production Setting |
| :--- | :--- | :--- |
| **Cloud Server (ADMS)** | `Menu -> Comm. -> Cloud Server` | **Server Address**: `192.168.1.46` (Host PC / Server IP)<br>**Server Port**: `8080`<br>**Enable Domain**: `OFF`<br>**Push Version**: `2.4.1` |
| **Ethernet / Wi-Fi** | `Menu -> Comm. -> Ethernet` | **IP Address**: `192.168.1.201`<br>**Subnet Mask**: `255.255.255.0`<br>**Gateway**: `192.168.1.1` |
| **Comm Password / Key** | `Menu -> Comm. -> PC Connection` | **Comm Key**: `123456` (or `0` for default open) |
| **Tamper Alarm** | `Menu -> System -> Security Settings` | Set **Tamper Alarm** to `OFF` while handheld or mount securely to wall plate. |
| **Wiegand Setup** | `Menu -> Comm. -> Wiegand Setup` | **Wiegand Format**: `Wiegand 26` or `Wiegand 34`<br>**Direction Mode**: `In` for Entry, `Out` for Exit turnstiles. |

---

## 5. Daily Operations & Troubleshooting

1. **Push Employee Directory to Hardware**:
   - In JOY PeopleHR: Go to **Clocking & Devices -> Biometric Devices -> [Select Device]**.
   - Click **Push Employees to Device**. The gateway connects over raw TCP (Port 4370) and seeds employee names, PINs, and roles into terminal memory.

2. **Sync Machine Users & Deletion Propagation**:
   - Click **Sync from Device**.
   - If an employee profile was deleted on the physical machine, it is cleanly evicted from active device users and logged to the audit trail (`REMOVED_FROM_MACHINE`).

3. **Factory Wipe RAM & Admin Unlock**:
   - If the terminal M/OK menu is locked: Click **Unlock Terminal Admin**.
   - To factory reset device user memory: Click **Wipe Device Memory**.
