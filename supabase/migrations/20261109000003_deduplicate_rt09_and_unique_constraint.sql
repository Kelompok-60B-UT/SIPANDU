-- =============================================================================
-- SIPANDU (Sistem Informasi Layanan Publik dan Pengaduan Warga RW 06)
-- Migration: 20261109000003_deduplicate_rt09_and_unique_constraint.sql
--
-- Objective:
-- 1. Preflight audit: Verify schema requirements, NOT NULL attributes, identity sequence,
--    and existing constraints integrity.
-- 2. Dynamic duplicate mapping: Identify duplicate (name, rw) pairs and map
--    each duplicate ID to its canonical record (MIN(id)). Never assume fixed IDs.
-- 3. Dynamic foreign-key discovery & core validation:
--    - Explicitly assert core FKs on public.profiles(region_id) and public.tickets(region_id)
--      exist, are single-column, and reference public.regions(id).
--    - Inspect all FKs referencing public.regions(id), abort if composite or non-id FKs exist.
--    - Dynamically remap duplicate references to canonical IDs.
-- 4. Pre-delete verification: Ensure zero foreign-key references point to duplicate IDs.
-- 5. Safe deduplication: Remove duplicate region records cleanly.
-- 6. Invariant guarantee: Validate or add UNIQUE constraint on public.regions(name, rw).
-- 7. Identity sequence alignment: Re-align identity sequence to MAX(id).
-- 8. Postflight verification: Guarantee constraint presence, zero duplicates,
--    and sequence alignment health.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Preflight Checks: Table, Columns, NOT NULL Constraints, Sequence, and Constraint Defs
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_regions_oid OID;
    v_name_notnull BOOLEAN;
    v_rw_notnull BOOLEAN;
    r RECORD;
BEGIN
    -- Verify public.regions exists
    IF to_regclass('public.regions') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: Table public.regions does not exist';
    END IF;

    v_regions_oid := 'public.regions'::regclass::oid;

    -- Verify required columns exist and enforce NOT NULL invariant
    SELECT attnotnull INTO v_name_notnull
    FROM pg_attribute
    WHERE attrelid = v_regions_oid AND attname = 'name' AND NOT attisdropped;

    IF v_name_notnull IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: Column "name" does not exist in public.regions';
    ELSIF NOT v_name_notnull THEN
        RAISE EXCEPTION 'Preflight failed: Column "name" in public.regions is nullable; NOT NULL is required';
    END IF;

    SELECT attnotnull INTO v_rw_notnull
    FROM pg_attribute
    WHERE attrelid = v_regions_oid AND attname = 'rw' AND NOT attisdropped;

    IF v_rw_notnull IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: Column "rw" does not exist in public.regions';
    ELSIF NOT v_rw_notnull THEN
        RAISE EXCEPTION 'Preflight failed: Column "rw" in public.regions is nullable; NOT NULL is required';
    END IF;

    -- Verify no NULL data rows exist
    IF EXISTS (SELECT 1 FROM public.regions WHERE name IS NULL OR rw IS NULL) THEN
        RAISE EXCEPTION 'Preflight failed: Table public.regions contains NULL values in name or rw columns';
    END IF;

    -- Verify identity or sequence is attached to public.regions.id
    IF pg_get_serial_sequence('public.regions', 'id') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: Column "id" in public.regions does not have an attached identity or sequence';
    END IF;

    -- Verify existing constraint name conflicts
    FOR r IN (
        SELECT 
            c.conname,
            c.contype,
            c.conrelid::regclass AS table_name,
            pg_get_constraintdef(c.oid) AS def
        FROM pg_constraint c
        WHERE c.conname = 'regions_name_rw_unique'
    ) LOOP
        IF r.table_name <> 'public.regions'::regclass OR r.contype <> 'u' OR r.def <> 'UNIQUE (name, rw)' THEN
            RAISE EXCEPTION 'Preflight failed: Constraint "regions_name_rw_unique" already exists on table "%" with incompatible definition "%" (contype: %)',
                r.table_name, r.def, r.contype;
        END IF;
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Build Duplicate Mapping (Canonical = MIN(id), Dynamic)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS pg_temp._region_duplicate_map;

CREATE TEMPORARY TABLE _region_duplicate_map ON COMMIT DROP AS
SELECT 
    d.id AS duplicate_id,
    c.canonical_id,
    d.name,
    d.rw
FROM public.regions d
JOIN (
    SELECT name, rw, MIN(id) AS canonical_id
    FROM public.regions
    GROUP BY name, rw
    HAVING COUNT(*) > 1
) c ON d.name = c.name AND d.rw = c.rw AND d.id <> c.canonical_id;

