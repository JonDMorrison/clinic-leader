-- Fix search_path security warning for auto_populate_jane_s3_config function
CREATE OR REPLACE FUNCTION public.auto_populate_jane_s3_config()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for Jane source system with partner_managed mode
  IF NEW.source_system = 'jane' AND (NEW.delivery_mode = 'partner_managed' OR NEW.delivery_mode IS NULL) THEN
    NEW.delivery_mode := 'partner_managed';
    NEW.s3_bucket := 'clinicleader-jane-ingest';
    NEW.s3_region := 'us-west-2';
    NEW.s3_prefix := 'org_' || NEW.organization_id || '/';
    NEW.s3_external_id := 'org_' || NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;