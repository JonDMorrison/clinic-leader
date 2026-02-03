-- ============================================
-- CROSS-ORG LEARNING OPT-IN (PRIVACY + CONTROL)
-- ============================================

-- 1. Add opt-in column to teams
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS benchmark_opt_in BOOLEAN NOT NULL DEFAULT false;

-- 2. Create trigger to audit opt-in changes
CREATE OR REPLACE FUNCTION public.audit_benchmark_opt_in_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.benchmark_opt_in IS DISTINCT FROM NEW.benchmark_opt_in THEN
    INSERT INTO public.benchmark_audit_log (action, user_id, details)
    VALUES (
      CASE WHEN NEW.benchmark_opt_in THEN 'opt_in_enabled' ELSE 'opt_in_disabled' END,
      auth.uid(),
      jsonb_build_object(
        'organization_id', NEW.id,
        'organization_name', NEW.name,
        'previous_value', OLD.benchmark_opt_in,
        'new_value', NEW.benchmark_opt_in,
        'changed_at', now()
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_benchmark_opt_in ON public.teams;
CREATE TRIGGER trg_audit_benchmark_opt_in
  AFTER UPDATE OF benchmark_opt_in ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_benchmark_opt_in_change();

-- 3. Function to get org opt-in status
CREATE OR REPLACE FUNCTION public.get_org_benchmark_opt_in(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(benchmark_opt_in, false) FROM teams WHERE id = _org_id;
$$;

-- 4. Function for admins to update opt-in (with audit via trigger)
CREATE OR REPLACE FUNCTION public.set_org_benchmark_opt_in(_org_id UUID, _opt_in BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin/owner of org
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
      AND organization_id = _org_id 
      AND role IN ('admin', 'owner', 'director')
  ) AND NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Only org admins can change benchmark opt-in';
  END IF;

  UPDATE teams SET benchmark_opt_in = _opt_in WHERE id = _org_id;
  RETURN true;
END;
$$;

-- 5. Function to check if org is opted in (for aggregation jobs)
CREATE OR REPLACE FUNCTION public.is_org_benchmark_opted_in(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(benchmark_opt_in, false) FROM teams WHERE id = _org_id;
$$;

-- 6. View to get opted-in orgs for benchmark aggregation
CREATE OR REPLACE VIEW public.benchmark_opted_in_orgs AS
SELECT id, name, emr_source_type, provider_count
FROM teams
WHERE benchmark_opt_in = true;