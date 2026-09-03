-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 001
-- Target Project: ysiajemrqakfngasehhi
-- Description: Core PostgreSQL Extensions Initialization
-- ============================================================================

-- 1. UUID generation (v4 cryptographic random UUIDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Full-text search and fuzzy text matching (for employee & candidate searches)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 3. Case-insensitive text types
CREATE EXTENSION IF NOT EXISTS "citext";
