-- Fix the compliance view to use security invoker (default, safer)
DROP VIEW IF EXISTS v_data_scope_compliance;

CREATE VIEW v_data_scope_compliance WITH (security_invoker = true) AS
SELECT 
  q.organization_id,
  q.connector_id,
  DATE(q.created_at) as log_date,
  COUNT(*) as total_violations,
  COUNT(*) FILTER (WHERE q.severity = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE q.severity = 'warning') as warning_count,
  COUNT(DISTINCT q.field_name) as unique_fields_flagged,
  COUNT(DISTINCT q.file_name) as files_affected
FROM quarantined_fields_log q
GROUP BY q.organization_id, q.connector_id, DATE(q.created_at);