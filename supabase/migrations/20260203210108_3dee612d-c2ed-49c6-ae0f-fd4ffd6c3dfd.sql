-- Platform Benchmark Data Model
-- Supports cross-org comparisons with security controls

-- Platform roles table (master admin access)
CREATE TABLE public.platform_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('master_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Benchmark cohorts (groupings of organizations for comparison)
CREATE TABLE public.benchmark_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cohort membership (which teams belong to which cohorts)
CREATE TABLE public.benchmark_cohort_memberships (
  cohort_id UUID NOT NULL REFERENCES public.benchmark_cohorts(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cohort_id, team_id)
);

-- Precomputed benchmark snapshots (aggregated stats by cohort+metric+period)
CREATE TABLE public.benchmark_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES public.benchmark_cohorts(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'weekly')),
  period_start DATE NOT NULL,
  n_orgs INT NOT NULL,
  p10 NUMERIC,
  p25 NUMERIC,
  p50 NUMERIC,
  p75 NUMERIC,
  p90 NUMERIC,
  mean NUMERIC,
  stddev NUMERIC,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cohort_id, metric_id, period_type, period_start)
);

-- Audit log for benchmark operations
CREATE TABLE public.benchmark_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_benchmark_cohort_memberships_team ON public.benchmark_cohort_memberships(team_id);
CREATE INDEX idx_benchmark_snapshots_lookup ON public.benchmark_snapshots(cohort_id, metric_id, period_type, period_start);
CREATE INDEX idx_benchmark_snapshots_metric ON public.benchmark_snapshots(metric_id);
CREATE INDEX idx_benchmark_audit_log_user ON public.benchmark_audit_log(user_id);
CREATE INDEX idx_benchmark_audit_log_action ON public.benchmark_audit_log(action);

-- Helper function: Check if current user is a master admin
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_roles
    WHERE user_id = auth.uid()
    AND role = 'master_admin'
  );
$$;

-- Helper function: Get current user's team ID (uses existing pattern)
CREATE OR REPLACE FUNCTION public.get_user_team_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT team_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;