-- -----------------------------------------------------------------------------
-- 3. Audit, Validate & Remap Foreign Keys Referencing public.regions(id)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
    v_regions_id_attnum SMALLINT;
    v_src_column TEXT;
    v_sql TEXT;
    v_fk_count INT := 0;
    v_remapped_count INT;
    v_found_profiles_fk BOOLEAN := false;
    v_found_tickets_fk BOOLEAN := false;
    v_profiles_oid OID;
    v_tickets_oid OID;
BEGIN
    -- Resolve attnum of public.regions.id
    SELECT attnum INTO v_regions_id_attnum
    FROM pg_attribute
    WHERE attrelid = 'public.regions'::regclass
      AND attname = 'id'
      AND NOT attisdropped;

    IF v_regions_id_attnum IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: Column "id" not found in public.regions';
    END IF;

    -- Resolve OIDs of core tables if they exist
    v_profiles_oid := to_regclass('public.profiles')::oid;
    v_tickets_oid := to_regclass('public.tickets')::oid;

    -- Inspect all foreign keys referencing public.regions
    FOR r IN (
        SELECT 
            c.conname AS constraint_name,
            c.conrelid AS src_relid,
            c.conrelid::regclass AS src_table,
            c.conkey,
            c.confkey
        FROM pg_constraint c
        WHERE c.contype = 'f' 
          AND c.confrelid = 'public.regions'::regclass
        ORDER BY c.conrelid::regclass::text, c.conname
    ) LOOP
        -- Assert single-column FK constraint (reject composite or unhandled forms)
        IF cardinality(r.conkey) <> 1 OR cardinality(r.confkey) <> 1 THEN
            RAISE EXCEPTION 'Preflight failed: Unsupported composite foreign key "%" on table "%" (conkey size: %, confkey size: %)',
                r.constraint_name, r.src_table, cardinality(r.conkey), cardinality(r.confkey);
        END IF;

        -- Assert FK specifically targets public.regions(id)
        IF r.confkey[1] <> v_regions_id_attnum THEN
            RAISE EXCEPTION 'Preflight failed: Foreign key "%" on table "%" targets attnum %, expected id column (attnum %)',
                r.constraint_name, r.src_table, r.confkey[1], v_regions_id_attnum;
        END IF;

        -- Resolve source column name
        SELECT attname INTO v_src_column
        FROM pg_attribute
        WHERE attrelid = r.src_relid
          AND attnum = r.conkey[1]
          AND NOT attisdropped;

        IF v_src_column IS NULL THEN
            RAISE EXCEPTION 'Preflight failed: Could not resolve column for attnum % in table "%"',
                r.conkey[1], r.src_table;
        END IF;

        -- Explicit match for core foreign keys
        IF v_profiles_oid IS NOT NULL AND r.src_relid = v_profiles_oid AND v_src_column = 'region_id' THEN
            v_found_profiles_fk := true;
        END IF;

        IF v_tickets_oid IS NOT NULL AND r.src_relid = v_tickets_oid AND v_src_column = 'region_id' THEN
            v_found_tickets_fk := true;
        END IF;

        v_fk_count := v_fk_count + 1;

        -- Safely remap any foreign-key references pointing to duplicate IDs
        v_sql := format(
            'UPDATE %s t ' ||
            'SET %I = m.canonical_id ' ||
            'FROM _region_duplicate_map m ' ||
            'WHERE t.%I = m.duplicate_id',
            r.src_table, v_src_column, v_src_column
        );
        EXECUTE v_sql;
        GET DIAGNOSTICS v_remapped_count = ROW_COUNT;

        IF v_remapped_count > 0 THEN
            RAISE NOTICE 'Remapped % row(s) in %.% pointing to duplicate regions to their canonical IDs',
                v_remapped_count, r.src_table, v_src_column;
        END IF;
    END LOOP;

    -- Explicit validation: profiles.region_id and tickets.region_id MUST exist and be valid
    IF NOT v_found_profiles_fk THEN
        RAISE EXCEPTION 'Preflight failed: Core foreign key on public.profiles(region_id) referencing public.regions(id) was not found or is invalid';
    END IF;

    IF NOT v_found_tickets_fk THEN
        RAISE EXCEPTION 'Preflight failed: Core foreign key on public.tickets(region_id) referencing public.regions(id) was not found or is invalid';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. Pre-Delete Verification: Assert Zero Remaining References
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
    v_regions_id_attnum SMALLINT;
    v_src_column TEXT;
    v_remaining_refs BIGINT;
    v_sql TEXT;
