-- ============================================================================
-- supabase/migrations/20260929_146_multitenant_payroll_template_and_deductions_engine.sql
-- Joy PeopleHR — Multi-Tenant Company & Vendor Payroll Template Engine v2.2
-- Dedicated Multi-Tenant Persistence: is_enabled column toggle, OT & statutory methods,
-- and atomic PostgreSQL RPC functions eliminating all client-side localStorage drift.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. HARDEN TABLE: company_payroll_template_columns
-- Add is_enabled column and expand calculation_method CHECK constraints
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.company_payroll_template_columns
  ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- Update constraint on calculation_method to include statutory OT methods
DO $$
BEGIN
  ALTER TABLE public.company_payroll_template_columns
    DROP CONSTRAINT IF EXISTS company_payroll_template_columns_calculation_method_check;

  ALTER TABLE public.company_payroll_template_columns
    ADD CONSTRAINT company_payroll_template_columns_calculation_method_check
    CHECK (calculation_method IS NULL OR calculation_method IN (
      'PERCENTAGE_OF_BASE',
      'PERCENTAGE_OF_BASIC',
      'PERCENTAGE_OF_GROSS',
      'STATUTORY_2X_BASIC',
      'DOUBLE_ORDINARY_RATE',
      'COMPANY_OT_POLICY',
      'HOURLY_OT_RATE',
      'FIXED_PER_MONTH',
      'FIXED_PER_DAY',
      'PER_SHIFT_COUNT',
      'ATTENDANCE_DRIVEN',
      'MANUAL_ENTRY',
      'COMPUTED_SUM'
    ));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Constraint update notice: %', SQLERRM;
END $$;

CREATE INDEX IF NOT EXISTS idx_cptc_enabled 
  ON public.company_payroll_template_columns(template_id, is_enabled);

CREATE INDEX IF NOT EXISTS idx_cptc_field_key 
  ON public.company_payroll_template_columns(template_id, field_key);

