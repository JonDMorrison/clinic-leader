-- Create system regression events table for observability
CREATE TABLE public.system_regression_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warn' CHECK (severity IN ('info', 'warn', 'error')),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  organization_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_regression_events_type_time ON public.system_regression_events (event_type, created_at DESC);
CREATE INDEX idx_regression_events_org ON public.system_regression_events (organization_id, created_at DESC);

ALTER TABLE public.system_regression_events ENABLE ROW LEVEL SECURITY;

-- Owners can view regression events
CREATE POLICY "Owners can view regression events"
  ON public.system_regression_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

-- Authenticated users can insert their own events
CREATE POLICY "Users can log regression events"
  ON public.system_regression_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.system_regression_events IS 'Logs reliability regression events: AI schema failures, function health failures, storage migrations, metric visibility conflicts';