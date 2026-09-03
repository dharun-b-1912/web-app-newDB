# 08. CANONICAL SCHEMA STANDARD — JOY PEOPLEHR SAAS

**Status:** Permanent Standard  
**Authority:** Joy PeopleHR Product Evolution Program  
**Canonical Master Reference:** [JOY_PEOPLEHR_CANONICAL_SQL_BACKEND_BLUEPRINT.md](../JOY_PEOPLEHR_CANONICAL_SQL_BACKEND_BLUEPRINT.md)  
**Core Domain Mapping:** Organizes all PostgreSQL tables into the 11 Canonical Domains with the 5-Tier Taxonomy.

---

## 1. Canonical Table Definition Blueprint

Every new table added to Joy PeopleHR must adhere to this standard:

```sql
CREATE TABLE public.<entity_name> (
    -- 1. Primary Key: UUID with v4 generation
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 2. Single Canonical Tenant Identifier
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- 3. Business Attributes (Domain Model)
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',

    -- 4. Standard Audit Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL -- Only if soft-delete approved
);

-- 5. Standard Indexes
CREATE INDEX idx_<entity_name>_org_status ON public.<entity_name> (organization_id, status);

-- 6. Mandatory Row Level Security
ALTER TABLE public.<entity_name> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "<entity_name>_tenant_select" ON public.<entity_name>
    FOR SELECT TO authenticated USING (organization_id = public.current_org_id());

CREATE POLICY "<entity_name>_tenant_insert" ON public.<entity_name>
    FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "<entity_name>_tenant_update" ON public.<entity_name>
    FOR UPDATE TO authenticated
    USING (organization_id = public.current_org_id())
    WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "<entity_name>_tenant_delete" ON public.<entity_name>
    FOR DELETE TO authenticated USING (organization_id = public.current_org_id());
```
