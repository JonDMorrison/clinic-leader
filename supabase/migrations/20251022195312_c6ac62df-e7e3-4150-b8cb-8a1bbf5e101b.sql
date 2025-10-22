-- Fix critical security issues: Drop overly permissive policies on staging tables

DROP POLICY IF EXISTS "Authenticated users can read staging_appointments" ON public.staging_appointments;
DROP POLICY IF EXISTS "Authenticated users can read staging_patients" ON public.staging_patients;
DROP POLICY IF EXISTS "Authenticated users can read staging_ar_lines" ON public.staging_ar_lines;
DROP POLICY IF EXISTS "Authenticated users can read staging_payments" ON public.staging_payments;
DROP POLICY IF EXISTS "Authenticated users can read audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Authenticated users can read file_ingest_log" ON public.file_ingest_log;

-- These tables now have proper policies from previous migration:
-- - Admins can manage staging tables
-- - Billing can manage staging tables
-- - Admin can read audit_log