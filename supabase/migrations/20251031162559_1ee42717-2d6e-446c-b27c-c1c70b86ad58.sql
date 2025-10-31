-- Phase 2: Fix Global Tables - Add organization_id and proper RLS

-- 2.1 Add organization_id to ai_insights
ALTER TABLE ai_insights ADD COLUMN organization_id UUID;

-- Backfill: Since ai_insights are generated globally, we'll need to handle existing data
-- For now, set to NULL and require going forward
UPDATE ai_insights SET organization_id = NULL WHERE organization_id IS NULL;

-- 2.2 Add organization_id to ai_logs
ALTER TABLE ai_logs ADD COLUMN organization_id UUID;

-- Backfill from payload.team_id if exists
UPDATE ai_logs 
SET organization_id = (payload->>'team_id')::uuid 
WHERE payload ? 'team_id' AND organization_id IS NULL;

-- 2.3 Add organization_id to ai_usage
ALTER TABLE ai_usage ADD COLUMN organization_id UUID;

-- ai_usage is currently global, leave NULL for historical data
-- Going forward, edge functions will set this

-- 2.4 Add organization_id to referral_sources
ALTER TABLE referral_sources ADD COLUMN organization_id UUID;

-- Backfill: Duplicate referral sources for each existing organization
INSERT INTO referral_sources (name, organization_id, created_at)
SELECT rs.name, t.id, rs.created_at
FROM referral_sources rs
CROSS JOIN teams t
WHERE rs.organization_id IS NULL
ON CONFLICT DO NOTHING;

-- Delete old global referral_sources (after duplication)
DELETE FROM referral_sources WHERE organization_id IS NULL;

-- Make organization_id NOT NULL for referral_sources
ALTER TABLE referral_sources ALTER COLUMN organization_id SET NOT NULL;

-- 2.5 Add organization_id to referrals_weekly  
ALTER TABLE referrals_weekly ADD COLUMN organization_id UUID;

-- Backfill from source_id -> referral_sources.organization_id
UPDATE referrals_weekly rw
SET organization_id = rs.organization_id
FROM referral_sources rs
WHERE rw.source_id = rs.id AND rw.organization_id IS NULL;

-- Make organization_id NOT NULL for referrals_weekly
ALTER TABLE referrals_weekly ALTER COLUMN organization_id SET NOT NULL;

-- 2.6 Add organization_id to seats
ALTER TABLE seats ADD COLUMN organization_id UUID;

-- Backfill from user_id -> users.team_id
UPDATE seats s
SET organization_id = u.team_id
FROM users u
WHERE s.user_id = u.id AND s.organization_id IS NULL;

-- For seats without users, we can't backfill - leave NULL for now
-- Future seats must have organization_id

-- ============================================
-- Update RLS Policies for all tables
-- ============================================

-- AI INSIGHTS
DROP POLICY IF EXISTS "Admins can manage ai_insights" ON ai_insights;
DROP POLICY IF EXISTS "Authenticated users can read ai_insights" ON ai_insights;

CREATE POLICY "Admins can manage org ai_insights"
  ON ai_insights FOR ALL
  USING (is_admin() AND is_same_team(organization_id))
  WITH CHECK (is_admin() AND is_same_team(organization_id));

CREATE POLICY "Team members can read org ai_insights"
  ON ai_insights FOR SELECT
  USING (is_same_team(organization_id));

-- AI LOGS
DROP POLICY IF EXISTS "Admins can manage ai_logs" ON ai_logs;
DROP POLICY IF EXISTS "Authenticated users can read ai_logs" ON ai_logs;

CREATE POLICY "Admins can manage org ai_logs"
  ON ai_logs FOR ALL
  USING (is_admin() AND (organization_id IS NULL OR is_same_team(organization_id)))
  WITH CHECK (is_admin() AND is_same_team(organization_id));

CREATE POLICY "Team members can read org ai_logs"
  ON ai_logs FOR SELECT
  USING (organization_id IS NULL OR is_same_team(organization_id));

