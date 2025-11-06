-- Add favorites and priority columns to metrics table
ALTER TABLE public.metrics 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS display_priority INTEGER DEFAULT 0;

-- Create index on favorites for quick filtering
CREATE INDEX IF NOT EXISTS idx_metrics_is_favorite ON public.metrics(is_favorite) WHERE is_favorite = true;

-- Add comments tracking to metrics for collaboration
CREATE TABLE IF NOT EXISTS public.metric_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id UUID NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on metric_comments
ALTER TABLE public.metric_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for metric_comments
CREATE POLICY "Users can view org metric comments"
  ON public.metric_comments
  FOR SELECT
  USING (is_same_team(organization_id));

CREATE POLICY "Users can insert org metric comments"
  ON public.metric_comments
  FOR INSERT
  WITH CHECK (is_same_team(organization_id) AND user_id = current_user_id());

CREATE POLICY "Users can update their own comments"
  ON public.metric_comments
  FOR UPDATE
  USING (user_id = current_user_id());

CREATE POLICY "Users can delete their own comments"
  ON public.metric_comments
  FOR DELETE
  USING (user_id = current_user_id() OR is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_metric_comments_updated_at
  BEFORE UPDATE ON public.metric_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();