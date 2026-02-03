# Metric Semantics Governance – RLS Policies

**Created:** 2026-02-03  
**Status:** ✅ Implemented

## Overview

This document describes the Row-Level Security (RLS) policies for the metric semantics governance tables. These policies ensure strict access control based on organization membership and role.

## Role Model

The system uses these existing helper functions:

| Function | Description |
|----------|-------------|
| `is_same_team(org_id)` | Returns true if current user belongs to the specified organization |
| `is_admin()` | Returns true if current user has 'owner' or 'director' role |
| `is_master_admin()` | Returns true if current user has platform-level master admin access |

## Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `metric_definitions` | Org member | Org admin | Org admin | Org admin |
| `metric_normalization_rules` | Org member | Org admin | Org admin | Org admin |
| `metric_source_policies` | Org member | Org admin | Org admin | Org admin |
| `metric_precedence_overrides` | Org member | Org admin | Org admin | Org admin |
| `metric_canonical_results` | Org member | Service only | Service only | Service only |
| `metric_selection_audit_log` | Org admin | Service only | Service only | Service only |

## Detailed Policies

### 1. metric_definitions

Canonical metric meaning definitions.

```sql
-- SELECT: Org members can read definitions for their org's metrics
CREATE POLICY "metric_definitions_select_org_member"
ON public.metric_definitions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_definitions.metric_id
    AND is_same_team(m.organization_id)
  )
);

-- INSERT: Only org admins can create
CREATE POLICY "metric_definitions_insert_org_admin"
ON public.metric_definitions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.metrics m
    WHERE m.id = metric_definitions.metric_id
    AND is_same_team(m.organization_id)
    AND is_admin()
  )
);

-- UPDATE: Only org admins can modify
CREATE POLICY "metric_definitions_update_org_admin"
ON public.metric_definitions FOR UPDATE
TO authenticated
USING (...) WITH CHECK (...);

-- DELETE: Only org admins can remove
CREATE POLICY "metric_definitions_delete_org_admin"
ON public.metric_definitions FOR DELETE
TO authenticated
USING (...);
```

### 2. metric_normalization_rules

Rules for normalizing metric values.

**Same pattern as metric_definitions:**
- Org members: SELECT
- Org admins: INSERT, UPDATE, DELETE

### 3. metric_source_policies

Allowed data sources per metric with priority ordering.

**Same pattern as metric_definitions:**
- Org members: SELECT
- Org admins: INSERT, UPDATE, DELETE

### 4. metric_precedence_overrides

Organization-specific source preference overrides.

```sql
-- SELECT: Org members can read their org's overrides
CREATE POLICY "metric_precedence_overrides_select_org_member"
ON public.metric_precedence_overrides FOR SELECT
TO authenticated
USING (is_same_team(organization_id));

-- INSERT/UPDATE/DELETE: Only org admins
CREATE POLICY "metric_precedence_overrides_insert_org_admin"
ON public.metric_precedence_overrides FOR INSERT
TO authenticated
WITH CHECK (is_same_team(organization_id) AND is_admin());
```

### 5. metric_canonical_results

Materialized canonical results (the "chosen" value).

```sql
-- SELECT: Org members can read their org's canonical results
CREATE POLICY "metric_canonical_results_select_org_member"
ON public.metric_canonical_results FOR SELECT
TO authenticated
USING (is_same_team(organization_id));

-- No INSERT/UPDATE/DELETE policies
-- Writes are service-role only (via edge functions)
```

**Why service-role only writes?**
- Canonical results are computed programmatically
- Human manipulation would defeat the purpose of deterministic source selection
- Edge functions use service role which bypasses RLS

### 6. metric_selection_audit_log

Audit trail for selection decisions.

```sql
-- SELECT: Only org admins can read audit logs
CREATE POLICY "metric_selection_audit_log_select_org_admin"
ON public.metric_selection_audit_log FOR SELECT
TO authenticated
USING (is_same_team(organization_id) AND is_admin());

-- No INSERT/UPDATE/DELETE policies
-- Writes are service-role only (via edge functions)
```

**Why admin-only reads?**
- Audit logs may contain sensitive decision metadata
- Regular members don't need access to selection reasoning
- Admins can investigate discrepancies

## Access Examples

### ✅ Allowed Operations

| Scenario | Table | Operation | Result |
|----------|-------|-----------|--------|
| Staff member views metric definition | metric_definitions | SELECT | ✅ Allowed |
| Admin creates normalization rule | metric_normalization_rules | INSERT | ✅ Allowed |
| Admin updates source priority | metric_source_policies | UPDATE | ✅ Allowed |
| Member reads canonical result | metric_canonical_results | SELECT | ✅ Allowed |
| Admin reads selection audit | metric_selection_audit_log | SELECT | ✅ Allowed |
| Edge function writes canonical result | metric_canonical_results | INSERT | ✅ Allowed (service role) |

### ❌ Denied Operations

| Scenario | Table | Operation | Result |
|----------|-------|-----------|--------|
| Staff member tries to create definition | metric_definitions | INSERT | ❌ Denied (not admin) |
| User from different org reads definitions | metric_definitions | SELECT | ❌ Denied (wrong org) |
| Client app tries to write canonical result | metric_canonical_results | INSERT | ❌ Denied (no policy) |
| Staff member reads audit log | metric_selection_audit_log | SELECT | ❌ Denied (not admin) |
| Admin tries to manipulate audit log | metric_selection_audit_log | UPDATE | ❌ Denied (no policy) |

## Service Role Access

Edge functions that need to write to protected tables:

1. **Canonical Result Computation**
   - Writes to `metric_canonical_results`
   - Writes to `metric_selection_audit_log`
   - Uses service role key

2. **Scheduled Refresh Jobs**
   - Recomputes canonical results periodically
   - Uses service role key

## Testing Policies

### Test 1: Staff member SELECT

```sql
-- As authenticated staff user
SELECT * FROM metric_definitions;
-- Should return: definitions for user's org metrics only
```

### Test 2: Admin INSERT

```sql
-- As authenticated admin user
INSERT INTO metric_definitions (metric_id, canonical_name, ...)
VALUES ('metric-uuid', 'Test', ...);
-- Should succeed if metric belongs to admin's org
```

### Test 3: Client canonical write (should fail)

```sql
-- As authenticated user (not service role)
INSERT INTO metric_canonical_results (...)
VALUES (...);
-- Should fail: new row violates row-level security policy
```

### Test 4: Cross-org access (should fail)

```sql
-- As authenticated user from org A
SELECT * FROM metric_definitions
WHERE metric_id = 'metric-from-org-B';
-- Should return: empty (no rows visible)
```

## Benchmark Tables

The following benchmark tables remain **master-admin only** and are not affected by these policies:

- `benchmark_cohorts`
- `benchmark_cohort_memberships`
- `benchmark_snapshots`
- `benchmark_metric_aggregates`
- `benchmark_audit_log`

These use `is_master_admin()` for all operations.

## Security Considerations

1. **No recursive policies**: Policies use `is_same_team()` and `is_admin()` helper functions which are `SECURITY DEFINER` with explicit `search_path`

2. **Service role bypass**: Service role bypasses RLS, used only by trusted edge functions

3. **Audit immutability**: No UPDATE/DELETE policies on audit log prevents tampering

4. **Principle of least privilege**: Staff can only read; admins can modify definitions but not computed results

## Future Enhancements

1. **Manager role**: Add intermediate role between staff and admin
2. **Metric-level permissions**: Per-metric access control
3. **Time-based access**: Temporary elevated access for auditors
