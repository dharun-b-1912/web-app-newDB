-- ============================================================================
-- Migration: 20261006_153_index_all_foreign_keys.sql
-- Description:
--   Automatically detects and creates covering B-tree indexes for all foreign key
--   constraints in the public schema that lack a covering index (Rule 0001: unindexed_foreign_keys).
--
--   This drastically accelerates foreign key JOINs, deletes, and updates,
--   eliminating sequential table scans on referenced tables.
-- ============================================================================

DO $$
DECLARE
    rec RECORD;
    idx_name text;
BEGIN
    FOR rec IN
        WITH foreign_keys AS (
            SELECT
                ns.nspname AS schema_name,
                cl.relname AS table_name,
                cl.oid AS table_oid,
                ct.conname AS fkey_name,
                ct.conkey AS col_attnums
            FROM
                pg_catalog.pg_constraint ct
                JOIN pg_catalog.pg_class cl ON ct.conrelid = cl.oid
                JOIN pg_catalog.pg_namespace ns ON cl.relnamespace = ns.oid
                LEFT JOIN pg_catalog.pg_depend d ON d.objid = cl.oid AND d.deptype = 'e' AND d.classid = 'pg_catalog.pg_class'::regclass
            WHERE
                ct.contype = 'f'
                AND d.objid IS NULL
                AND ns.nspname = 'public'
        ),
        index_ AS (
            SELECT
                pi.indrelid AS table_oid,
                indexrelid::regclass AS index_,
                string_to_array(indkey::text, ' ')::smallint[] AS col_attnums
            FROM
                pg_catalog.pg_index pi
        )
        SELECT
            fk.schema_name,
            fk.table_name,
            fk.fkey_name,
            string_agg(quote_ident(att.attname), ', ' ORDER BY u.attposition) AS column_names,
            string_agg(att.attname, '_' ORDER BY u.attposition) AS column_slug
        FROM
            foreign_keys fk
            JOIN LATERAL unnest(fk.col_attnums) WITH ORDINALITY AS u(attnum, attposition) ON true
            JOIN pg_catalog.pg_attribute att ON att.attrelid = fk.table_oid AND att.attnum = u.attnum
            LEFT JOIN index_ idx ON fk.table_oid = idx.table_oid AND idx.col_attnums[1 : array_length(fk.col_attnums, 1)] = fk.col_attnums
        WHERE
            idx.index_ IS NULL
        GROUP BY
            fk.schema_name,
            fk.table_name,
            fk.table_oid,
            fk.fkey_name
    LOOP
        -- Construct clean, descriptive index name: idx_fk_<table_name>_<col_slug>
        idx_name := 'idx_fk_' || rec.table_name || '_' || rec.column_slug;

        -- PostgreSQL 63-byte max identifier limit safety
        IF length(idx_name) > 63 THEN
            idx_name := substr(idx_name, 1, 54) || '_' || substr(md5(idx_name), 1, 8);
        END IF;

        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.%I (%s);', idx_name, rec.schema_name, rec.table_name, rec.column_names);
        RAISE NOTICE 'Created covering index % on %.% (%)', idx_name, rec.schema_name, rec.table_name, rec.column_names;
    END LOOP;
END $$;
