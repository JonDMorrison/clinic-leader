-- Add 'detection' to intervention_origin_type enum for assisted detection engine
ALTER TYPE public.intervention_origin_type ADD VALUE IF NOT EXISTS 'detection';