-- Help hints tracking tables
CREATE TABLE IF NOT EXISTS public.help_dismissed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  dismissed BOOLEAN DEFAULT true,
  dismissed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (team_id, user_id, term)
);

CREATE TABLE IF NOT EXISTS public.help_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  term TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('view','dismiss','open_docs')),
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.help_dismissed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for help_dismissed
CREATE POLICY "Users can manage their own help dismissals"
  ON public.help_dismissed
  FOR ALL
  TO authenticated
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

CREATE POLICY "Admins can read all help dismissals"
  ON public.help_dismissed
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- RLS Policies for help_events
CREATE POLICY "Users can insert their own help events"
  ON public.help_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = current_user_id());

CREATE POLICY "Admins can read all help events"
  ON public.help_events
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Managers can read team help events"
  ON public.help_events
  FOR SELECT
  TO authenticated
  USING (is_manager() AND is_same_team(team_id));

-- Indexes for performance
CREATE INDEX idx_help_dismissed_user_term ON public.help_dismissed(user_id, term);
CREATE INDEX idx_help_events_user_created ON public.help_events(user_id, created_at DESC);
CREATE INDEX idx_help_events_term_action ON public.help_events(term, action);