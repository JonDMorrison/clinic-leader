# Data Quality Gating Contract

## Overview

Benchmark comparisons are only valid when both cohorts have high-quality data. This contract defines the thresholds and enforcement mechanisms.

---

## 1. Quality Thresholds

| Threshold | Default Value | Description |
|-----------|---------------|-------------|
| `min_completeness` | 0.85 (85%) | Minimum data completeness score |
| `min_consistency` | 0.80 (80%) | Minimum data consistency score |
| `max_latency_days` | 45 days | Maximum reporting delay |

### Storage

Thresholds are stored in `benchmark_quality_thresholds` table (master admin configurable).

---

## 2. Exclusion Logic

### When Computing Snapshots

The `bench_compute_snapshot()` RPC:

1. Gets all teams in the cohort
2. For each team, calls `org_passes_quality_gates(team_id, period_key)`
3. **Excludes** teams that fail any threshold
4. Computes aggregates only from qualifying teams
5. Records exclusion counts and reasons

### Exclusion Reasons

| Reason | Condition |
|--------|-----------|
| `low_completeness` | completeness_score < 0.85 |
| `low_consistency` | consistency_score < 0.80 |
| `high_latency` | avg_reporting_delay_hours / 24 > 45 |
| `no_quality_data` | No emr_data_quality_scores record |

---

## 3. Output Contract

Every snapshot includes:

```sql
-- Counts
included_count INTEGER      -- Orgs that passed quality gates
excluded_count INTEGER      -- Orgs that failed quality gates
excluded_low_completeness   -- Count excluded for low completeness
excluded_high_latency       -- Count excluded for high latency
excluded_low_consistency    -- Count excluded for low consistency

-- Quality Summary (for included orgs)
quality_summary JSONB {
  "avg_completeness": 0.92,
  "avg_consistency": 0.88,
  "avg_latency_days": 12.5
}

-- Derived Flags
suppressed BOOLEAN          -- True if n_orgs < 5
high_exclusion_warning      -- True if exclusion_rate > 30%
```

---

## 4. UI Requirements

### Warning Banner

When exclusion_rate > 30%, show warning:
- "High exclusion rate may limit generalizability"
- Breakdown of exclusion reasons

### Quality Summary Cards

Per-group display showing:
- Included org count
- Excluded org count + reasons
- Mean completeness, consistency, latency

### Suppression Notice

If either group has < 5 qualifying orgs:
- Return NULL aggregates
- Set `suppressed = true`
- Show "Insufficient sample size" message

---

## 5. RPC Functions

| Function | Purpose |
|----------|---------|
| `org_passes_quality_gates(org_id, period_key)` | Returns pass/fail + scores + reason |
| `bench_compute_snapshot(...)` | Applies gates when computing |
| `bench_list_snapshots(...)` | Returns quality info + warnings |
| `bench_get_snapshot(...)` | Returns full quality breakdown |

---

## 6. Security

- Thresholds table has RLS (master admin only)
- Quality gate function is SECURITY DEFINER
- All exclusion decisions are logged in audit

---

## Changelog

| Date | Change |
|------|--------|
| 2026-02-03 | Initial data quality gating contract |
