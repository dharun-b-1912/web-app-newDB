-- supabase/migrations/20260911_108_biometric_verify_modes_and_adapters.sql
-- ============================================================================
-- JOY PeopleHR — Migration 108
-- BIOMETRIC VERIFY MODES LOOKUP, ADAPTER REGISTRY & OFFLINE QUEUE
-- ============================================================================
-- 1. Pure Schema-Agnostic Tenant Context Helpers (Safe for any Supabase instance)
-- 2. Standardized Biometric Verify Modes lookup table (eSSL ePushServer verified)
-- 3. Hardware Model Capability Registry (AiFace Magnum reference device)
-- 4. Offline Attendance Event Queue (Store-and-forward for factory LANs)
-- 5. RLS Policies & Tenant Isolation
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 0. SCHEMA-AGNOSTIC TENANT SYNCHRONIZATION & CONTEXT HELPERS
-- ============================================================================

-- Function to keep tenant_id and organization_id synchronized
CREATE OR REPLACE FUNCTION public.sync_biometric_tenant_identifiers()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.organization_id IS NOT NULL THEN
    NEW.tenant_id := NEW.organization_id;
  ELSIF NEW.organization_id IS NULL AND NEW.tenant_id IS NOT NULL THEN
    NEW.organization_id := NEW.tenant_id;
  ELSIF NEW.tenant_id IS NOT NULL AND NEW.organization_id IS NOT NULL AND NEW.tenant_id != NEW.organization_id THEN
    -- Force consistency if both provided
    NEW.organization_id := NEW.tenant_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Pure Schema-Agnostic Current Tenant ID helper function (no table dependencies)
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    nullif(current_setting('app.current_tenant_id', true), ''),
    (auth.jwt() -> 'user_metadata' ->> 'organization_id'),
    (auth.jwt() -> 'app_metadata' ->> 'organization_id'),
    (auth.jwt() ->> 'organization_id'),
    'org-joy-01'
  );
$$;

-- Pure Schema-Agnostic Current Org ID helper function (no table dependencies)
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS TEXT 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
  SELECT public.current_tenant_id();
$$;

GRANT EXECUTE ON FUNCTION public.sync_biometric_tenant_identifiers() TO anon, authenticated, service_role, public;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO anon, authenticated, service_role, public;
GRANT EXECUTE ON FUNCTION public.current_org_id() TO anon, authenticated, service_role, public;

