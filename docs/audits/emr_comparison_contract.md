# EMR Comparison Contract

## Overview

This document defines the requirements for defensible, legally-safe EMR comparison outputs that cannot be misinterpreted as establishing causation.

---

## 1. Data Quality Gates

Organizations must pass all quality thresholds to be included in comparisons:

| Threshold | Value | Rationale |
|-----------|-------|-----------|
| Completeness | ≥85% | Ensures sufficient data fields present |
| Latency | ≤45 days | Recent data only |
| Consistency | ≥80% | Regular reporting pattern |

### Quality Gate Function

```sql
public.passes_emr_quality_gates(org_id, period_key)
```

Returns:
- `passes: boolean`
- `completeness_score`, `latency_score`, `consistency_score`
- `exclusion_reason: text` (if failed)

### Exclusion Tracking

Every comparison output includes `orgs_excluded_quality` count showing how many organizations were excluded for failing quality gates.

---

## 2. Normalization Requirements

Every metric MUST use explicit normalization:

| Metric | Normalization | Formula |
|--------|---------------|---------|
| `total_visits` | `per_provider` | `value / provider_count` |
| `total_revenue` | `per_provider` | `value / provider_count` |
| `total_collected` | `per_provider` | `value / provider_count` |
| `new_patients` | `per_1000_visits` | `(value / total_visits) * 1000` |
| `cancellation_rate` | `raw` | Already a rate |
| `no_show_rate` | `raw` | Already a rate |
| `utilization` | `raw` | Already a percentage |
| `avg_wait_time` | `raw` | Cadence-adjusted only |
| `patient_satisfaction` | `raw` | Already a score |
| `treatment_completion_rate` | `per_1000_visits` | `(value / total_visits) * 1000` |

### Adding New Metrics

New metrics MUST be added to `metric_normalization_rules` table before inclusion in comparisons.

---

## 3. Peer Matching (Selection Bias Reduction)

### Matching Criteria

| Dimension | Buckets | Function |
|-----------|---------|----------|
| Provider Size | `1-2`, `3-5`, `6-10`, `11+` | `get_provider_count_bucket(provider_count)` |
| Visit Volume | Quartiles (`q1`, `q2`, `q3`, `q4`) | `get_visits_quartile_bucket(org_visits, p25, p50, p75)` |
| Region | Geographic region if available | (optional) |

### Matching Rules

1. Toggle: "Matched Peers" vs "All Eligible" (default: all eligible)
2. When matching enabled:
   - Compute visit quartiles across all orgs
   - Assign each org to size bucket + visit bucket
   - Only compare non-Jane orgs that share a bucket with at least one Jane org
3. After matching, both groups must have ≥5 orgs
4. If either group <5: return `suppressed=true` with "Insufficient matched sample"

### UI Toggle

The comparison page provides a toggle:
- **OFF**: "All eligible orgs" - compares all qualifying orgs
- **ON**: "Matched peers" - applies bucket matching

### Functions

```sql
public.get_provider_count_bucket(provider_count) → text
public.get_visits_quartile_bucket(org_visits, p25, p50, p75) → text
public.bench_get_matched_comparison(metric_key, period_key, use_peer_matching) → comparison_result
```

---

## 4. Output Contract

Every comparison MUST include these fields:

### Sample Information
- `sample_size_jane: int` - Always visible
- `sample_size_non_jane: int` - Always visible
- `orgs_excluded_quality: int` - How many failed quality gates

### Statistics (NULL if suppressed)
- `jane_median`, `jane_p25`, `jane_p75`, `jane_std_deviation`
- `non_jane_median`, `non_jane_p25`, `non_jane_p75`, `non_jane_std_deviation`
- `delta_percent` - Relative difference

### Data Quality Summary
- `jane_avg_completeness`, `jane_avg_latency_days`, `jane_avg_consistency`
- `non_jane_avg_completeness`, `non_jane_avg_latency_days`, `non_jane_avg_consistency`

### Volatility Measures
- `jane_coefficient_of_variation` - stddev / mean × 100
- `non_jane_coefficient_of_variation`

### Confidence

Confidence is computed deterministically based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| Sample Size | Primary | Minimum orgs per group |
| Volatility | Secondary | Coefficient of Variation (stddev/mean × 100) |

| Label | Criteria |
|-------|----------|
| `high` | ≥20 orgs per group AND CV <30% in both groups |
| `medium` | ≥10 orgs per group OR (≥20 with high volatility) |
| `low` | 5-9 orgs per group |
| `insufficient_data` | <5 orgs in either group |

- `confidence_label: 'high' | 'medium' | 'low' | 'insufficient_data'`
- `confidence_reason: text` - Human-readable explanation

### Suppression
- `suppressed: boolean`
- `suppression_reason: text`

### Peer Matching
- `peer_matching_used: boolean`
- `peer_match_criteria: text` (e.g., "size_bucket,visit_volume_bucket")

---

## 5. Language Constraints

### FORBIDDEN Phrases (Never Use)
- "caused by"
- "due to"
- "because of"
- "results in"
- "leads to"
- "improves"
- "reduces"
- "increases"

### REQUIRED Phrases (Always Use)
- "associated with"
- "correlated with"
- "observed in"
- "demonstrated"
- "showed"
- "exhibited"
- "may indicate"
- "suggests"
- "linked to"

### Required Callout

Every comparison output MUST include this interpretation notice:

> **Interpretation Notice**: This analysis shows statistical associations only. 
> Correlation does not imply causation. Differences may reflect selection bias, 
> regional variations, specialty mix, or other confounding factors not controlled 
> for in this comparison. These findings should inform further investigation, 
> not definitive conclusions about EMR effectiveness.

---

## 6. Export Requirements

Partner-ready exports MUST include:

1. **Methodology Section**
   - Quality gate thresholds used
   - Normalization methods per metric
   - Peer matching criteria (if used)
   - Sample sizes and exclusion counts

2. **Limitations Section**
   - Selection bias acknowledgment
   - Confounding factors list
   - Regional/specialty variation warning
   - No causation claims

3. **Interpretation Callout**
   - Prominent, not hidden in footnotes
   - Uses "correlation" and "association" language

---

## 7. Validation Function

```typescript
import { validateSafeLanguage } from '@/lib/analytics/emrComparisonTypes';

const result = validateSafeLanguage(reportText);
if (!result.isValid) {
  console.error('Unsafe language detected:', result.violations);
  // Block export until fixed
}
```

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-02-03 | Initial EMR comparison contract | System |
| 2026-02-03 | Added quality gates and peer matching | System |
| 2026-02-03 | Added language constraints | System |
