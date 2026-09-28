-- supabase/migrations/20260923_140_purchase_order_to_invoice_workflow.sql
-- ============================================================================
-- Joy PeopleHR — Complete Purchase Order → Invoice Procure-to-Pay Ecosystem
-- Migration: 20260923_140_purchase_order_to_invoice_workflow.sql
-- Description: Creates purchase_orders, purchase_order_items, purchase_order_revisions,
--              purchase_order_approvals, and augments vendor_invoices for 3-way match.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Purchase Orders Master Table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vendor_id           UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  relationship_id     UUID REFERENCES public.vendor_relationships(id) ON DELETE SET NULL,
  po_number           TEXT NOT NULL,
  contract_reference  TEXT,
  service_period      TEXT NOT NULL,
  po_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_from          DATE,
  valid_until         DATE,
  currency            TEXT DEFAULT 'INR',
  payment_terms       TEXT DEFAULT 'Net 30',
  delivery_location   TEXT,
  cost_center         TEXT,
  department          TEXT,
  requesting_manager  TEXT,
  subtotal_amount     NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  discount_amount     NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  taxable_amount      NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  tax_amount          NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  grand_total         NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  status              TEXT NOT NULL DEFAULT 'DRAFT' CHECK (
    status IN (
      'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT_TO_VENDOR', 
      'VENDOR_VIEWED', 'ACKNOWLEDGED', 'ACCEPTED', 'PARTIALLY_FULFILLED', 
      'FULFILLED', 'CHANGE_REQUESTED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'CLOSED'
    )
  ),
  vendor_response_note TEXT,
  vendor_responded_at TIMESTAMPTZ,
  notes               TEXT,
  created_by          UUID,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_po_number_org UNIQUE (organization_id, po_number)
);

-- Safe Column Augmentation
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS contract_reference TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS vendor_response_note TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS vendor_responded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_po_org ON public.purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_po_vendor ON public.purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_number ON public.purchase_orders(po_number);

-- 2. Purchase Order Line Items Table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id               UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  description         TEXT NOT NULL,
  category            TEXT DEFAULT 'MANPOWER_SERVICES',
  quantity            NUMERIC(12, 2) NOT NULL DEFAULT 1.00,
  unit                TEXT DEFAULT 'HOURS',
  unit_price          NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount_pct        NUMERIC(5, 2) DEFAULT 0.00,
  tax_rate_pct        NUMERIC(5, 2) DEFAULT 18.00,
  line_total          NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  service_period      TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_items_poid ON public.purchase_order_items(po_id);

-- 3. Purchase Order Revisions & Vendor Change Requests Table
CREATE TABLE IF NOT EXISTS public.purchase_order_revisions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id               UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  revision_number     INT NOT NULL DEFAULT 1,
  change_category     TEXT NOT NULL,
  change_description  TEXT NOT NULL,
  requested_by_type   TEXT NOT NULL DEFAULT 'VENDOR' CHECK (requested_by_type IN ('COMPANY', 'VENDOR')),
  actor_name          TEXT NOT NULL,
  previous_snapshot   JSONB DEFAULT '{}'::jsonb,
  status              TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_revisions_poid ON public.purchase_order_revisions(po_id);

-- 4. Purchase Order Approvals Trail Table
CREATE TABLE IF NOT EXISTS public.purchase_order_approvals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id               UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  approver_id         UUID,
  approver_name       TEXT NOT NULL,
  approver_role       TEXT NOT NULL,
  action              TEXT NOT NULL CHECK (action IN ('APPROVED', 'REJECTED', 'DELEGATED')),
  comments            TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_approvals_poid ON public.purchase_order_approvals(po_id);

-- 5. Augment vendor_invoices with po_id and 3-way match metadata
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS po_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL;
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS matching_status TEXT DEFAULT 'NOT_MATCHED';
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS line_match_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS quantity_variance NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS rate_variance NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.vendor_invoices ADD COLUMN IF NOT EXISTS tax_variance NUMERIC(12, 2) DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_vinvoices_poid ON public.vendor_invoices(po_id);

-- 6. Configure RLS Policies
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users access purchase_orders" ON public.purchase_orders;
CREATE POLICY "Authenticated users access purchase_orders" ON public.purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users access purchase_order_items" ON public.purchase_order_items;
CREATE POLICY "Authenticated users access purchase_order_items" ON public.purchase_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users access purchase_order_revisions" ON public.purchase_order_revisions;
CREATE POLICY "Authenticated users access purchase_order_revisions" ON public.purchase_order_revisions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users access purchase_order_approvals" ON public.purchase_order_approvals;
CREATE POLICY "Authenticated users access purchase_order_approvals" ON public.purchase_order_approvals FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;
