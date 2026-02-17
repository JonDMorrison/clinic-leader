-- =====================================================
-- CONSOLIDATED SCHEMA FOR NEW SUPABASE INSTANCE
-- This creates all essential tables needed for data import
-- Run this ONCE in Supabase SQL Editor before importing CSVs
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('owner', 'director', 'manager', 'provider', 'staff', 'billing');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.kpi_unit AS ENUM ('count', '%', '$', 'days');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.kpi_direction AS ENUM ('>=', '<=', '==');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.rock_level AS ENUM ('company', 'team', 'individual');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.rock_status AS ENUM ('on_track', 'off_track', 'done');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.issue_status AS ENUM ('open', 'in_progress', 'solved', 'parked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_demo_org BOOLEAN DEFAULT false,
  industry TEXT,
  team_size TEXT,
  location_city TEXT,
  location_region TEXT,
  country TEXT,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  currency TEXT DEFAULT 'USD',
  unit_system TEXT DEFAULT 'imperial',
  ehr_system TEXT,
  review_cadence TEXT DEFAULT 'weekly',
  meeting_rhythm TEXT,
  eos_enabled BOOLEAN DEFAULT false,
  default_report_email TEXT,
  brand_color TEXT,
  logo_url TEXT,
  onboarding_status TEXT DEFAULT 'draft',
  needs_scorecard_review BOOLEAN DEFAULT false,
  needs_rocks_review BOOLEAN DEFAULT false,
  vto_last_impact_result TEXT,
  scorecard_mode TEXT DEFAULT 'flexible',
  scorecard_ready BOOLEAN DEFAULT false,
  scorecard_ready_checked_at TIMESTAMPTZ,
  scorecard_ready_notes TEXT,
  data_mode TEXT DEFAULT 'default',
  emr_source_type TEXT DEFAULT 'unknown',
  provider_count INTEGER DEFAULT 0,
  annual_visit_volume INTEGER DEFAULT 0,
  region TEXT DEFAULT 'unknown',
  benchmark_opt_in BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ
);

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- User Roles (additional role mapping)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User Departments
CREATE TABLE IF NOT EXISTS public.user_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seats (for licensing/subscription)
CREATE TABLE IF NOT EXISTS public.seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  seat_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seat Users (user-seat mapping)
CREATE TABLE IF NOT EXISTS public.seat_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_id UUID REFERENCES public.seats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- KPIs table
CREATE TABLE IF NOT EXISTS public.kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit kpi_unit NOT NULL,
  target NUMERIC,
  direction kpi_direction NOT NULL,
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  category TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  import_key TEXT
);

-- KPI readings
CREATE TABLE IF NOT EXISTS public.kpi_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID NOT NULL REFERENCES public.kpis(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  value NUMERIC NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(kpi_id, week_start)
);

-- Rocks table
CREATE TABLE IF NOT EXISTS public.rocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  level rock_level NOT NULL,
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  quarter TEXT NOT NULL,
  status rock_status NOT NULL DEFAULT 'on_track',
  confidence INT CHECK (confidence >= 0 AND confidence <= 100),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE
);

-- Rock-Metric Links
CREATE TABLE IF NOT EXISTS public.rock_metric_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rock_id UUID REFERENCES public.rocks(id) ON DELETE CASCADE,
  metric_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Issues table
CREATE TABLE IF NOT EXISTS public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  context TEXT,
  priority INT NOT NULL DEFAULT 3,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  status issue_status NOT NULL DEFAULT 'open',
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  solved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Todos table
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  due_date DATE,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- VTO table
CREATE TABLE IF NOT EXISTS public.vto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  content JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- VTO Links
CREATE TABLE IF NOT EXISTS public.vto_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vto_id UUID REFERENCES public.vto(id) ON DELETE CASCADE,
  link_type TEXT,
  link_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Meeting Items
CREATE TABLE IF NOT EXISTS public.meeting_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  item_type TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Org Core Values
CREATE TABLE IF NOT EXISTS public.org_core_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  value_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Files table
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vto ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT id FROM public.users WHERE email = auth.email() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_team()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT team_id FROM public.users WHERE email = auth.email() LIMIT 1;
$$;

-- =====================================================
-- BASIC RLS POLICIES (Temporary - Allow service_role to insert)
-- =====================================================

-- Allow service_role to bypass RLS for data import
CREATE POLICY "Service role can manage all teams" ON public.teams FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage all users" ON public.users FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage all kpis" ON public.kpis FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage all rocks" ON public.rocks FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can manage all issues" ON public.issues FOR ALL TO service_role USING (true);

-- =====================================================
-- DONE!
-- =====================================================
