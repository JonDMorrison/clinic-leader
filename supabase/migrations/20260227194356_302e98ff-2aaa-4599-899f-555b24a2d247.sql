-- Cleanup: if duplicates exist for (organization_id, source_system),
-- keep only the most recently updated active row, delete others.
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, source_system
      ORDER BY
        CASE WHEN status IN ('receiving_data', 'active') THEN 0 ELSE 1 END,
        updated_at DESC
    ) AS rn
  FROM public.bulk_analytics_connectors
)
DELETE FROM public.bulk_analytics_connectors
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Add unique constraint to enforce at most one connector per (org, source)
ALTER TABLE public.bulk_analytics_connectors
ADD CONSTRAINT uq_org_source UNIQUE (organization_id, source_system);