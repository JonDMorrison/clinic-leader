# Intervention Recommendation Engine Security Contract

## Overview

This document defines the trust, determinism, and guardrails for the predictive intervention recommendation engine.

---

## 1. Off-Track Metric Eligibility

### Deterministic Rules

Recommendations are ONLY generated when ALL conditions are met:

| Rule | Condition | Rationale |
|------|-----------|-----------|
| Target Required | `metric.target IS NOT NULL` | No target = no way to measure deviation |
| Current Value Required | `current_value IS NOT NULL` | Must have data to evaluate |
| Deviation Threshold | `deviation_percent <= -X%` (configurable, default -10%) | Only recommend when significantly off-track |
| Direction Awareness | For "down" metrics, checks `deviation >= +X%` | Respects metric direction |

### Configuration

```sql
-- Default thresholds (can be overridden per-organization)
SELECT * FROM recommendation_config 
WHERE config_key = 'eligibility_thresholds';

-- Returns:
{
  "min_deviation_percent": -10,
  "cooldown_days": 30,
  "min_sample_size": 3,
  "require_target": true
}
```

### Functions

- `is_metric_eligible_for_recommendations(metric_id, current_value)` - Server-side RPC
- `checkMetricEligibility()` - Client-side wrapper

---

## 2. Evidence Freezing

### recommendation_runs Table

Every recommendation generation creates a frozen evidence snapshot:

```sql
CREATE TABLE recommendation_runs (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  metric_id UUID NOT NULL,
  run_period_start DATE NOT NULL,
  
  -- Input snapshot (frozen at generation time)
  inputs JSONB NOT NULL,
  -- Contains: current_value, target, deviation_percent, normalization_method, threshold_used
  
  -- Evidence snapshot (frozen at generation time)
  evidence JSONB NOT NULL,
  -- Contains: historical_cases, sample_size, success_rates, pattern_stats, filtered_reasons
  
  recommendations_generated INTEGER NOT NULL,
  model_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  created_by UUID
);
```

### RLS

- Org members can **read** runs
- Manager+ can **create** runs

### Traceability

Every recommendation has `recommendation_run_id` linking to its evidence snapshot.

---

## 3. Intervention Type Allowlist

### intervention_types Table

Only approved intervention types can be recommended:

```sql
CREATE TABLE intervention_types (
  id UUID PRIMARY KEY,
  organization_id UUID,  -- NULL = global default
  type_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  requires_approval BOOLEAN NOT NULL DEFAULT false
);
```

### Default Approved Types

| Type Key | Display Name | Sensitive |
|----------|--------------|-----------|
| process_improvement | Process Improvement | No |
| training | Training & Education | No |
| technology | Technology Enhancement | No |
| communication | Communication Improvement | No |
| scheduling | Scheduling Optimization | No |
| patient_outreach | Patient Outreach | No |
| quality_assurance | Quality Assurance | No |
| workflow_redesign | Workflow Redesign | No |

### Sensitive Types (Disabled by Default)

| Type Key | Display Name | Reason |
|----------|--------------|--------|
| staffing_reduction | Staffing Reduction | HR-sensitive, legal implications |
| compensation_change | Compensation Change | Financial/legal implications |
| termination | Termination | HR-sensitive |

### Enforcement

- `filterByAllowedTypes()` - Filters recommendations before storage
- Unknown types are **never** recommended
- Sensitive types require explicit enablement by admin

---

## 4. Cooldown Control

### Rules

1. Same recommendation (metric + intervention_type) cannot be re-suggested within 30 days
2. EXCEPTION: If deviation worsens, cooldown is bypassed
3. Cooldown period is configurable per-organization

### Tracking

```sql
-- Added to intervention_recommendations
last_generated_at TIMESTAMPTZ,
deviation_at_generation NUMERIC
```

### Function

```sql
is_recommendation_in_cooldown(
  org_id, metric_id, intervention_type, current_deviation
) RETURNS TABLE(
  in_cooldown BOOLEAN,
  reason TEXT,
  last_recommended_at TIMESTAMPTZ,
  deviation_worsened BOOLEAN
)
```

---

## 5. Explainability UI Contract

### RecommendationDetailModal MUST Show:

1. **Formula Components**
   - Historical Success Rate × 0.35
   - Sample Size Score × 0.25
   - Similarity Score × 0.25
   - Recency Score × 0.15
   - Final calculation with weights

2. **Sample Size**
   - Exact number of historical cases analyzed
   - Minimum threshold (3)
   - Optimal threshold (10)

3. **Historical Interventions (Anonymized)**
   - Intervention type
   - Success/failure outcome
   - Improvement percentage
   - Duration

4. **Filtered Items**
   - Which intervention types were excluded
   - Why (allowlist, cooldown, confidence, sample size)

### RecommendationEvidencePanel Component

Provides full breakdown in "Full Evidence" tab:
- Input values at generation time
- Pattern statistics per intervention type
- Historical cases (anonymized, limited to 20)
- Filtered reasons with explanations

---

## 6. No AI Hallucination Guardrails

### Confidence Score

- **Deterministic formula only** - no AI estimation
- All inputs are structured data
- Formula is documented and reproducible

### AI Usage (Summary Only)

- AI is used ONLY for natural language summarization
- AI receives only the pre-computed numeric values
- AI cannot invent statistics or recommendations
- Fallback to template-based summary if AI fails

### Audit Trail

- Every recommendation links to `recommendation_run_id`
- Evidence snapshot is immutable
- Model version is tracked

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-02-03 | Initial recommendation engine security contract | System |
| 2026-02-03 | Added eligibility rules, allowlist, cooldown | System |
| 2026-02-03 | Added evidence freezing and explainability UI | System |
