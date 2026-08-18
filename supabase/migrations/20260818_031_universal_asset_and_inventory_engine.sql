-- ============================================================================
-- Migration 031: WorkForceOS Universal Asset & Inventory Management Engine
-- Multi-Industry Asset Lifecycle, Custom Attributes, Stock, Maintenance & Audit
-- ============================================================================

-- 1. Industry Profiles Table
CREATE TABLE IF NOT EXISTS industry_profiles (
  id TEXT PRIMARY KEY DEFAULT ('ind-' || gen_random_uuid()::text),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  recommended_categories TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Location Types Table
CREATE TABLE IF NOT EXISTS location_types (
  id TEXT PRIMARY KEY DEFAULT ('loctyp-' || gen_random_uuid()::text),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id TEXT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE location_types ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE location_types ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE location_types ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE location_types ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE location_types ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE location_types ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_loc_types_org ON location_types(organization_id);

-- 3. Locations Table (Extending pre-existing initial schema table safely)
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY DEFAULT ('loc-' || gen_random_uuid()::text),
  branch_id TEXT,
  name TEXT NOT NULL,
  building TEXT,
  address TEXT
);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS legal_entity_id TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS parent_location_id TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS location_type_code TEXT DEFAULT 'FACILITY';
ALTER TABLE locations ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_locations_org ON locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_location_id);

