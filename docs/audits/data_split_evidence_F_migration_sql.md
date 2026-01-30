# F) Migration SQL

## Add data_mode Column to Teams

```sql
-- Add data_mode column with default 'legacy'
ALTER TABLE public.teams 
ADD COLUMN data_mode text NOT NULL DEFAULT 'legacy';

-- Add constraint to restrict values
ALTER TABLE public.teams 
ADD CONSTRAINT teams_data_mode_check 
CHECK (data_mode IN ('legacy', 'jane'));

-- Add comment for documentation
COMMENT ON COLUMN public.teams.data_mode IS 
'Controls which /data view to render: legacy (manual/Excel) or jane (integration)';
```

## Backfill SQL for Existing Jane Accounts

```sql
-- Set data_mode to 'jane' for organizations with active Jane connector
UPDATE public.teams t
SET data_mode = 'jane'
WHERE EXISTS (
  SELECT 1 
  FROM public.bulk_analytics_connectors c 
  WHERE c.organization_id = t.id 
    AND c.source_system = 'jane'
    AND c.status IN ('receiving_data', 'awaiting_first_file', 'active', 'awaiting_jane_setup')
);
```

## Verification Query

```sql
-- Check distribution after migration
SELECT 
  data_mode,
  COUNT(*) as team_count
FROM public.teams
GROUP BY data_mode;
```

## Expected Result

| data_mode | team_count |
|-----------|------------|
| legacy    | (majority) |
| jane      | (few with active connectors) |

## Rollback SQL (if needed)

```sql
-- Remove constraint first
ALTER TABLE public.teams 
DROP CONSTRAINT IF EXISTS teams_data_mode_check;

-- Remove column
ALTER TABLE public.teams 
DROP COLUMN IF EXISTS data_mode;
```

## Admin UI Requirement

To allow switching data_mode per organization:

1. Add toggle in Organization Settings (`/settings/organization`)
2. Or add to Admin Dashboard (`/admin`)

**UNVERIFIED** - Specific admin UI file paths need confirmation.

## TypeScript Type Update

After migration, `src/integrations/supabase/types.ts` will auto-update to include:

```typescript
teams: {
  Row: {
    // ...existing fields
    data_mode: string  // 'legacy' | 'jane'
  }
}
```
