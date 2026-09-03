-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 002
-- Target Project: ysiajemrqakfngasehhi
-- Description: Core Domain Types and Custom Enums
-- ============================================================================

DO $$
BEGIN
    -- Organization status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_status_enum') THEN
        CREATE TYPE public.org_status_enum AS ENUM (
            'ACTIVE', 'ONBOARDING', 'SUSPENDED', 'INACTIVE'
        );
    END IF;

    -- Employment status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_status_enum') THEN
        CREATE TYPE public.employment_status_enum AS ENUM (
            'ACTIVE', 'PROBATION', 'NOTICE_PERIOD', 'SUSPENDED', 'TERMINATED', 'RESIGNED'
        );
    END IF;

    -- Employment type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_type_enum') THEN
        CREATE TYPE public.employment_type_enum AS ENUM (
            'FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'CONSULTANT'
        );
    END IF;

    -- Attendance status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status_enum') THEN
        CREATE TYPE public.attendance_status_enum AS ENUM (
            'PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'WEEKLY_OFF', 'HOLIDAY', 'MISSED_PUNCH'
        );
    END IF;

    -- Leave status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_status_enum') THEN
        CREATE TYPE public.leave_status_enum AS ENUM (
            'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
        );
    END IF;

    -- Payroll status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_status_enum') THEN
        CREATE TYPE public.payroll_status_enum AS ENUM (
            'DRAFT', 'CALCULATED', 'VERIFIED', 'APPROVED', 'DISBURSED', 'LOCKED'
        );
    END IF;

    -- Subscription status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status_enum') THEN
        CREATE TYPE public.subscription_status_enum AS ENUM (
            'TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED'
        );
    END IF;
END $$;
