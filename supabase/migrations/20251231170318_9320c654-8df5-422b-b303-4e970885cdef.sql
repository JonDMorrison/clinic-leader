-- Add new status values to bulk_connector_status enum
ALTER TYPE bulk_connector_status ADD VALUE IF NOT EXISTS 'requested';
ALTER TYPE bulk_connector_status ADD VALUE IF NOT EXISTS 'awaiting_jane_setup';
ALTER TYPE bulk_connector_status ADD VALUE IF NOT EXISTS 'awaiting_first_file';
ALTER TYPE bulk_connector_status ADD VALUE IF NOT EXISTS 'receiving_data';

-- Add clinic_identifier column to bulk_analytics_connectors
ALTER TABLE bulk_analytics_connectors 
ADD COLUMN IF NOT EXISTS clinic_identifier text;