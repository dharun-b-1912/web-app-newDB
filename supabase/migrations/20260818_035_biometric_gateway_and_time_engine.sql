-- ============================================================================
-- Migration 035: WorkForceOS Enterprise Biometric Module & LAN Gateway Engine
-- Zero-Port Forwarding Outbound Tunnel, Terminals, Raw Punches & Shift Engine
-- ============================================================================

-- 1. Biometric Gateway Agents Table (On-Premises LAN Gateways)
CREATE TABLE IF NOT EXISTS biometric_gateway_agents (
  id TEXT PRIMARY KEY DEFAULT ('agent-' || gen_random_uuid()::TEXT),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  branch_name TEXT NOT NULL DEFAULT 'Main Campus',
  agent_name TEXT NOT NULL,
  pairing_key TEXT UNIQUE NOT NULL,
  api_token_hash TEXT,
  version TEXT DEFAULT '2.4.0-enterprise',
  os_platform TEXT DEFAULT 'Windows Server 2022',
  local_ip TEXT,
  public_ip TEXT,
  status TEXT DEFAULT 'ONLINE' CHECK (status IN ('ONLINE', 'OFFLINE', 'DEGRADED', 'PENDING_PAIRING')),
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  offline_buffer_count INTEGER DEFAULT 0,
  connected_devices_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bio_agents_org ON biometric_gateway_agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_bio_agents_status ON biometric_gateway_agents(status);

-- 2. Biometric Hardware Devices / Terminals Table
CREATE TABLE IF NOT EXISTS biometric_devices (
  id TEXT PRIMARY KEY DEFAULT ('bio-' || gen_random_uuid()::TEXT),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  gateway_agent_id TEXT REFERENCES biometric_gateway_agents(id) ON DELETE SET NULL,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('Facial Recognition', 'Fingerprint', 'RFID Card', 'Turnstile Gate', 'Iris Scanner', 'Multi-Modal')),
  vendor TEXT NOT NULL CHECK (vendor IN ('ZKTeco', 'Mantra', 'eSSL', 'Suprema', 'Matrix COSEC', 'Hikvision', 'Realtime')),
  model TEXT NOT NULL,
  serial_number TEXT UNIQUE NOT NULL,
  ip_address TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 4370,
  location_description TEXT NOT NULL,
  status TEXT DEFAULT 'Online' CHECK (status IN ('Online', 'Offline', 'Syncing', 'Maintenance')),
  last_sync TIMESTAMPTZ DEFAULT NOW(),
  last_event_at TIMESTAMPTZ,
  registered_users_count INTEGER DEFAULT 0,
  sync_frequency_mins INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bio_devices_org ON biometric_devices(organization_id);
CREATE INDEX IF NOT EXISTS idx_bio_devices_agent ON biometric_devices(gateway_agent_id);

-- 3. Raw Punch Ingestion Log (Sub-Second Ingestion Stream)
CREATE TABLE IF NOT EXISTS biometric_raw_punches (
  id TEXT PRIMARY KEY DEFAULT ('punch-' || gen_random_uuid()::TEXT),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  device_id TEXT REFERENCES biometric_devices(id) ON DELETE SET NULL,
  device_serial TEXT NOT NULL,
  biometric_pin TEXT NOT NULL,
  employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  employee_name TEXT,
  punch_time TIMESTAMPTZ NOT NULL,
  verification_mode TEXT DEFAULT 'Fingerprint' CHECK (verification_mode IN ('Fingerprint', 'Face', 'Card', 'Password', 'Manual', 'GPS')),
  punch_direction TEXT DEFAULT 'AUTO' CHECK (punch_direction IN ('IN', 'OUT', 'AUTO', 'BREAK_OUT', 'BREAK_IN')),
  source_type TEXT DEFAULT 'LAN_AGENT' CHECK (source_type IN ('LAN_AGENT', 'OFFLINE_BUFFER', 'USB_SCANNER', 'CLOUD_WEBHOOK', 'MANUAL_IMPORT')),
  dedup_hash TEXT UNIQUE NOT NULL,
  processed_status TEXT DEFAULT 'PROCESSED' CHECK (processed_status IN ('PROCESSED', 'PENDING', 'DEDUPLICATED_IGNORED', 'UNRESOLVED_PIN', 'FAILED')),
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  shift_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bio_punches_org_time ON biometric_raw_punches(organization_id, punch_time);
CREATE INDEX IF NOT EXISTS idx_bio_punches_emp ON biometric_raw_punches(employee_id);
CREATE INDEX IF NOT EXISTS idx_bio_punches_dedup ON biometric_raw_punches(dedup_hash);

-- 4. Employee Biometric PIN Mappings Table
CREATE TABLE IF NOT EXISTS biometric_pin_mappings (
  id TEXT PRIMARY KEY DEFAULT ('pin-' || gen_random_uuid()::TEXT),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  biometric_pin TEXT NOT NULL,
  rfid_card_number TEXT,
  fingerprint_enrolled BOOLEAN DEFAULT FALSE,
  face_enrolled BOOLEAN DEFAULT FALSE,
  synced_to_terminals BOOLEAN DEFAULT TRUE,
  last_enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bio_pin_org ON biometric_pin_mappings(organization_id);
CREATE INDEX IF NOT EXISTS idx_bio_pin_lookup ON biometric_pin_mappings(biometric_pin);