-- ---------------------------------------------------------------------------
-- 2. UPDATED RPC 1: fn_get_company_payroll_template
-- Returns complete nested template JSONB including isEnabled status
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_get_company_payroll_template(
  p_organization_id TEXT,
  p_company_id      TEXT DEFAULT 'DEFAULT_COMPANY',
  p_vendor_id       TEXT DEFAULT 'ALL'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template_row RECORD;
  v_result       JSONB;
BEGIN
  -- Strict Multi-Tenant Hierarchy Search: Exact Vendor -> Company -> Organization Default
  SELECT * INTO v_template_row
  FROM public.company_payroll_templates
  WHERE organization_id = p_organization_id
    AND company_id = p_company_id
    AND vendor_id = p_vendor_id
    AND is_active = TRUE
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_template_row IS NULL THEN
    SELECT * INTO v_template_row
    FROM public.company_payroll_templates
    WHERE organization_id = p_organization_id
      AND company_id = p_company_id
      AND is_active = TRUE
    ORDER BY is_default DESC, updated_at DESC
    LIMIT 1;
  END IF;

  IF v_template_row IS NULL THEN
    SELECT * INTO v_template_row
    FROM public.company_payroll_templates
    WHERE organization_id = p_organization_id
      AND is_active = TRUE
    ORDER BY is_default DESC, updated_at DESC
    LIMIT 1;
  END IF;

  IF v_template_row IS NULL THEN
    -- System baseline fallback
    SELECT * INTO v_template_row
    FROM public.company_payroll_templates
    WHERE is_default = TRUE
    LIMIT 1;
  END IF;

  IF v_template_row IS NULL THEN
    RETURN NULL;
  END IF;

  -- Build full nested JSON including isEnabled
  SELECT jsonb_build_object(
    'templateId',               v_template_row.id,
    'templateCode',             v_template_row.template_code,
    'templateName',             v_template_row.template_name,
    'organizationId',           v_template_row.organization_id,
    'companyId',                v_template_row.company_id,
    'vendorId',                 v_template_row.vendor_id,
    'version',                  v_template_row.version,
    'description',              v_template_row.description,
    'layoutType',               v_template_row.layout_type,
    'sheetName',                v_template_row.sheet_name,
    'freezePanes',              v_template_row.freeze_panes,
    'totalRowIncluded',         v_template_row.total_row_included,
    'signatureBlockIncluded',   v_template_row.signature_block_included,
    'createdAt',                v_template_row.created_at,
    'updatedAt',                v_template_row.updated_at,
    'sections', (
      SELECT COALESCE(jsonb_agg(sec_obj ORDER BY sec_order), '[]'::jsonb)
      FROM (
        SELECT 
          s.display_order AS sec_order,
          jsonb_build_object(
            'id',          s.section_key,
            'title',       s.title,
            'category',    s.category,
            'headerColor', s.header_color,
            'columns', (
              SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                  'fieldKey',           c.field_key,
                  'headerLabel',        c.header_label,
                  'category',           c.category,
                  'width',              c.width,
                  'format',             c.format,
                  'isCalculated',       c.is_calculated,
                  'calculationMethod',  c.calculation_method,
                  'calculationValue',   c.calculation_value,
                  'required',           c.required,
                  'align',              c.align,
                  'bold',               c.bold,
                  'backgroundColor',    c.background_color,
                  'textColor',          c.text_color,
                  'isCustom',           c.is_custom,
                  'isEnabled',          COALESCE(c.is_enabled, TRUE),
                  'description',        c.description,
                  'formula',            c.formula
                ) ORDER BY c.display_order
              ), '[]'::jsonb)
              FROM public.company_payroll_template_columns c
              WHERE c.section_id = s.id
            )
          ) AS sec_obj
        FROM public.company_payroll_template_sections s
        WHERE s.template_id = v_template_row.id
          AND s.is_active = TRUE
      ) sub_secs
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. UPDATED RPC 2: fn_save_company_payroll_template
-- Atomic transactional save of complete template with is_enabled support
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_save_company_payroll_template(
  p_template        JSONB,
  p_organization_id TEXT,
  p_company_id      TEXT DEFAULT 'DEFAULT_COMPANY',
  p_vendor_id       TEXT DEFAULT 'ALL'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template_id   TEXT;
  v_template_code TEXT;
  v_sec           JSONB;
  v_col           JSONB;
  v_sec_id        TEXT;
  v_sec_key       TEXT;
  v_sec_order     INT := 0;
  v_col_order     INT := 0;
BEGIN
  v_template_code := COALESCE(p_template->>'templateCode', p_template->>'templateId', 'TMPL_' || p_vendor_id || '_' || p_company_id);

  -- 1. Upsert master template header
  INSERT INTO public.company_payroll_templates (
    organization_id,
    company_id,
    vendor_id,
    template_code,
    template_name,
    version,
    description,
    layout_type,
    sheet_name,
    freeze_panes,
    total_row_included,
    signature_block_included,
    is_active,
    updated_at
  ) VALUES (
    p_organization_id,
    p_company_id,
    p_vendor_id,
    v_template_code,
    COALESCE(p_template->>'templateName', 'Company Payroll Template'),
    COALESCE(p_template->>'version', '2.2'),
    COALESCE(p_template->>'description', 'Governed Company Payroll Template'),
    COALESCE(p_template->>'layoutType', 'COMPANY_SALARY_STATEMENT'),
    COALESCE(p_template->>'sheetName', 'Salary Statement'),
    COALESCE(p_template->'freezePanes', '{"xSplit": 3, "ySplit": 2}'::jsonb),
    COALESCE((p_template->>'totalRowIncluded')::boolean, TRUE),
    COALESCE((p_template->>'signatureBlockIncluded')::boolean, TRUE),
    TRUE,
    NOW()
  )
  ON CONFLICT (organization_id, company_id, vendor_id, template_code)
  DO UPDATE SET
    template_name            = EXCLUDED.template_name,
    version                  = EXCLUDED.version,
    description              = EXCLUDED.description,
    layout_type              = EXCLUDED.layout_type,
    sheet_name               = EXCLUDED.sheet_name,
    freeze_panes             = EXCLUDED.freeze_panes,
    total_row_included       = EXCLUDED.total_row_included,
    signature_block_included = EXCLUDED.signature_block_included,
    is_active                = TRUE,
    updated_at               = NOW()
  RETURNING id INTO v_template_id;

  -- 2. Clean old sections/columns for atomic replacement
  DELETE FROM public.company_payroll_template_sections
  WHERE template_id = v_template_id;

  -- 3. Re-insert sections and their respective columns
  FOR v_sec IN SELECT * FROM jsonb_array_elements(COALESCE(p_template->'sections', '[]'::jsonb))
  LOOP
    v_sec_key   := COALESCE(v_sec->>'id', 'SEC_' || v_sec_order);
    v_sec_order := v_sec_order + 1;

    INSERT INTO public.company_payroll_template_sections (
      template_id,
      organization_id,
      section_key,
      title,
      category,
      display_order,
      header_color
    ) VALUES (
      v_template_id,
      p_organization_id,
      v_sec_key,
      COALESCE(v_sec->>'title', 'Section ' || v_sec_order),
      COALESCE(v_sec->>'category', 'EARNINGS'),
      v_sec_order,
      COALESCE(v_sec->>'headerColor', 'FF07563D')
    )
    RETURNING id INTO v_sec_id;

    v_col_order := 0;
    FOR v_col IN SELECT * FROM jsonb_array_elements(COALESCE(v_sec->'columns', '[]'::jsonb))
    LOOP
      v_col_order := v_col_order + 1;

      INSERT INTO public.company_payroll_template_columns (
        template_id,
        section_id,
        organization_id,
        field_key,
        header_label,
        category,
        display_order,
        width,
        format,
        is_calculated,
        calculation_method,
        calculation_value,
        formula,
        required,
        align,
        bold,
        background_color,
        text_color,
        is_custom,
        is_enabled,
        description
      ) VALUES (
        v_template_id,
        v_sec_id,
        p_organization_id,
        COALESCE(v_col->>'fieldKey', 'col_' || v_col_order),
        COALESCE(v_col->>'headerLabel', 'Column ' || v_col_order),
        COALESCE(v_col->>'category', v_sec->>'category', 'EARNINGS'),
        v_col_order,
        COALESCE((v_col->>'width')::int, 12),
        COALESCE(v_col->>'format', 'INR'),
        COALESCE((v_col->>'isCalculated')::boolean, FALSE),
        v_col->>'calculationMethod',
        COALESCE((v_col->>'calculationValue')::numeric, 0),
        v_col->>'formula',
        COALESCE((v_col->>'required')::boolean, FALSE),
        COALESCE(v_col->>'align', 'right'),
        COALESCE((v_col->>'bold')::boolean, FALSE),
        v_col->>'backgroundColor',
        v_col->>'textColor',
        COALESCE((v_col->>'isCustom')::boolean, FALSE),
        COALESCE((v_col->>'isEnabled')::boolean, TRUE),
        v_col->>'description'
      );
    END LOOP;
  END LOOP;

  -- 4. Return the fully saved structured template
  RETURN public.fn_get_company_payroll_template(p_organization_id, p_company_id, p_vendor_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. RPC 3: fn_toggle_template_column_enabled
-- Fast individual component toggle without rewriting whole template
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_toggle_template_column_enabled(
  p_organization_id TEXT,
  p_template_id     TEXT,
  p_field_key       TEXT,
  p_is_enabled      BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.company_payroll_template_columns
  SET is_enabled = p_is_enabled,
      updated_at = NOW()
  WHERE organization_id = p_organization_id
    AND template_id = p_template_id
    AND field_key = p_field_key;

  UPDATE public.company_payroll_templates
  SET updated_at = NOW()
  WHERE organization_id = p_organization_id
    AND id = p_template_id;

  RETURN FOUND;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. SEED / UPDATE TEMPLATE FOR JOY MANPOWER SERVICES (VND-JOY-01)
-- Explicitly configure PT and LWF as disabled per client billing requirements
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tmpl_id TEXT;
  v_sec_id  TEXT;
BEGIN
  -- Check if template exists for VND-JOY-01
  SELECT id INTO v_tmpl_id
  FROM public.company_payroll_templates
  WHERE vendor_id = 'VND-JOY-01'
  LIMIT 1;

  IF v_tmpl_id IS NOT NULL THEN
    -- Ensure PT and LWF are marked disabled
    UPDATE public.company_payroll_template_columns
    SET is_enabled = FALSE
    WHERE template_id = v_tmpl_id
      AND field_key IN ('pt', 'lwf');
  END IF;
END $$;
