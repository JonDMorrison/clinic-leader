-- Create table for admin impersonation audit log
CREATE TABLE public.admin_impersonation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  admin_email TEXT NOT NULL,
  target_user_email TEXT NOT NULL,
  target_organization_id UUID,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_impersonation_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view impersonation logs
CREATE POLICY "Admins can view impersonation logs"
ON public.admin_impersonation_logs
FOR SELECT
USING (is_admin());

-- Service role can insert logs
CREATE POLICY "Service role can insert impersonation logs"
ON public.admin_impersonation_logs
FOR INSERT
WITH CHECK (true);

-- Service role can update logs
CREATE POLICY "Service role can update impersonation logs"
ON public.admin_impersonation_logs
FOR UPDATE
USING (true);

-- Create indexes for performance
CREATE INDEX idx_admin_impersonation_logs_admin ON public.admin_impersonation_logs(admin_user_id);
CREATE INDEX idx_admin_impersonation_logs_target ON public.admin_impersonation_logs(target_user_id);
CREATE INDEX idx_admin_impersonation_logs_started ON public.admin_impersonation_logs(started_at DESC);