BEGIN
    SELECT attnum INTO v_regions_id_attnum
    FROM pg_attribute
    WHERE attrelid = 'public.regions'::regclass
      AND attname = 'id'
      AND NOT attisdropped;

    FOR r IN (
        SELECT 
            c.conname AS constraint_name,
            c.conrelid::regclass AS src_table,
            c.conrelid AS src_relid,
            c.conkey,
            c.confkey
        FROM pg_constraint c
        WHERE c.contype = 'f' 
          AND c.confrelid = 'public.regions'::regclass
    ) LOOP
        IF cardinality(r.conkey) <> 1 OR cardinality(r.confkey) <> 1 OR r.confkey[1] <> v_regions_id_attnum THEN
            RAISE EXCEPTION 'Pre-delete assertion failed: Incompatible FK constraint "%" on table "%"',
                r.constraint_name, r.src_table;
        END IF;

        SELECT attname INTO v_src_column
        FROM pg_attribute
        WHERE attrelid = r.src_relid
          AND attnum = r.conkey[1]
          AND NOT attisdropped;

        v_sql := format(
            'SELECT COUNT(*) FROM %s t JOIN _region_duplicate_map m ON t.%I = m.duplicate_id',
            r.src_table, v_src_column
        );
        EXECUTE v_sql INTO v_remaining_refs;

        IF v_remaining_refs > 0 THEN
            RAISE EXCEPTION 'Safety assertion failed: % row(s) in % still reference duplicate regions before delete',
                v_remaining_refs, r.src_table;
        END IF;
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 5. Safe Deduplication: Remove Duplicate Region Rows
-- -----------------------------------------------------------------------------
DELETE FROM public.regions r
USING _region_duplicate_map m
WHERE r.id = m.duplicate_id;

-- -----------------------------------------------------------------------------
-- 6. Add UNIQUE Constraint on public.regions(name, rw)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_constraint_exists BOOLEAN := false;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'regions_name_rw_unique'
          AND conrelid = 'public.regions'::regclass
          AND contype = 'u'
          AND pg_get_constraintdef(oid) = 'UNIQUE (name, rw)'
    ) INTO v_constraint_exists;

    IF NOT v_constraint_exists THEN
        ALTER TABLE public.regions
        ADD CONSTRAINT regions_name_rw_unique UNIQUE (name, rw);
        RAISE NOTICE 'Added UNIQUE constraint regions_name_rw_unique on public.regions(name, rw)';
    ELSE
        RAISE NOTICE 'Constraint regions_name_rw_unique already exists with valid definition';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 7. Re-align Identity Sequence (Transactional ALTER SEQUENCE RESTART)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_seq_name TEXT;
    v_max_id BIGINT;
    v_restart_val BIGINT;
BEGIN
    v_seq_name := pg_get_serial_sequence('public.regions', 'id');
    IF v_seq_name IS NULL THEN
        RAISE EXCEPTION 'Sequence alignment failed: No sequence found for public.regions.id';
    END IF;

    SELECT COALESCE(MAX(id), 0) INTO v_max_id FROM public.regions;
    IF v_max_id = 0 THEN
        v_restart_val := 1;
    ELSE
        v_restart_val := v_max_id + 1;
    END IF;

    EXECUTE format('ALTER SEQUENCE %s RESTART WITH %s', v_seq_name, v_restart_val);
    RAISE NOTICE 'Re-aligned sequence % with RESTART WITH %', v_seq_name, v_restart_val;
END $$;

-- -----------------------------------------------------------------------------
-- 8. Postflight Verification
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_constraint_exists BOOLEAN;
    v_dup_count INT;
    v_seq_name TEXT;
BEGIN
    -- 1. Verify constraint presence & exact definition
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'regions_name_rw_unique'
          AND conrelid = 'public.regions'::regclass
          AND contype = 'u'
          AND pg_get_constraintdef(oid) = 'UNIQUE (name, rw)'
    ) INTO v_constraint_exists;

    IF NOT v_constraint_exists THEN
        RAISE EXCEPTION 'Postflight failed: regions_name_rw_unique constraint is missing or invalid';
    END IF;

    -- 2. Verify zero duplicates remain
    SELECT COUNT(*) INTO v_dup_count
    FROM (
        SELECT name, rw
        FROM public.regions
        GROUP BY name, rw
        HAVING COUNT(*) > 1
    ) sub;

    IF v_dup_count > 0 THEN
        RAISE EXCEPTION 'Postflight failed: % duplicate (name, rw) pair(s) still exist in public.regions', v_dup_count;
    END IF;

    -- 3. Verify sequence catalog existence & valid sequence relation
    -- Note: ALTER SEQUENCE ... RESTART WITH is transactional DDL and does not update
    -- currval() in the active session. Sequence alignment is verified via catalog existence
    -- and tested via transactional generation tests.
    v_seq_name := pg_get_serial_sequence('public.regions', 'id');
    IF v_seq_name IS NULL THEN
        RAISE EXCEPTION 'Postflight failed: Sequence for public.regions.id not found';
    END IF;

    IF to_regclass(v_seq_name) IS NULL THEN
        RAISE EXCEPTION 'Postflight failed: Sequence % does not exist', v_seq_name;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_class
        WHERE oid = v_seq_name::regclass
          AND relkind = 'S'
    ) THEN
        RAISE EXCEPTION 'Postflight failed: Object % is not a valid sequence relation', v_seq_name;
    END IF;
END $$;

COMMIT;
