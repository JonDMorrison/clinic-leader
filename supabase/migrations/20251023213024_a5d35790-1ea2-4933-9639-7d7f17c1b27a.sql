-- Clear out all existing KPI readings to start fresh
DELETE FROM public.kpi_readings 
WHERE kpi_id IN (
  SELECT id FROM public.kpis 
  WHERE owner_id = '7d9cb4eb-5f16-4153-b279-41bc0d70a66a'
);

-- Clear out AR aging data
DELETE FROM public.ar_aging;

-- Clear out staging tables
DELETE FROM public.staging_appointments;
DELETE FROM public.staging_patients;
DELETE FROM public.staging_payments;
DELETE FROM public.staging_ar_lines;

-- Clear out file ingest logs
DELETE FROM public.file_ingest_log;