-- Create configuration_events table for audit logging of data source changes
CREATE TABLE public.configuration_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for efficient querying by organization
CREATE INDEX idx_configuration_events_org ON public.configuration_events(organization_id);
CREATE INDEX idx_configuration_events_type ON public.configuration_events(event_type);
CREATE INDEX idx_configuration_events_created ON public.configuration_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.configuration_events ENABLE ROW LEVEL SECURITY;

-- Policy: Organization members can view their org's events
CREATE POLICY "Organization members can view configuration events"
ON public.configuration_events
FOR SELECT
TO authenticated
USING (organization_id = public.current_user_team());

-- Policy: Organization members can insert events for their org
CREATE POLICY "Organization members can log configuration events"
ON public.configuration_events
FOR INSERT
TO authenticated
WITH CHECK (organization_id = public.current_user_team());

-- Add comment
COMMENT ON TABLE public.configuration_events IS 'Audit log for configuration changes including data source switching';