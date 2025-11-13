-- Create minimal Clarity tables required by clarity-save function
-- Safe to run multiple times

-- 1) VTO table
CREATE TABLE IF NOT EXISTS public.clarity_vto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  version_current integer NOT NULL DEFAULT 1,
  vision jsonb NOT NULL DEFAULT '{}'::jsonb,
  traction jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT jsonb_build_object(
    'vision_clarity', 0,
    'traction_health', 0,
    'last_computed', NULL,
    'breakdown', jsonb_build_object()
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clarity_vto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org users can view VTO" ON public.clarity_vto;
CREATE POLICY "Org users can view VTO"
  ON public.clarity_vto
  FOR SELECT
  USING (public.is_same_team(organization_id));

DROP POLICY IF EXISTS "Org users can insert VTO" ON public.clarity_vto;
CREATE POLICY "Org users can insert VTO"
  ON public.clarity_vto
  FOR INSERT
  WITH CHECK (public.is_same_team(organization_id));

DROP POLICY IF EXISTS "Org users can update VTO" ON public.clarity_vto;
CREATE POLICY "Org users can update VTO"
  ON public.clarity_vto
  FOR UPDATE
  USING (public.is_same_team(organization_id));

CREATE INDEX IF NOT EXISTS idx_clarity_vto_org ON public.clarity_vto (organization_id);

DROP TRIGGER IF EXISTS update_clarity_vto_updated_at ON public.clarity_vto;
CREATE TRIGGER update_clarity_vto_updated_at
BEFORE UPDATE ON public.clarity_vto
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Activity log table
CREATE TABLE IF NOT EXISTS public.clarity_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vto_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clarity_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org users can view activity" ON public.clarity_activity;
CREATE POLICY "Org users can view activity"
  ON public.clarity_activity
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clarity_vto v
      WHERE v.id = clarity_activity.vto_id
        AND public.is_same_team(v.organization_id)
    )
  );

DROP POLICY IF EXISTS "Org users can insert activity" ON public.clarity_activity;
CREATE POLICY "Org users can insert activity"
  ON public.clarity_activity
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clarity_vto v
      WHERE v.id = vto_id
        AND public.is_same_team(v.organization_id)
    )
  );

CREATE INDEX IF NOT EXISTS idx_clarity_activity_vto ON public.clarity_activity (vto_id);
CREATE INDEX IF NOT EXISTS idx_clarity_activity_created ON public.clarity_activity (created_at);