-- Create metric_results_audit table for tracking all changes
CREATE TABLE public.metric_results_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_result_id UUID NOT NULL REFERENCES public.metric_results(id) ON DELETE CASCADE,
  old_value NUMERIC,
  new_value NUMERIC,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.metric_results_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can read all audit records"
ON public.metric_results_audit
FOR SELECT
USING (
  is_admin() OR is_manager()
);

CREATE POLICY "System can insert audit records"
ON public.metric_results_audit
FOR INSERT
WITH CHECK (
  changed_by = current_user_id()
);

-- Add index for performance
CREATE INDEX idx_metric_results_audit_metric_result_id ON public.metric_results_audit(metric_result_id);
CREATE INDEX idx_metric_results_audit_changed_at ON public.metric_results_audit(changed_at DESC);

-- Add previous_value column to metric_results for override tracking
ALTER TABLE public.metric_results ADD COLUMN IF NOT EXISTS previous_value NUMERIC;
ALTER TABLE public.metric_results ADD COLUMN IF NOT EXISTS overridden_at TIMESTAMP WITH TIME ZONE;