-- ============================================================================
-- 1. BIOMETRIC VERIFY MODES LOOKUP TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.biometric_verify_modes (
    code INTEGER PRIMARY KEY,
    sdk_constant VARCHAR(64) NOT NULL,
    canonical_mode VARCHAR(64) NOT NULL,
    display_label VARCHAR(64) NOT NULL,
    category VARCHAR(32) NOT NULL DEFAULT 'BIOMETRIC', -- BIOMETRIC, CREDENTIAL, PROTOCOL
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed canonical verify modes derived directly from eSSL ePushServer schema & SDK specs
INSERT INTO public.biometric_verify_modes (code, sdk_constant, canonical_mode, display_label, category, description)
VALUES
    (1,   'VS_FP',         'FINGERPRINT',  'Fingerprint',        'BIOMETRIC',  'Biometric optical / capacitive fingerprint matching'),
    (2,   'VS_PIN',        'PIN',          'User PIN',           'CREDENTIAL', 'Terminal user numeric identification pin'),
    (3,   'VS_PWD',        'PASSWORD',     'Device Password',    'CREDENTIAL', 'Terminal numeric or alphanumeric password'),
    (4,   'VS_CARD',       'RFID_CARD',    'RFID / Proximity',   'CREDENTIAL', 'Mifare / EM / HID 125kHz or 13.56MHz contactless smartcard'),
    (15,  'VS_FACE',       'FACE',         'Facial Recognition', 'BIOMETRIC',  'Visible light / NIR 3D structured facial recognition (AiFace Magnum / SpeedFace)'),
    (25,  'VS_PALM',       'PALM',         'Palm Vein',          'BIOMETRIC',  'Near-infrared palm vein vascular verification'),
    (101, 'VS_EPUSH',      'EPUSH_SERVER', 'ePush Push Stream',  'PROTOCOL',   'Pushed asynchronously via eSSL ePushServer HTTP log listener'),
    (102, 'VS_DIRECT_TCP', 'DIRECT_TCP',   'Direct TCP SDK',     'PROTOCOL',   'Synchronized directly via Standalone TCP Port 4370 socket'),
    (200, 'VS_MOBILE_GPS', 'MOBILE_GEOFENCE','Mobile GPS Punch', 'CREDENTIAL', 'JOY PeopleHR mobile application with verified geofence location')
ON CONFLICT (code) DO UPDATE SET
    sdk_constant = EXCLUDED.sdk_constant,
    canonical_mode = EXCLUDED.canonical_mode,
    display_label = EXCLUDED.display_label,
    category = EXCLUDED.category,
    description = EXCLUDED.description;

-- Enable RLS on verify modes (read-only for authenticated and anon)
ALTER TABLE public.biometric_verify_modes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "biometric_verify_modes_read_policy" ON public.biometric_verify_modes;
CREATE POLICY "biometric_verify_modes_read_policy"
ON public.biometric_verify_modes FOR SELECT
TO authenticated, anon, service_role
USING (true);

-- ============================================================================
-- 2. HARDWARE MODEL CAPABILITY PROFILES REGISTRY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.biometric_device_profiles (
    id VARCHAR(64) PRIMARY KEY,
    vendor VARCHAR(64) NOT NULL,
    model_name VARCHAR(128) NOT NULL,
    default_port INTEGER NOT NULL DEFAULT 4370,
    default_comm_key INTEGER NOT NULL DEFAULT 0,
    supported_protocols TEXT[] NOT NULL DEFAULT ARRAY['TCP/IP', 'ADMS', 'WEB_SERVER'],
    supported_modalities TEXT[] NOT NULL DEFAULT ARRAY['FACE', 'FINGERPRINT', 'RFID_CARD', 'PASSWORD'],
    face_capacity INTEGER DEFAULT 1500,
    fingerprint_capacity INTEGER DEFAULT 5000,
    card_capacity INTEGER DEFAULT 10000,
    log_capacity INTEGER DEFAULT 200000,
    epush_compatible BOOLEAN NOT NULL DEFAULT true,
    epush_mandatory BOOLEAN NOT NULL DEFAULT false,
    recommended_connection_type VARCHAR(64) NOT NULL DEFAULT 'PUSH_ADMS',
    adapter_class VARCHAR(64) NOT NULL DEFAULT 'AiFaceMagnumAdapter',
    documentation_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.biometric_device_profiles (
    id, vendor, model_name, default_port, default_comm_key,
    supported_protocols, supported_modalities,
    face_capacity, fingerprint_capacity, card_capacity, log_capacity,
    epush_compatible, epush_mandatory, recommended_connection_type, adapter_class
)
VALUES
    ('essl-aiface-magnum', 'eSSL', 'AiFace Magnum', 4370, 0,
     ARRAY['TCP/IP', 'ADMS', 'WEB_SERVER', 'RS485', 'WIEGAND'],
     ARRAY['FACE', 'FINGERPRINT', 'RFID_CARD', 'PASSWORD'],
     1500, 5000, 10000, 200000,
     true, false, 'PUSH_ADMS', 'AiFaceMagnumAdapter'),

    ('zkteco-speedface-v5l', 'ZKTeco', 'SpeedFace-V5L', 4370, 0,
     ARRAY['TCP/IP', 'ADMS', 'WEB_SERVER', 'RS485', 'WIEGAND'],
     ARRAY['FACE', 'FINGERPRINT', 'RFID_CARD', 'PASSWORD', 'PALM'],
     6000, 10000, 10000, 200000,
     true, false, 'PUSH_ADMS', 'ZKTecoSpeedFaceAdapter'),

    ('essl-silkbio-101tc', 'eSSL', 'SilkBio-101TC', 4370, 0,
     ARRAY['TCP/IP', 'USB', 'RS485'],
     ARRAY['FACE', 'FINGERPRINT', 'RFID_CARD', 'PASSWORD'],
     2000, 3000, 10000, 100000,
     true, false, 'DIRECT_LAN', 'ESSLSilkBioAdapter'),

    ('essl-k30-pro', 'eSSL', 'K30 Pro', 4370, 0,
     ARRAY['TCP/IP', 'USB'],
     ARRAY['FINGERPRINT', 'RFID_CARD', 'PASSWORD'],
     0, 1000, 1000, 80000,
     true, false, 'DIRECT_LAN', 'ESSLBasicTCPAdapter'),

    ('mantra-mfs100', 'Mantra', 'MFS100 RD Service', 11100, 0,
     ARRAY['HTTP_RD_SERVICE', 'USB_OTG'],
     ARRAY['FINGERPRINT'],
     0, 0, 0, 0,
     false, false, 'DIRECT_LAN', 'MantraRDServiceAdapter')
ON CONFLICT (id) DO UPDATE SET
    vendor = EXCLUDED.vendor,
    model_name = EXCLUDED.model_name,
    default_port = EXCLUDED.default_port,
    default_comm_key = EXCLUDED.default_comm_key,
    supported_protocols = EXCLUDED.supported_protocols,
    supported_modalities = EXCLUDED.supported_modalities,
    face_capacity = EXCLUDED.face_capacity,
    fingerprint_capacity = EXCLUDED.fingerprint_capacity,
    card_capacity = EXCLUDED.card_capacity,
    log_capacity = EXCLUDED.log_capacity,
    epush_compatible = EXCLUDED.epush_compatible,
    epush_mandatory = EXCLUDED.epush_mandatory,
    recommended_connection_type = EXCLUDED.recommended_connection_type,
    adapter_class = EXCLUDED.adapter_class;

ALTER TABLE public.biometric_device_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "biometric_device_profiles_read_policy" ON public.biometric_device_profiles;
CREATE POLICY "biometric_device_profiles_read_policy"
ON public.biometric_device_profiles FOR SELECT
TO authenticated, anon, service_role
USING (true);

-- ============================================================================
-- 3. OFFLINE ATTENDANCE EVENT BUFFER & STORE-AND-FORWARD QUEUE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.biometric_offline_event_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    connector_id VARCHAR(64) NOT NULL,
    raw_payload JSONB NOT NULL,
    device_user_id VARCHAR(64) NOT NULL,
    punch_time TIMESTAMPTZ NOT NULL,
    verify_mode_code INTEGER NOT NULL DEFAULT 15,
    punch_hash VARCHAR(128) NOT NULL,
    sync_status VARCHAR(32) NOT NULL DEFAULT 'PENDING_UPLOAD' CHECK (sync_status IN ('PENDING_UPLOAD', 'PROCESSING', 'SYNCHRONIZED', 'FAILED_DUPLICATE', 'FAILED_ERROR')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_biometric_offline_queue_tenant_status 
ON public.biometric_offline_event_queue (tenant_id, sync_status);

CREATE INDEX IF NOT EXISTS idx_biometric_offline_queue_punch_hash 
ON public.biometric_offline_event_queue (punch_hash);

-- Multi-tenant consistency trigger
DROP TRIGGER IF EXISTS trg_biometric_offline_queue_tenant ON public.biometric_offline_event_queue;
CREATE TRIGGER trg_biometric_offline_queue_tenant
BEFORE INSERT OR UPDATE ON public.biometric_offline_event_queue
FOR EACH ROW EXECUTE FUNCTION public.sync_biometric_tenant_identifiers();

-- Enable RLS
ALTER TABLE public.biometric_offline_event_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "biometric_offline_queue_tenant_isolation" ON public.biometric_offline_event_queue;
CREATE POLICY "biometric_offline_queue_tenant_isolation"
ON public.biometric_offline_event_queue FOR ALL
TO authenticated, service_role
USING (
    tenant_id = public.current_tenant_id() 
    OR organization_id = public.current_tenant_id()
    OR auth.role() = 'service_role'
)
WITH CHECK (
    tenant_id = public.current_tenant_id() 
    OR organization_id = public.current_tenant_id()
    OR auth.role() = 'service_role'
);
