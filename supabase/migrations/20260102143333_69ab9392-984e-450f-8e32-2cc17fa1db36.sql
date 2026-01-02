-- Set partner_managed as default delivery_mode for new Jane connectors
ALTER TABLE public.bulk_analytics_connectors 
ALTER COLUMN delivery_mode SET DEFAULT 'partner_managed';

-- Create function to auto-populate S3 fields for new Jane connectors
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
$$ LANGUAGE plpgsql;

-- Create trigger to run before insert
DROP TRIGGER IF EXISTS auto_populate_jane_s3_config_trigger ON public.bulk_analytics_connectors;
CREATE TRIGGER auto_populate_jane_s3_config_trigger
  BEFORE INSERT ON public.bulk_analytics_connectors
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_jane_s3_config();