-- Create enums for type safety
CREATE TYPE public.user_role AS ENUM ('owner', 'director', 'manager', 'provider', 'staff', 'billing');
CREATE TYPE public.kpi_unit AS ENUM ('count', '%', '$', 'days');
CREATE TYPE public.kpi_direction AS ENUM ('>=', '<=', '==');
CREATE TYPE public.rock_level AS ENUM ('company', 'team', 'individual');
CREATE TYPE public.rock_status AS ENUM ('on_track', 'off_track', 'done');
CREATE TYPE public.issue_status AS ENUM ('open', 'in_progress', 'solved', 'parked');
CREATE TYPE public.meeting_type AS ENUM ('L10', 'leadership_sync');
CREATE TYPE public.doc_kind AS ENUM ('SOP', 'Policy', 'Handbook');
CREATE TYPE public.doc_status AS ENUM ('draft', 'approved', 'archived');
CREATE TYPE public.ar_bucket AS ENUM ('30-60', '60-90', '90-120', '120+');
CREATE TYPE public.ingest_status AS ENUM ('pending', 'processing', 'success', 'error');

-- Teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users table (extending auth.users concept)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- KPIs table
CREATE TABLE public.kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit kpi_unit NOT NULL,
  target NUMERIC,
  direction kpi_direction NOT NULL,
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  category TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- KPI readings with unique constraint
CREATE TABLE public.kpi_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID NOT NULL REFERENCES public.kpis(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  value NUMERIC NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(kpi_id, week_start)
);

-- Rocks table
CREATE TABLE public.rocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  level rock_level NOT NULL,
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  quarter TEXT NOT NULL,
  status rock_status NOT NULL DEFAULT 'on_track',
  confidence INT CHECK (confidence >= 0 AND confidence <= 100),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Issues table
CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  context TEXT,
  priority INT NOT NULL DEFAULT 3,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  status issue_status NOT NULL DEFAULT 'open',
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  solved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Todos table
CREATE TABLE public.todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  due_date DATE,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Meetings table
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type meeting_type NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 90,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Meeting notes table
CREATE TABLE public.meeting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  headlines TEXT[],
  rock_check JSONB,
  kpi_snapshot JSONB,
  decisions TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents table
CREATE TABLE public.docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind doc_kind NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  version INT NOT NULL DEFAULT 1,
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status doc_status NOT NULL DEFAULT 'draft',
  requires_ack BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Acknowledgements table
CREATE TABLE public.acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL REFERENCES public.docs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  quiz_score INT,
  UNIQUE(doc_id, user_id)
);

-- Referral sources table
CREATE TABLE public.referral_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Referrals weekly with unique constraint
CREATE TABLE public.referrals_weekly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  source_id UUID NOT NULL REFERENCES public.referral_sources(id) ON DELETE CASCADE,
  total INT NOT NULL DEFAULT 0,
  scheduled INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(week_start, source_id)
);

-- AR aging with unique constraint
CREATE TABLE public.ar_aging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  bucket ar_bucket NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(week_start, bucket)
);

-- Audit log table
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staging tables for imports
CREATE TABLE public.staging_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw JSONB NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.staging_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw JSONB NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.staging_ar_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw JSONB NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.staging_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw JSONB NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.file_ingest_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  rows INT NOT NULL DEFAULT 0,
  status ingest_status NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_users_team_id ON public.users(team_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_kpis_owner_id ON public.kpis(owner_id);
CREATE INDEX idx_kpis_active ON public.kpis(active);
CREATE INDEX idx_kpi_readings_kpi_id ON public.kpi_readings(kpi_id);
CREATE INDEX idx_kpi_readings_week_start ON public.kpi_readings(week_start);
CREATE INDEX idx_rocks_owner_id ON public.rocks(owner_id);
CREATE INDEX idx_rocks_status ON public.rocks(status);
CREATE INDEX idx_rocks_quarter ON public.rocks(quarter);
CREATE INDEX idx_issues_team_id ON public.issues(team_id);
CREATE INDEX idx_issues_owner_id ON public.issues(owner_id);
CREATE INDEX idx_issues_status ON public.issues(status);
CREATE INDEX idx_todos_issue_id ON public.todos(issue_id);
CREATE INDEX idx_todos_owner_id ON public.todos(owner_id);
CREATE INDEX idx_meetings_team_id ON public.meetings(team_id);
CREATE INDEX idx_meetings_scheduled_for ON public.meetings(scheduled_for);
CREATE INDEX idx_meeting_notes_meeting_id ON public.meeting_notes(meeting_id);
CREATE INDEX idx_docs_owner_id ON public.docs(owner_id);
CREATE INDEX idx_docs_status ON public.docs(status);
CREATE INDEX idx_acknowledgements_doc_id ON public.docs(id);
CREATE INDEX idx_acknowledgements_user_id ON public.acknowledgements(user_id);
CREATE INDEX idx_referrals_weekly_week_start ON public.referrals_weekly(week_start);
CREATE INDEX idx_ar_aging_week_start ON public.ar_aging(week_start);
CREATE INDEX idx_audit_log_actor_id ON public.audit_log(actor_id);
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity, entity_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at);

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals_weekly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_aging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staging_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staging_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staging_ar_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staging_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_ingest_log ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (placeholder - will need to be refined based on requirements)
-- For now, allowing authenticated users to read all data
CREATE POLICY "Authenticated users can read teams" ON public.teams
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read users" ON public.users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read kpis" ON public.kpis
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read kpi_readings" ON public.kpi_readings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read rocks" ON public.rocks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read issues" ON public.issues
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read todos" ON public.todos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read meetings" ON public.meetings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read meeting_notes" ON public.meeting_notes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read docs" ON public.docs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read acknowledgements" ON public.acknowledgements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read referral_sources" ON public.referral_sources
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read referrals_weekly" ON public.referrals_weekly
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read ar_aging" ON public.ar_aging
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read audit_log" ON public.audit_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read staging_appointments" ON public.staging_appointments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read staging_patients" ON public.staging_patients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read staging_ar_lines" ON public.staging_ar_lines
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read staging_payments" ON public.staging_payments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read file_ingest_log" ON public.file_ingest_log
  FOR SELECT TO authenticated USING (true);