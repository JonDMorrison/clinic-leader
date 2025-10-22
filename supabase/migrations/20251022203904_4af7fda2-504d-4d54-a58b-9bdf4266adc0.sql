-- Add feedback fields to ai_logs
ALTER TABLE public.ai_logs 
ADD COLUMN IF NOT EXISTS feedback JSONB DEFAULT '{"score": null, "comment": null}'::jsonb;

-- Create AI usage tracking table
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  api_calls INTEGER NOT NULL DEFAULT 0,
  cost_estimate NUMERIC(10,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date)
);

-- Enable RLS
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_usage
CREATE POLICY "Admins can manage ai_usage"
  ON public.ai_usage
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Authenticated users can read ai_usage"
  ON public.ai_usage
  FOR SELECT
  USING (true);

-- Create index for date lookups
CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON public.ai_usage(date DESC);