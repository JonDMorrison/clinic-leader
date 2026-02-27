
-- Indexes to support generate-clinic-insights edge function queries.
-- Each query filters: WHERE organization_id = $1 AND <date_col> BETWEEN $2 AND $3

-- staging_appointments_jane: filtered by start_at range
CREATE INDEX IF NOT EXISTS idx_staging_appts_org_start
  ON public.staging_appointments_jane (organization_id, start_at);

-- staging_payments_jane: filtered by received_at range
CREATE INDEX IF NOT EXISTS idx_staging_payments_org_received
  ON public.staging_payments_jane (organization_id, received_at);

-- staging_invoices_jane: filtered by invoiced_at range
CREATE INDEX IF NOT EXISTS idx_staging_invoices_org_invoiced
  ON public.staging_invoices_jane (organization_id, invoiced_at);

-- staging_shifts_jane: filtered by start_at range
CREATE INDEX IF NOT EXISTS idx_staging_shifts_org_start
  ON public.staging_shifts_jane (organization_id, start_at);
