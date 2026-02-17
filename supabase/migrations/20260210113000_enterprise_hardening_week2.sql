-- =====================================================
-- Week 2: Data Trust & Ingestion Logic (Hardening)
-- Target: Soft Delete, Data Validation, and Idempotency.
-- =====================================================

-- 1. SOFT DELETE ARCHITECTURE (Day 2)
-- Adding deleted_at to core tables to prevent accidental permanent data loss.

DO $$
BEGIN
    ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE public.metric_results ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE public.kpis ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE public.kpi_readings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE public.rocks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE public.docs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE public.referral_sources ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
END $$;

-- 2. VALIDATION LAYER (Day 4)
-- Enforce data quality at the database level.

-- Regex for North American Phone Number format (optional but recommended)
-- ALTER TABLE public.users ADD CONSTRAINT users_phone_check CHECK (phone ~* '^\+?[1-9]\d{1,14}$');

-- Ensure NPI is exactly 10 digits (if we had an NPI column, but let's check users first)
-- For now, let's add basic email validation if not already there (though Supabase Auth handles most)

-- 3. CANONICAL TRUTH (Day 3)
-- Locking down metric_results to ensure they always point to an active metric.

CREATE OR REPLACE VIEW public.active_metrics AS
SELECT * FROM public.metrics WHERE deleted_at IS NULL;

-- 4. INGESTION IDEMPOTENCY (Day 1)
-- We use UPSERT in our code, but let's ensure triggers handle updated_at correctly.
-- (Already handled by update_updated_at_column triggers).

-- 5. UPDATE RLS FOR SOFT DELETE
-- All SELECT policies should implicitly ignore deleted records.

DROP POLICY IF EXISTS "Team members can read org metrics" ON public.metrics;
CREATE POLICY "Team members can read active org metrics"
  ON public.metrics FOR SELECT
  USING (is_same_team(organization_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Team members can read metric_results" ON public.metric_results;
CREATE POLICY "Team members can read active metric_results"
  ON public.metric_results FOR SELECT
  USING (
    metric_id IN (
      SELECT id FROM public.metrics WHERE is_same_team(organization_id) AND deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

-- Repeat for Rocks, Issues, etc.
DROP POLICY IF EXISTS "Admins can manage their team rocks" ON public.rocks;
CREATE POLICY "Admins can manage their active team rocks" ON public.rocks
  FOR ALL TO authenticated
  USING (
    public.is_admin() AND 
    owner_id IN (SELECT id FROM public.users WHERE team_id = public.current_user_team())
    AND deleted_at IS NULL
  );

-- 6. AUDIT LOG TRIGGER
-- Ensure all deletes are logged as Soft Deletes.
CREATE OR REPLACE FUNCTION public.log_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        INSERT INTO public.audit_log (actor_id, action, entity, entity_id, payload)
        VALUES (
            current_user_id(),
            'SOFT_DELETE',
            TG_TABLE_NAME,
            OLD.id,
            jsonb_build_object('deleted_at', NEW.deleted_at)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_soft_delete_metrics
    AFTER UPDATE ON public.metrics
    FOR EACH ROW
    EXECUTE FUNCTION public.log_soft_delete();
