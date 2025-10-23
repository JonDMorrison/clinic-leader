-- Fix security definer view issue
DROP VIEW IF EXISTS v_recall_metrics;

-- Recreate without SECURITY DEFINER (uses invoker's permissions + RLS)
CREATE VIEW v_recall_metrics AS
SELECT
  organization_id,
  COUNT(*) FILTER (WHERE status='Open' AND due_date < CURRENT_DATE) as past_due,
  COUNT(*) FILTER (WHERE status='Open' AND due_date = CURRENT_DATE) as due_today,
  COUNT(*) FILTER (WHERE status='Open' AND due_date > CURRENT_DATE) as upcoming,
  COUNT(*) as total_open
FROM recalls
WHERE status = 'Open'
GROUP BY organization_id;