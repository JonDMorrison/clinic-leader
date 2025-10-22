-- Helper functions for RLS policies (security definer to avoid recursion)

-- Get current user's public.users record ID
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE email = auth.email() LIMIT 1;
$$;

-- Get current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE email = auth.email() LIMIT 1;
$$;

-- Get current user's team ID
CREATE OR REPLACE FUNCTION public.current_user_team()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.users WHERE email = auth.email() LIMIT 1;
$$;

-- Check if current user has admin privileges (owner or director)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE email = auth.email() 
    AND role IN ('owner', 'director')
  );
$$;

-- Check if current user is a manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE email = auth.email() 
    AND role = 'manager'
  );
$$;

-- Check if current user has billing role
CREATE OR REPLACE FUNCTION public.is_billing()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE email = auth.email() 
    AND role = 'billing'
  );
$$;

-- Check if record belongs to current user's team
CREATE OR REPLACE FUNCTION public.is_same_team(check_team_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE email = auth.email() 
    AND team_id = check_team_id
  );
$$;

-- Drop existing placeholder policies
DROP POLICY IF EXISTS "Authenticated users can read users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can read kpis" ON public.kpis;
DROP POLICY IF EXISTS "Authenticated users can read kpi_readings" ON public.kpi_readings;
DROP POLICY IF EXISTS "Authenticated users can read rocks" ON public.rocks;
DROP POLICY IF EXISTS "Authenticated users can read issues" ON public.issues;
DROP POLICY IF EXISTS "Authenticated users can read todos" ON public.todos;
DROP POLICY IF EXISTS "Authenticated users can read docs" ON public.docs;
DROP POLICY IF EXISTS "Authenticated users can read acknowledgements" ON public.acknowledgements;
DROP POLICY IF EXISTS "Authenticated users can read ar_aging" ON public.ar_aging;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Admin: full access
CREATE POLICY "Admins can read all users" ON public.users
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert users" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update users" ON public.users
  FOR UPDATE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete users" ON public.users
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Manager: read/write their team
CREATE POLICY "Managers can read their team users" ON public.users
  FOR SELECT TO authenticated
  USING (public.is_manager() AND public.is_same_team(team_id));

CREATE POLICY "Managers can update their team users" ON public.users
  FOR UPDATE TO authenticated
  USING (public.is_manager() AND public.is_same_team(team_id));

-- Staff: read their team
CREATE POLICY "Staff can read their team users" ON public.users
  FOR SELECT TO authenticated
  USING (public.is_same_team(team_id));

-- ============================================
-- KPIs TABLE POLICIES
-- ============================================

-- Admin: full access
CREATE POLICY "Admins can manage all kpis" ON public.kpis
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Manager: full access for their team's KPIs
CREATE POLICY "Managers can read team kpis" ON public.kpis
  FOR SELECT TO authenticated
  USING (
    public.is_manager() AND 
    owner_id IN (SELECT id FROM public.users WHERE team_id = public.current_user_team())
  );

CREATE POLICY "Managers can manage team kpis" ON public.kpis
  FOR ALL TO authenticated
  USING (
    public.is_manager() AND 
    owner_id IN (SELECT id FROM public.users WHERE team_id = public.current_user_team())
  )
  WITH CHECK (
    public.is_manager() AND 
    owner_id IN (SELECT id FROM public.users WHERE team_id = public.current_user_team())
  );

-- Staff/Provider: read team scorecard
CREATE POLICY "Staff can read team kpis" ON public.kpis
  FOR SELECT TO authenticated
  USING (
    owner_id IN (SELECT id FROM public.users WHERE team_id = public.current_user_team())
  );

-- Billing: read all
CREATE POLICY "Billing can read all kpis" ON public.kpis
  FOR SELECT TO authenticated
  USING (public.is_billing());

-- ============================================
-- KPI_READINGS TABLE POLICIES
-- ============================================

