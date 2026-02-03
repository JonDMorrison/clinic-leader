# Benchmark Security Contract

## Overview

This document defines the security model for cross-organization benchmark data in ClinicLeader. Benchmark data is **extremely sensitive** as it aggregates performance across multiple organizations - any leak could expose competitive intelligence.

---

## 1. Threat Model

### Assets Protected

| Asset | Sensitivity | Risk if Leaked |
|-------|-------------|----------------|
| Organization membership in cohorts | HIGH | Reveals who competes with whom |
| Individual org metric values | CRITICAL | Competitive intelligence |
| Aggregate statistics (p25/p50/p75) | MEDIUM | Safe if sample size ≥5 |
| Cohort definitions | LOW | Public knowledge |

### Threat Actors

| Actor | Capability | Mitigation |
|-------|------------|------------|
| Authenticated non-admin user | Direct table queries, RPC calls | RLS blocks all access |
| Org admin (non-master) | Same as above + org-level access | RLS + RPC permission checks |
| Master admin (legitimate) | Full access via RPCs | Audit logging, sample suppression |
| Compromised master admin | Full access | Audit trail for forensics |
| SQL injection attempt | Malformed RPC parameters | search_path lock, parameterized queries |

---

## 2. Access Control Matrix

### Who Can See What

| Data Type | Regular User | Org Admin | Master Admin |
|-----------|--------------|-----------|--------------|
| Raw benchmark tables | ❌ 0 rows | ❌ 0 rows | ❌ Direct blocked |
| Cohort list | ❌ | ❌ | ✅ via RPC only |
| Cohort members | ❌ | ❌ | ✅ via RPC only |
| Snapshots (n≥5) | ❌ | ❌ | ✅ via RPC only |
| Snapshots (n<5) | ❌ | ❌ | ⚠️ NULLs returned |
| Own org vs cohort | ❌ | ✅ `org_get_benchmark_summary` | ✅ |
| Audit log | ❌ | ❌ | ✅ via RPC only |

### RLS Policy Summary

All benchmark tables have RLS enabled with **master admin only** policies:

```sql
-- All benchmark tables use this pattern
CREATE POLICY "Master admins can select..."
ON public.benchmark_* FOR SELECT
TO authenticated
USING (public.is_master_admin());
```

**Critical Fix Applied**: `benchmark_metric_aggregates` previously had `USING (true)` - now locked to master admin only.

---

## 3. RPC Access Path

All cross-org benchmark data MUST flow through these SECURITY DEFINER RPCs:

### Available RPCs

| RPC | Purpose | Audit Action | Suppression |
|-----|---------|--------------|-------------|
| `bench_get_cohorts()` | List all cohorts with member counts | `list_cohorts` | N/A |
| `bench_get_cohort_members(cohort_id)` | Get teams + EMR source in a cohort | `list_cohort_members` | N/A |
| `bench_list_snapshots(cohort_id, limit)` | List snapshots with suppression | `list_snapshots` | ✅ n<5 → NULLs |
| `bench_get_snapshot(snapshot_id)` | Get single snapshot + confidence | `get_snapshot` | ✅ n<5 → NULLs |
| `bench_get_aggregate_comparison(metric_key, period_key)` | Compare Jane vs non-Jane | `get_aggregate_comparison` | ✅ per-group |
| `bench_compute_snapshot(...)` | Generate new snapshot | `compute_snapshot` | ✅ on return |
| `bench_refresh_default_cohorts()` | Rebuild jane/non-jane cohorts | `refresh_default_cohorts` | N/A |
| `bench_create_cohort(name, desc)` | Create new cohort | `create_cohort` | N/A |
| `bench_delete_cohort(cohort_id)` | Delete cohort | `delete_cohort` | N/A |
| `bench_add_cohort_member(cohort_id, team_id)` | Add team to cohort | `add_cohort_member` | N/A |
| `bench_remove_cohort_member(cohort_id, team_id)` | Remove team from cohort | `remove_cohort_member` | N/A |
| `bench_search_teams(search)` | Search all teams | N/A | N/A |
| `bench_get_audit_log(limit)` | View audit log | N/A | N/A |
| `org_get_benchmark_summary(...)` | Org admin: own org vs cohort | (org-scoped, not master) | ✅ |

### RPC Security Properties

