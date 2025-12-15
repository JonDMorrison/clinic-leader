-- Add organization_id and meeting_id to todos table
ALTER TABLE public.todos 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.teams(id),
ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES public.meetings(id);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_todos_meeting_id ON public.todos(meeting_id);
CREATE INDEX IF NOT EXISTS idx_todos_organization_id ON public.todos(organization_id);
CREATE INDEX IF NOT EXISTS idx_todos_org_status ON public.todos(organization_id, done_at);

-- Update existing RLS policies to include organization check
DROP POLICY IF EXISTS "Admins can manage all todos" ON public.todos;
DROP POLICY IF EXISTS "Managers can manage team todos" ON public.todos;
DROP POLICY IF EXISTS "Staff can manage their own todos" ON public.todos;
DROP POLICY IF EXISTS "Staff can read team todos" ON public.todos;

-- New RLS policies with org scope
CREATE POLICY "Admins can manage all todos" ON public.todos
FOR ALL USING (is_admin() AND is_same_team(organization_id))
WITH CHECK (is_admin() AND is_same_team(organization_id));

CREATE POLICY "Managers can manage team todos" ON public.todos
FOR ALL USING (is_manager() AND is_same_team(organization_id))
WITH CHECK (is_manager() AND is_same_team(organization_id));

CREATE POLICY "Staff can manage their own todos" ON public.todos
FOR ALL USING (owner_id = current_user_id() AND is_same_team(organization_id))
WITH CHECK (owner_id = current_user_id() AND is_same_team(organization_id));

CREATE POLICY "Team members can read org todos" ON public.todos
FOR SELECT USING (is_same_team(organization_id));