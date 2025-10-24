-- Vision/Traction Organizer (V/TO) Module
-- Organization-scoped planning tool with versioning, links to KPIs/Rocks/Issues, and rollup progress

-- Main VTO record (one per organization)
CREATE TABLE IF NOT EXISTS public.vto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Vision/Traction Organizer',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- VTO Versions (draft, published, archived with full Vision/Traction data)
CREATE TABLE IF NOT EXISTS public.vto_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vto_id UUID NOT NULL REFERENCES public.vto(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','published','archived')) DEFAULT 'draft',
  
  -- Vision Page Fields
  core_values TEXT[] DEFAULT '{}',
  core_focus JSONB DEFAULT '{}'::jsonb,  -- { purpose, niche }
  ten_year_target TEXT,
  marketing_strategy JSONB DEFAULT '{}'::jsonb,  -- { ideal_client, differentiators[], proven_process, guarantee }
  three_year_picture JSONB DEFAULT '{}'::jsonb,  -- { revenue, profit, measurables[], headcount, notes }
  
  -- Traction Page Fields
  one_year_plan JSONB DEFAULT '{}'::jsonb,  -- { revenue, profit, measurables[], goals[] }
  quarter_key TEXT,  -- e.g., '2025-Q4'
  quarterly_rocks JSONB DEFAULT '[]'::jsonb,  -- array of { title, owner_id, due, status, weight }
  issues_company JSONB DEFAULT '[]'::jsonb,
  issues_department JSONB DEFAULT '[]'::jsonb,
  issues_personal JSONB DEFAULT '[]'::jsonb,
  
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(vto_id, version)
);

-- Links between VTO goals and live KPIs/Rocks/Issues/Docs
CREATE TABLE IF NOT EXISTS public.vto_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vto_version_id UUID NOT NULL REFERENCES public.vto_versions(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('kpi','rock','issue','doc')),
  link_id UUID NOT NULL,  -- points to kpis.id | rocks.id | issues.id | docs.id
  goal_key TEXT NOT NULL,  -- e.g., 'one_year_plan.goals[2]' or 'three_year_picture.measurables.revenue'
  weight NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Progress snapshots (computed rollup for dashboard and history)
CREATE TABLE IF NOT EXISTS public.vto_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vto_version_id UUID NOT NULL REFERENCES public.vto_versions(id) ON DELETE CASCADE,
  computed_at TIMESTAMPTZ DEFAULT now(),
  vision_score NUMERIC,  -- % completeness of vision fields
  traction_score NUMERIC,  -- weighted % progress from linked rocks/kpis
  details JSONB  -- breakdown per goal_key
);

-- Audit trail for all VTO actions
CREATE TABLE IF NOT EXISTS public.vto_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vto_version_id UUID NOT NULL REFERENCES public.vto_versions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,  -- 'create','publish','archive','edit','link','unlink','export'
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all VTO tables
ALTER TABLE public.vto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vto_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vto_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vto_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vto_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vto table
CREATE POLICY "Admins can manage all vto"
  ON public.vto FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Team members can read their org vto"
  ON public.vto FOR SELECT
  USING (is_same_team(team_id));

CREATE POLICY "Managers can manage team vto"
  ON public.vto FOR ALL
  USING (is_manager() AND is_same_team(team_id))
  WITH CHECK (is_manager() AND is_same_team(team_id));

-- RLS Policies for vto_versions table
CREATE POLICY "Admins can manage all vto_versions"
  ON public.vto_versions FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Team members can read published vto_versions"
  ON public.vto_versions FOR SELECT
  USING (
    vto_id IN (
      SELECT id FROM public.vto WHERE is_same_team(team_id)
    )
    AND (status = 'published' OR is_manager() OR is_admin())
  );

CREATE POLICY "Managers can manage team vto_versions"
  ON public.vto_versions FOR ALL
  USING (
    is_manager() AND vto_id IN (
      SELECT id FROM public.vto WHERE is_same_team(team_id)
    )
  )
  WITH CHECK (
    is_manager() AND vto_id IN (
      SELECT id FROM public.vto WHERE is_same_team(team_id)
    )
  );

-- RLS Policies for vto_links table
CREATE POLICY "Admins can manage all vto_links"
  ON public.vto_links FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Team members can read vto_links"
  ON public.vto_links FOR SELECT
  USING (
    vto_version_id IN (
      SELECT vv.id FROM public.vto_versions vv
      JOIN public.vto v ON vv.vto_id = v.id
      WHERE is_same_team(v.team_id)
    )
  );

CREATE POLICY "Managers can manage team vto_links"
  ON public.vto_links FOR ALL
  USING (
    is_manager() AND vto_version_id IN (
      SELECT vv.id FROM public.vto_versions vv
      JOIN public.vto v ON vv.vto_id = v.id
      WHERE is_same_team(v.team_id)
    )
  )
  WITH CHECK (
    is_manager() AND vto_version_id IN (
      SELECT vv.id FROM public.vto_versions vv
      JOIN public.vto v ON vv.vto_id = v.id
      WHERE is_same_team(v.team_id)
    )
  );

-- RLS Policies for vto_progress table
CREATE POLICY "Admins can manage all vto_progress"
  ON public.vto_progress FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Team members can read vto_progress"
  ON public.vto_progress FOR SELECT
  USING (
    vto_version_id IN (
      SELECT vv.id FROM public.vto_versions vv
      JOIN public.vto v ON vv.vto_id = v.id
      WHERE is_same_team(v.team_id)
    )
  );

CREATE POLICY "System can write vto_progress"
  ON public.vto_progress FOR INSERT
  WITH CHECK (true);

-- RLS Policies for vto_audit table
CREATE POLICY "Admins can read all vto_audit"
  ON public.vto_audit FOR SELECT
  USING (is_admin());

CREATE POLICY "Team members can read team vto_audit"
  ON public.vto_audit FOR SELECT
  USING (
    vto_version_id IN (
      SELECT vv.id FROM public.vto_versions vv
      JOIN public.vto v ON vv.vto_id = v.id
      WHERE is_same_team(v.team_id)
    )
  );

CREATE POLICY "System can write vto_audit"
  ON public.vto_audit FOR INSERT
  WITH CHECK (true);

-- Trigger to update vto.updated_at
CREATE TRIGGER update_vto_updated_at
  BEFORE UPDATE ON public.vto
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_vto_team_id ON public.vto(team_id);
CREATE INDEX idx_vto_versions_vto_id ON public.vto_versions(vto_id);
CREATE INDEX idx_vto_versions_status ON public.vto_versions(status);
CREATE INDEX idx_vto_links_version_id ON public.vto_links(vto_version_id);
CREATE INDEX idx_vto_links_link_type_id ON public.vto_links(link_type, link_id);
CREATE INDEX idx_vto_progress_version_id ON public.vto_progress(vto_version_id);
CREATE INDEX idx_vto_audit_version_id ON public.vto_audit(vto_version_id);