Every master-admin RPC:

1. **Hard permission check first**:
   ```sql
   IF NOT public.is_master_admin() THEN
     RAISE EXCEPTION 'Permission denied: Master admin access required';
   END IF;
   ```

2. **Explicit search_path**:
   ```sql
   SET search_path = public
   ```

3. **Audit logging before data return**:
   ```sql
   INSERT INTO public.benchmark_audit_log (user_id, action, details)
   VALUES (auth.uid(), 'action_name', jsonb_build_object(...));
   ```

4. **Sample suppression** (for aggregates):
   ```sql
   CASE WHEN n_orgs >= 5 THEN value ELSE NULL END
   ```

---

## 4. Sample Size Suppression Rules

To prevent identification of individual organizations:

| Condition | Behavior |
|-----------|----------|
| `n_orgs >= 5` | Full statistics returned |
| `n_orgs < 5` | All numeric fields return `NULL` |
| `n_orgs < 5` | `suppressed = true` flag set |
| `n_orgs < 5` | `suppression_reason = 'Insufficient sample size (min 5 orgs required)'` |

### What Gets Suppressed

When sample size < 5, these fields become NULL:
- `n_orgs` (the count itself)
- `p10`, `p25`, `p50`, `p75`, `p90`
- `mean`, `stddev`
- `delta_percent` (in comparisons)

### What Remains Visible

Even when suppressed:
- `id`, `cohort_id`, `metric_id` (identifiers)
- `period_type`, `period_start` (time reference)
- `computed_at` (metadata)
- `suppressed` flag (always visible)
- `suppression_reason` (explains why)

---

## 5. Audit Trail

### Logged Events

Every RPC call logs to `benchmark_audit_log`:

```sql
{
  "id": "uuid",
  "user_id": "master-admin-uuid",
  "action": "list_snapshots",
  "details": {
    "cohort_id": "...",
    "limit": 24,
    "suppressed": false
  },
  "created_at": "2026-02-03T21:00:00Z"
}
```

### Retention

Audit logs are retained indefinitely for compliance and forensics.

---

## 6. Example Queries

### ✅ ALLOWED: Master admin via RPC

```sql
-- List cohorts
SELECT * FROM bench_get_cohorts();

-- Get snapshot with suppression
SELECT * FROM bench_get_snapshot('snapshot-uuid');
-- Returns NULLs if n_orgs < 5
```

### ❌ BLOCKED: Direct table access (any user)

```sql
-- Returns 0 rows for non-master users
SELECT * FROM benchmark_snapshots;
SELECT * FROM benchmark_cohorts;
SELECT * FROM benchmark_metric_aggregates;
```

### ❌ BLOCKED: Non-master RPC calls

```sql
-- Raises exception for non-master users
SELECT * FROM bench_get_cohorts();
-- ERROR: Permission denied: Master admin access required
```

### ✅ ALLOWED: Org admin own-org summary

```sql
-- Returns only caller's org data vs anonymized cohort
SELECT * FROM org_get_benchmark_summary('metric-uuid', 'monthly', '2026-01-01');
-- Returns bucket label like "top_25" without exposing other orgs
```

---

## 7. Implementation Checklist

- [x] RLS enabled on all benchmark tables
- [x] Master-admin-only policies on all benchmark tables
- [x] Fixed `benchmark_metric_aggregates` open policy vulnerability
- [x] SECURITY DEFINER on all benchmark RPCs
- [x] `search_path = public` on all RPCs
- [x] Permission check as first statement in all RPCs
- [x] Audit logging in all RPCs
- [x] Sample size suppression (n < 5 → NULLs)
- [x] `org_get_benchmark_summary` for safe org-admin access
- [x] No raw org IDs exposed in org-admin RPCs

---

## 8. Tables Protected

| Table | RLS Enabled | Master-Only Policies |
|-------|-------------|---------------------|
| `platform_roles` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `benchmark_cohorts` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `benchmark_cohort_memberships` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `benchmark_snapshots` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `benchmark_metric_aggregates` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `benchmark_audit_log` | ✅ | SELECT, INSERT |

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-02-03 | Initial security contract | System |
| 2026-02-03 | Fixed benchmark_metric_aggregates open policy | System |
| 2026-02-03 | Added sample suppression to all RPCs | System |