-- Admin: full access
CREATE POLICY "Admins can manage all kpi_readings" ON public.kpi_readings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Manager: full access for their team's KPI readings
CREATE POLICY "Managers can manage team kpi_readings" ON public.kpi_readings
  FOR ALL TO authenticated
  USING (
    public.is_manager() AND 
    kpi_id IN (
      SELECT id FROM public.kpis 
      WHERE owner_id IN (SELECT id FROM public.users WHERE team_id = public.current_user_team())
    )
  )
  WITH CHECK (
    public.is_manager() AND 
    kpi_id IN (
      SELECT id FROM public.kpis 
      WHERE owner_id IN (SELECT id FROM public.users WHERE team_id = public.current_user_team())
    )
  );

-- Staff/Provider: read team scorecard
CREATE POLICY "Staff can read team kpi_readings" ON public.kpi_readings
  FOR SELECT TO authenticated
  USING (
    kpi_id IN (
      SELECT id FROM public.kpis 
      WHERE owner_id IN (SELECT id FROM public.users WHERE team_id = public.current_user_team())
    )
  );

-- Billing: read all
CREATE POLICY "Billing can read all kpi_readings" ON public.kpi_readings
  FOR SELECT TO authenticated
  USING (public.is_billing());

-- ============================================
-- ROCKS TABLE POLICIES
-- ============================================

-- Admin: full access
CREATE POLICY "Admins can manage all rocks" ON public.rocks
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Manager: full access for their team
CREATE POLICY "Managers can manage team rocks" ON public.rocks
  FOR ALL TO authenticated
  USING (
    public.is_manager() AND 
    owner_id IN (SELECT id FROM public.users WHERE team_id = public.current_user_team())
  )
  WITH CHECK (
    public.is_manager() AND 
    owner_id IN (SELECT id FROM public.users WHERE team_id = public.current_user_team())
  );

-- Staff: read only
CREATE POLICY "Staff can read team rocks" ON public.rocks
  FOR SELECT TO authenticated
  USING (
    owner_id IN (SELECT id FROM public.users WHERE team_id = public.current_user_team())
  );

-- ============================================
-- ISSUES TABLE POLICIES
-- ============================================

-- Admin: full access
CREATE POLICY "Admins can manage all issues" ON public.issues
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Manager: full access for their team
CREATE POLICY "Managers can manage team issues" ON public.issues
  FOR ALL TO authenticated
  USING (public.is_manager() AND public.is_same_team(team_id))
  WITH CHECK (public.is_manager() AND public.is_same_team(team_id));

-- Staff: read only
CREATE POLICY "Staff can read team issues" ON public.issues
  FOR SELECT TO authenticated
  USING (public.is_same_team(team_id));

-- ============================================
-- TODOS TABLE POLICIES
-- ============================================

-- Admin: full access
CREATE POLICY "Admins can manage all todos" ON public.todos
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Manager: full access for their team
CREATE POLICY "Managers can manage team todos" ON public.todos
  FOR ALL TO authenticated
  USING (
    public.is_manager() AND 
    owner_id IN (SELECT id FROM public.users WHERE team_id = public.current_user_team())
  )
  WITH CHECK (
    public.is_manager() AND 
    owner_id IN (SELECT id FROM public.users WHERE team_id = public.current_user_team())
  );

-- Staff: read team todos, write their own
CREATE POLICY "Staff can read team todos" ON public.todos
  FOR SELECT TO authenticated
  USING (
    owner_id IN (SELECT id FROM public.users WHERE team_id = public.current_user_team())
  );

CREATE POLICY "Staff can manage their own todos" ON public.todos
  FOR ALL TO authenticated
  USING (owner_id = public.current_user_id())
  WITH CHECK (owner_id = public.current_user_id());

-- ============================================
-- DOCS TABLE POLICIES
-- ============================================

-- Admin: full access
CREATE POLICY "Admins can manage all docs" ON public.docs
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Manager: full access
CREATE POLICY "Managers can manage docs" ON public.docs
  FOR ALL TO authenticated
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

-- Staff: read only
CREATE POLICY "Staff can read docs" ON public.docs
  FOR SELECT TO authenticated
  USING (true);

