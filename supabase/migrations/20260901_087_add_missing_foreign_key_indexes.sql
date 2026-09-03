    -- supabase/migrations/20260901_087_add_missing_foreign_key_indexes.sql
    -- ============================================================================
    -- JOY PEOPLEHR — AUTOMATED COVERING INDEXES FOR ALL FOREIGN KEYS
    -- Resolves: 0001_unindexed_foreign_keys across all tables and schemas
    -- ============================================================================

    DO $$
    DECLARE
      fk_rec RECORD;
      idx_name text;
      col_list text;
    BEGIN
      FOR fk_rec IN
        WITH unindexed_fks AS (
          SELECT
            n.nspname AS schema_name,
            cl.relname AS table_name,
            c.conname AS constraint_name,
            c.conkey AS fk_attnums,
            c.conrelid AS table_oid
          FROM pg_constraint c
          JOIN pg_class cl ON cl.oid = c.conrelid
          JOIN pg_namespace n ON n.oid = cl.relnamespace
          WHERE c.contype = 'f'
            AND n.nspname IN ('public', 'operations', 'platform_control', 'billing_mesh', 'audit', 'payroll')
            AND NOT EXISTS (
              SELECT 1
              FROM pg_index i
              WHERE i.indrelid = c.conrelid
                -- Checks if index leading column(s) match the FK column(s)
                AND (i.indkey::smallint[])[0:cardinality(c.conkey) - 1] = c.conkey
            )
        )
        SELECT
          u.schema_name,
          u.table_name,
          u.constraint_name,
          string_agg(quote_ident(a.attname), ', ' ORDER BY array_position(u.fk_attnums, a.attnum)) AS column_names,
          string_agg(a.attname, '_' ORDER BY array_position(u.fk_attnums, a.attnum)) AS col_suffix
        FROM unindexed_fks u
        JOIN pg_attribute a ON a.attrelid = u.table_oid AND a.attnum = ANY(u.fk_attnums)
        GROUP BY u.schema_name, u.table_name, u.constraint_name
      LOOP
        -- Generate safe index name (< 63 chars)
        idx_name := substring('idx_' || fk_rec.table_name || '_' || fk_rec.col_suffix from 1 for 60);

        -- Create covering B-Tree index concurrently/safely
        EXECUTE format(
          'CREATE INDEX IF NOT EXISTS %I ON %I.%I (%s);',
          idx_name,
          fk_rec.schema_name,
          fk_rec.table_name,
          fk_rec.column_names
        );
      END LOOP;

      RAISE NOTICE 'All missing foreign key covering indexes have been automatically generated.';
    END $$;