-- 4. Universal Asset Categories Table
CREATE TABLE IF NOT EXISTS asset_categories (
  id TEXT PRIMARY KEY DEFAULT ('ast-cat-' || gen_random_uuid()::text),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id TEXT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE asset_categories ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE asset_categories ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE asset_categories ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE asset_categories ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE asset_categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE asset_categories ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE asset_categories ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
ALTER TABLE asset_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE asset_categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_ast_cat_org ON asset_categories(organization_id);

-- 5. Asset Types Master Table
CREATE TABLE IF NOT EXISTS asset_types (
  id TEXT PRIMARY KEY DEFAULT ('ast-type-' || gen_random_uuid()::text),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id TEXT,
  category_id TEXT REFERENCES asset_categories(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  asset_class TEXT NOT NULL DEFAULT 'TRACKED_ASSET'
    CHECK (asset_class IN (
      'FIXED_ASSET',
      'TRACKED_ASSET',
      'INVENTORY_ITEM',
      'CONSUMABLE',
      'EQUIPMENT',
      'MACHINE',
      'TOOL',
      'VEHICLE',
      'DIGITAL_ASSET',
      'LICENSE',
      'PROPERTY',
      'FACILITY_RESOURCE'
    )),
  tracking_mode TEXT NOT NULL DEFAULT 'INDIVIDUAL'
    CHECK (tracking_mode IN (
      'INDIVIDUAL',
      'SERIAL_NUMBER',
      'BATCH',
      'QUANTITY',
      'METER',
      'LICENSE',
      'LOCATION_ONLY'
    )),
  serial_required BOOLEAN DEFAULT FALSE,
  barcode_required BOOLEAN DEFAULT FALSE,
  qr_required BOOLEAN DEFAULT TRUE,
  employee_assignable BOOLEAN DEFAULT TRUE,
  location_assignable BOOLEAN DEFAULT TRUE,
  vendor_assignable BOOLEAN DEFAULT FALSE,
  maintenance_enabled BOOLEAN DEFAULT FALSE,
  warranty_enabled BOOLEAN DEFAULT TRUE,
  depreciation_enabled BOOLEAN DEFAULT FALSE,
  meter_tracking_enabled BOOLEAN DEFAULT FALSE,
  expiry_enabled BOOLEAN DEFAULT FALSE,
  batch_tracking_enabled BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS category_id TEXT;
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS asset_class TEXT DEFAULT 'TRACKED_ASSET';
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS tracking_mode TEXT DEFAULT 'INDIVIDUAL';
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS serial_required BOOLEAN DEFAULT FALSE;
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS barcode_required BOOLEAN DEFAULT FALSE;
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS qr_required BOOLEAN DEFAULT TRUE;
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS employee_assignable BOOLEAN DEFAULT TRUE;
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS location_assignable BOOLEAN DEFAULT TRUE;
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS vendor_assignable BOOLEAN DEFAULT FALSE;
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS maintenance_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS warranty_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS depreciation_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS meter_tracking_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS expiry_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS batch_tracking_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_ast_types_org ON asset_types(organization_id);

-- 6. Custom Attribute Definitions & Values Tables
CREATE TABLE IF NOT EXISTS asset_attribute_definitions (
  id TEXT PRIMARY KEY DEFAULT ('ast-attr-def-' || gen_random_uuid()::text),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id TEXT,
  asset_type_code TEXT NOT NULL,
  field_code TEXT NOT NULL,
  field_label TEXT NOT NULL,
  data_type TEXT NOT NULL DEFAULT 'TEXT'
    CHECK (data_type IN ('TEXT', 'NUMBER', 'DECIMAL', 'DATE', 'BOOLEAN', 'DROPDOWN', 'MULTI_SELECT', 'CURRENCY', 'MEASUREMENT')),
  is_required BOOLEAN DEFAULT FALSE,
  options TEXT[],
  unit_of_measure TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE asset_attribute_definitions ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE asset_attribute_definitions ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE asset_attribute_definitions ADD COLUMN IF NOT EXISTS asset_type_code TEXT;
ALTER TABLE asset_attribute_definitions ADD COLUMN IF NOT EXISTS field_code TEXT;
ALTER TABLE asset_attribute_definitions ADD COLUMN IF NOT EXISTS field_label TEXT;
ALTER TABLE asset_attribute_definitions ADD COLUMN IF NOT EXISTS data_type TEXT DEFAULT 'TEXT';
ALTER TABLE asset_attribute_definitions ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT FALSE;
ALTER TABLE asset_attribute_definitions ADD COLUMN IF NOT EXISTS options TEXT[];
ALTER TABLE asset_attribute_definitions ADD COLUMN IF NOT EXISTS unit_of_measure TEXT;
ALTER TABLE asset_attribute_definitions ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
ALTER TABLE asset_attribute_definitions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_ast_attr_def_org ON asset_attribute_definitions(organization_id);

CREATE TABLE IF NOT EXISTS asset_attribute_values (
  id TEXT PRIMARY KEY DEFAULT ('ast-attr-val-' || gen_random_uuid()::text),
  asset_id TEXT NOT NULL,
  attribute_def_id TEXT REFERENCES asset_attribute_definitions(id) ON DELETE CASCADE,
  field_code TEXT NOT NULL,
  value_text TEXT,
  value_number NUMERIC,
  value_date DATE,
  value_boolean BOOLEAN,
  value_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE asset_attribute_values ADD COLUMN IF NOT EXISTS asset_id TEXT;
ALTER TABLE asset_attribute_values ADD COLUMN IF NOT EXISTS attribute_def_id TEXT;
ALTER TABLE asset_attribute_values ADD COLUMN IF NOT EXISTS field_code TEXT;
ALTER TABLE asset_attribute_values ADD COLUMN IF NOT EXISTS value_text TEXT;
ALTER TABLE asset_attribute_values ADD COLUMN IF NOT EXISTS value_number NUMERIC;
ALTER TABLE asset_attribute_values ADD COLUMN IF NOT EXISTS value_date DATE;
ALTER TABLE asset_attribute_values ADD COLUMN IF NOT EXISTS value_boolean BOOLEAN;
ALTER TABLE asset_attribute_values ADD COLUMN IF NOT EXISTS value_json JSONB;
ALTER TABLE asset_attribute_values ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_ast_attr_val_asset ON asset_attribute_values(asset_id);

-- 7. Universal Assets Master Table
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY DEFAULT ('ast-' || gen_random_uuid()::text),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id TEXT,
  legal_entity_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  location_id TEXT REFERENCES locations(id) ON DELETE SET NULL,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  asset_category_code TEXT NOT NULL DEFAULT 'IT_HARDWARE',
  asset_type_code TEXT NOT NULL DEFAULT 'LAPTOP',
  asset_code TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  asset_class TEXT NOT NULL DEFAULT 'TRACKED_ASSET'
    CHECK (asset_class IN (
      'FIXED_ASSET',
      'TRACKED_ASSET',
      'INVENTORY_ITEM',
      'CONSUMABLE',
      'EQUIPMENT',
      'MACHINE',
      'TOOL',
      'VEHICLE',
      'DIGITAL_ASSET',
      'LICENSE',
      'PROPERTY',
      'FACILITY_RESOURCE'
    )),
  tracking_mode TEXT NOT NULL DEFAULT 'INDIVIDUAL'
    CHECK (tracking_mode IN (
      'INDIVIDUAL',
      'SERIAL_NUMBER',
      'BATCH',
      'QUANTITY',
      'METER',
      'LICENSE',
      'LOCATION_ONLY'
    )),
  status TEXT NOT NULL DEFAULT 'AVAILABLE'
    CHECK (status IN (
      'PLANNED',
      'ORDERED',
      'RECEIVED',
      'INSPECTION',
      'AVAILABLE',
      'ASSIGNED',
      'IN_USE',
      'TRANSFER_PENDING',
      'UNDER_MAINTENANCE',
      'IN_REPAIR',
      'LOST',
      'DAMAGED',
      'DISPOSE_PENDING',
      'DISPOSED',
      'RETIRED'
    )),
  condition TEXT NOT NULL DEFAULT 'GOOD'
    CHECK (condition IN ('NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED', 'CRITICAL')),
  serial_number TEXT,
  barcode TEXT,
  qr_code TEXT,
  manufacturer TEXT,
  model TEXT,
  description TEXT,
  purchase_date DATE,
  purchase_price NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  vendor_id TEXT,
  warranty_start DATE,
  warranty_end DATE,
  custodian_id TEXT,
  custodian_name TEXT,
  employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  book_value NUMERIC(12,2),
  depreciation_method TEXT DEFAULT 'STRAIGHT_LINE'
    CHECK (depreciation_method IN ('STRAIGHT_LINE', 'DECLINING_BALANCE', 'CUSTOM', 'NONE')),
  useful_life_months INT DEFAULT 36,
  salvage_value NUMERIC(12,2) DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  retired_at TIMESTAMPTZ
);

ALTER TABLE assets ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS legal_entity_id TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS location_id TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS department_id TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS asset_category_code TEXT DEFAULT 'IT_HARDWARE';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS asset_type_code TEXT DEFAULT 'LAPTOP';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS asset_code TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS asset_name TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS asset_class TEXT DEFAULT 'TRACKED_ASSET';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS tracking_mode TEXT DEFAULT 'INDIVIDUAL';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'AVAILABLE';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'GOOD';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS serial_number TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS purchase_date DATE;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12,2) DEFAULT 0;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS vendor_id TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS warranty_start DATE;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS warranty_end DATE;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS custodian_id TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS custodian_name TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS book_value NUMERIC(12,2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS depreciation_method TEXT DEFAULT 'STRAIGHT_LINE';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS useful_life_months INT DEFAULT 36;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS salvage_value NUMERIC(12,2) DEFAULT 0;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE assets ADD COLUMN IF NOT EXISTS retired_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_assets_org ON assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_assets_code ON assets(asset_code);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type_code);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_custodian ON assets(custodian_id);
CREATE INDEX IF NOT EXISTS idx_assets_emp ON assets(employee_id);

-- 8. Asset Assignments Table
CREATE TABLE IF NOT EXISTS asset_assignments (
  id TEXT PRIMARY KEY DEFAULT ('ast-asgn-' || gen_random_uuid()::text),
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL DEFAULT 'EMPLOYEE'
    CHECK (target_type IN ('EMPLOYEE', 'DEPARTMENT', 'BRANCH', 'PROJECT', 'SITE', 'WAREHOUSE', 'VEHICLE', 'VENDOR_WORKER')),
  target_id TEXT NOT NULL,
  target_name TEXT NOT NULL,
  assigned_by_id TEXT NOT NULL,
  assigned_by_name TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expected_return_date DATE,
  actual_return_date TIMESTAMPTZ,
  condition_at_assign TEXT DEFAULT 'GOOD',
  condition_at_return TEXT,
  purpose TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'RETURNED', 'TRANSFER_REQUESTED', 'OVERDUE'))
);
ALTER TABLE asset_assignments ADD COLUMN IF NOT EXISTS asset_id TEXT;
ALTER TABLE asset_assignments ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'EMPLOYEE';
ALTER TABLE asset_assignments ADD COLUMN IF NOT EXISTS target_id TEXT;
ALTER TABLE asset_assignments ADD COLUMN IF NOT EXISTS target_name TEXT;
ALTER TABLE asset_assignments ADD COLUMN IF NOT EXISTS assigned_by_id TEXT;
ALTER TABLE asset_assignments ADD COLUMN IF NOT EXISTS assigned_by_name TEXT;
ALTER TABLE asset_assignments ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE asset_assignments ADD COLUMN IF NOT EXISTS expected_return_date DATE;
ALTER TABLE asset_assignments ADD COLUMN IF NOT EXISTS actual_return_date TIMESTAMPTZ;
ALTER TABLE asset_assignments ADD COLUMN IF NOT EXISTS condition_at_assign TEXT DEFAULT 'GOOD';
ALTER TABLE asset_assignments ADD COLUMN IF NOT EXISTS condition_at_return TEXT;
ALTER TABLE asset_assignments ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE asset_assignments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE asset_assignments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_ast_asgn_asset ON asset_assignments(asset_id);
CREATE INDEX IF NOT EXISTS idx_ast_asgn_target ON asset_assignments(target_type, target_id);

-- 9. Asset Transfers Table
CREATE TABLE IF NOT EXISTS asset_transfers (
  id TEXT PRIMARY KEY DEFAULT ('ast-trf-' || gen_random_uuid()::text),
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  source_target_type TEXT NOT NULL,
  source_target_id TEXT NOT NULL,
  source_target_name TEXT NOT NULL,
  destination_target_type TEXT NOT NULL,
  destination_target_id TEXT NOT NULL,
  destination_target_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'REQUESTED'
    CHECK (status IN ('REQUESTED', 'APPROVED', 'DISPATCHED', 'RECEIVED', 'CANCELLED')),
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  dispatch_notes TEXT,
  receipt_notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE asset_transfers ADD COLUMN IF NOT EXISTS asset_id TEXT;
ALTER TABLE asset_transfers ADD COLUMN IF NOT EXISTS source_target_type TEXT;
ALTER TABLE asset_transfers ADD COLUMN IF NOT EXISTS source_target_id TEXT;
ALTER TABLE asset_transfers ADD COLUMN IF NOT EXISTS source_target_name TEXT;
ALTER TABLE asset_transfers ADD COLUMN IF NOT EXISTS destination_target_type TEXT;
ALTER TABLE asset_transfers ADD COLUMN IF NOT EXISTS destination_target_id TEXT;
ALTER TABLE asset_transfers ADD COLUMN IF NOT EXISTS destination_target_name TEXT;
ALTER TABLE asset_transfers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'REQUESTED';
ALTER TABLE asset_transfers ADD COLUMN IF NOT EXISTS requested_by TEXT;
ALTER TABLE asset_transfers ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE asset_transfers ADD COLUMN IF NOT EXISTS dispatch_notes TEXT;
ALTER TABLE asset_transfers ADD COLUMN IF NOT EXISTS receipt_notes TEXT;
ALTER TABLE asset_transfers ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE asset_transfers ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ast_trf_asset ON asset_transfers(asset_id);

-- 10. Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY DEFAULT ('inv-itm-' || gen_random_uuid()::text),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id TEXT,
  category_code TEXT NOT NULL,
  sku TEXT NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  unit_of_measure TEXT NOT NULL DEFAULT 'PCS',
  quantity_on_hand INT NOT NULL DEFAULT 0,
  quantity_reserved INT NOT NULL DEFAULT 0,
  quantity_damaged INT NOT NULL DEFAULT 0,
  reorder_level INT NOT NULL DEFAULT 10,
  max_stock_level INT DEFAULT 100,
  unit_cost NUMERIC(10,2) DEFAULT 0,
  preferred_vendor_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS category_code TEXT DEFAULT 'CONSUMABLES';
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS item_name TEXT;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS unit_of_measure TEXT DEFAULT 'PCS';
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS quantity_on_hand INT DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS quantity_reserved INT DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS quantity_damaged INT DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS reorder_level INT DEFAULT 10;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS max_stock_level INT DEFAULT 100;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(10,2) DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS preferred_vendor_id TEXT;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_inv_items_org ON inventory_items(organization_id);

-- 11. Inventory Transactions Table
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id TEXT PRIMARY KEY DEFAULT ('inv-tx-' || gen_random_uuid()::text),
  inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL
    CHECK (transaction_type IN ('STOCK_IN', 'STOCK_OUT', 'CONSUMPTION', 'ADJUSTMENT', 'TRANSFER', 'DAMAGE', 'RETURN')),
  quantity INT NOT NULL,
  balance_after INT NOT NULL,
  unit_cost NUMERIC(10,2),
  reference_id TEXT,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_tx_item ON inventory_transactions(inventory_item_id);

-- 12. Asset Maintenance Records Table
CREATE TABLE IF NOT EXISTS asset_maintenance_records (
  id TEXT PRIMARY KEY DEFAULT ('ast-mnt-' || gen_random_uuid()::text),
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL
    CHECK (maintenance_type IN ('PREVENTIVE', 'CORRECTIVE', 'INSPECTION', 'CALIBRATION', 'REPAIR', 'METER_BASED')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'SCHEDULED'
    CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE')),
  scheduled_date DATE NOT NULL,
  performed_date TIMESTAMPTZ,
  technician_name TEXT,
  vendor_name TEXT,
  cost NUMERIC(10,2) DEFAULT 0,
  meter_reading_at_service NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ast_mnt_asset ON asset_maintenance_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_ast_mnt_status ON asset_maintenance_records(status);

-- 13. Asset Audit Logs Table
CREATE TABLE IF NOT EXISTS asset_audit_logs (
  id TEXT PRIMARY KEY DEFAULT ('ast-aud-' || gen_random_uuid()::text),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id TEXT,
  asset_id TEXT REFERENCES assets(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL
    CHECK (action IN (
      'CREATED',
      'UPDATED',
      'ASSIGNED',
      'RETURNED',
      'TRANSFERRED',
      'MAINTENANCE_STARTED',
      'MAINTENANCE_COMPLETED',
      'INSPECTED',
      'DAMAGED',
      'DISPOSED',
      'RETIRED',
      'STOCK_IN',
      'STOCK_OUT',
      'STOCK_ADJUSTED'
    )),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE asset_audit_logs ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE asset_audit_logs ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE INDEX IF NOT EXISTS idx_ast_aud_org ON asset_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ast_aud_asset ON asset_audit_logs(asset_id);

-- ============================================================================
-- SQL Aggregation Views
-- ============================================================================

DROP VIEW IF EXISTS v_asset_summary CASCADE;
CREATE OR REPLACE VIEW v_asset_summary AS
SELECT
  a.id AS asset_id,
  COALESCE(a.organization_id, a.tenant_id, 'org-joy-01') AS organization_id,
  a.asset_code,
  a.asset_name,
  a.asset_class,
  a.asset_category_code,
  a.asset_type_code,
  a.tracking_mode,
  a.status,
  a.condition,
  a.serial_number,
  a.qr_code,
  a.custodian_name,
  a.employee_id,
  a.location_id,
  a.purchase_price,
  a.warranty_end,
  a.created_at
FROM assets a;

DROP VIEW IF EXISTS v_inventory_stock_summary CASCADE;
CREATE OR REPLACE VIEW v_inventory_stock_summary AS
SELECT
  i.id AS item_id,
  COALESCE(i.organization_id, i.tenant_id, 'org-joy-01') AS organization_id,
  i.sku,
  i.item_name,
  i.category_code,
  i.quantity_on_hand,
  i.quantity_reserved,
  i.quantity_damaged,
  (COALESCE(i.quantity_on_hand, 0) - COALESCE(i.quantity_reserved, 0) - COALESCE(i.quantity_damaged, 0)) AS quantity_available,
  i.reorder_level,
  CASE
    WHEN (COALESCE(i.quantity_on_hand, 0) - COALESCE(i.quantity_reserved, 0) - COALESCE(i.quantity_damaged, 0)) <= COALESCE(i.reorder_level, 0) THEN TRUE
    ELSE FALSE
  END AS is_low_stock
FROM inventory_items i;