-- ============================================
-- ACKNOWLEDGEMENTS TABLE POLICIES
-- ============================================

-- Admin: read all
CREATE POLICY "Admins can read all acknowledgements" ON public.acknowledgements
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Manager: read team acknowledgements
CREATE POLICY "Managers can read team acknowledgements" ON public.acknowledgements
  FOR SELECT TO authenticated
  USING (
    public.is_manager() AND 
    user_id IN (SELECT id FROM public.users WHERE team_id = public.current_user_team())
  );

-- All users: write their own acknowledgements
CREATE POLICY "Users can manage their own acknowledgements" ON public.acknowledgements
  FOR ALL TO authenticated
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- ============================================
-- AR_AGING TABLE POLICIES
-- ============================================

-- Admin: full access
CREATE POLICY "Admins can manage ar_aging" ON public.ar_aging
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Billing: full access
CREATE POLICY "Billing can manage ar_aging" ON public.ar_aging
  FOR ALL TO authenticated
  USING (public.is_billing())
  WITH CHECK (public.is_billing());

-- Billing: read scorecard (already covered by kpi policies)

-- ============================================
-- TEAMS TABLE POLICIES
-- ============================================

-- Admin: full access
CREATE POLICY "Admins can manage teams" ON public.teams
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- All users: read their team
CREATE POLICY "Users can read teams" ON public.teams
  FOR SELECT TO authenticated
  USING (id = public.current_user_team() OR public.is_admin());

-- ============================================
-- ADDITIONAL TABLES (read access for relevant roles)
-- ============================================

CREATE POLICY "Admins can manage meetings" ON public.meetings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Team members can read meetings" ON public.meetings
  FOR SELECT TO authenticated
  USING (public.is_same_team(team_id));

CREATE POLICY "Managers can manage team meetings" ON public.meetings
  FOR ALL TO authenticated
  USING (public.is_manager() AND public.is_same_team(team_id))
  WITH CHECK (public.is_manager() AND public.is_same_team(team_id));

CREATE POLICY "Admins can manage meeting_notes" ON public.meeting_notes
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Team members can read meeting_notes" ON public.meeting_notes
  FOR SELECT TO authenticated
  USING (
    meeting_id IN (
      SELECT id FROM public.meetings WHERE team_id = public.current_user_team()
    )
  );

CREATE POLICY "Managers can manage team meeting_notes" ON public.meeting_notes
  FOR ALL TO authenticated
  USING (
    public.is_manager() AND 
    meeting_id IN (
      SELECT id FROM public.meetings WHERE team_id = public.current_user_team()
    )
  )
  WITH CHECK (
    public.is_manager() AND 
    meeting_id IN (
      SELECT id FROM public.meetings WHERE team_id = public.current_user_team()
    )
  );

CREATE POLICY "Admins can manage referral_sources" ON public.referral_sources
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can read referral_sources" ON public.referral_sources
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage referrals_weekly" ON public.referrals_weekly
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Managers can manage referrals_weekly" ON public.referrals_weekly
  FOR ALL TO authenticated
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

CREATE POLICY "Staff can read referrals_weekly" ON public.referrals_weekly
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can read audit_log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Staging tables: admin and billing only
CREATE POLICY "Admins can manage staging_appointments" ON public.staging_appointments
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_billing())
  WITH CHECK (public.is_admin() OR public.is_billing());

CREATE POLICY "Admins can manage staging_patients" ON public.staging_patients
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_billing())
  WITH CHECK (public.is_admin() OR public.is_billing());

CREATE POLICY "Admins can manage staging_ar_lines" ON public.staging_ar_lines
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_billing())
  WITH CHECK (public.is_admin() OR public.is_billing());

CREATE POLICY "Admins can manage staging_payments" ON public.staging_payments
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_billing())
  WITH CHECK (public.is_admin() OR public.is_billing());

CREATE POLICY "Admins can manage file_ingest_log" ON public.file_ingest_log
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_billing())
  WITH CHECK (public.is_admin() OR public.is_billing());