-- AI USAGE
DROP POLICY IF EXISTS "Admins can manage ai_usage" ON ai_usage;
DROP POLICY IF EXISTS "Authenticated users can read ai_usage" ON ai_usage;

CREATE POLICY "Admins can manage org ai_usage"
  ON ai_usage FOR ALL
  USING (is_admin() AND (organization_id IS NULL OR is_same_team(organization_id)))
  WITH CHECK (is_admin() AND is_same_team(organization_id));

CREATE POLICY "Team members can read org ai_usage"
  ON ai_usage FOR SELECT
  USING (organization_id IS NULL OR is_same_team(organization_id));

-- REFERRAL SOURCES
DROP POLICY IF EXISTS "Admins can manage referral_sources" ON referral_sources;
DROP POLICY IF EXISTS "Authenticated users can read referral_sources" ON referral_sources;
DROP POLICY IF EXISTS "Users can read referral_sources" ON referral_sources;

CREATE POLICY "Admins can manage org referral_sources"
  ON referral_sources FOR ALL
  USING (is_admin() AND is_same_team(organization_id))
  WITH CHECK (is_admin() AND is_same_team(organization_id));

CREATE POLICY "Team members can read org referral_sources"
  ON referral_sources FOR SELECT
  USING (is_same_team(organization_id));

-- REFERRALS WEEKLY
DROP POLICY IF EXISTS "Admins can manage referrals_weekly" ON referrals_weekly;
DROP POLICY IF EXISTS "Authenticated users can read referrals_weekly" ON referrals_weekly;
DROP POLICY IF EXISTS "Managers can manage referrals_weekly" ON referrals_weekly;
DROP POLICY IF EXISTS "Staff can read referrals_weekly" ON referrals_weekly;

CREATE POLICY "Admins can manage org referrals_weekly"
  ON referrals_weekly FOR ALL
  USING (is_admin() AND is_same_team(organization_id))
  WITH CHECK (is_admin() AND is_same_team(organization_id));

CREATE POLICY "Managers can manage org referrals_weekly"
  ON referrals_weekly FOR ALL
  USING (is_manager() AND is_same_team(organization_id))
  WITH CHECK (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Team members can read org referrals_weekly"
  ON referrals_weekly FOR SELECT
  USING (is_same_team(organization_id));

-- SEATS
DROP POLICY IF EXISTS "Admins can manage seats" ON seats;
DROP POLICY IF EXISTS "Managers can manage seats" ON seats;
DROP POLICY IF EXISTS "Staff can read seats" ON seats;

CREATE POLICY "Admins can manage org seats"
  ON seats FOR ALL
  USING (is_admin() AND (organization_id IS NULL OR is_same_team(organization_id)))
  WITH CHECK (is_admin() AND is_same_team(organization_id));

CREATE POLICY "Managers can manage org seats"
  ON seats FOR ALL
  USING (is_manager() AND (organization_id IS NULL OR is_same_team(organization_id)))
  WITH CHECK (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Team members can read org seats"
  ON seats FOR SELECT
  USING (organization_id IS NULL OR is_same_team(organization_id));

-- ============================================
-- Add indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ai_insights_organization_id ON ai_insights(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_organization_id ON ai_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_organization_id ON ai_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_referral_sources_organization_id ON referral_sources(organization_id);
CREATE INDEX IF NOT EXISTS idx_referrals_weekly_organization_id ON referrals_weekly(organization_id);
CREATE INDEX IF NOT EXISTS idx_seats_organization_id ON seats(organization_id);

-- ============================================
-- Security Definer View Review
-- ============================================
-- v_recall_metrics already filters by organization_id correctly
-- No changes needed - view is secure

COMMENT ON VIEW v_recall_metrics IS 'SECURITY DEFINER view that aggregates recall metrics per organization. Filters by organization_id to maintain tenant isolation.';