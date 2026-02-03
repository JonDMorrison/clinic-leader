# Predictive Intervention Recommendation Engine - Architecture Documentation

## Overview

The Predictive Intervention Recommendation Engine analyzes historical intervention outcomes and recommends future interventions when metrics go off-track. It is a data-driven, explainable system built on real organizational history.

## Core Principles

1. **Data-Driven**: Recommendations are based solely on historical intervention outcomes
2. **Explainable**: Every recommendation includes full evidence and confidence breakdown
3. **Advisory Only**: Never auto-creates interventions, only recommends
4. **Multi-Tenant Safe**: All learning is organization-scoped
5. **AI for Summarization Only**: AI generates human-readable summaries but never determines logic

## Database Schema

### intervention_templates
Reusable intervention patterns derived from historical interventions.

```sql
intervention_templates
├── id (uuid, PK)
├── organization_id (uuid, FK → teams)
├── template_name (text)
├── template_description (text)
├── intervention_type (enum)
├── metric_category (text) - typically metric_id
├── common_actions (jsonb) - frequently used tags/actions
├── typical_duration_days (int)
├── average_historical_success_rate (numeric 0-1)
├── historical_sample_size (int)
├── created_from_intervention_ids (uuid[])
└── is_active (boolean)
```

### intervention_recommendations
Generated recommendations for off-track metrics.

```sql
intervention_recommendations
├── id (uuid, PK)
├── organization_id (uuid, FK → teams)
├── metric_id (uuid, FK → metrics)
├── period_key (text, YYYY-MM)
├── recommended_template_id (uuid, nullable)
├── recommended_intervention_template (jsonb)
├── confidence_score (numeric 0-1)
├── evidence_summary (text)
├── recommendation_reason (jsonb)
├── generated_at (timestamp)
├── model_version (text)
├── dismissed (boolean)
├── dismissed_reason (text)
├── accepted (boolean)
├── accepted_intervention_id (uuid)
└── expires_at (timestamp)
```

## Confidence Scoring Formula

The confidence score is a weighted sum of four components, each normalized to [0, 1]:

```
confidence = (historicalSuccessRate × 0.35) + 
             (sampleSizeScore × 0.25) +
             (similarityScore × 0.25) +
             (recencyScore × 0.15)
```

### Component Calculations

**Historical Success Rate (35%)**
- Direct pass-through of pattern's success rate (0-1)
- Success = intervention with positive delta outcome

**Sample Size Score (25%)**
- Logarithmic scaling: `ln(n) / ln(10)`
- Minimum 3 samples required
- Plateaus at 10 samples

**Similarity Score (25%)**
- Measures deviation match between current and historical situations
- Formula: `1 - (|currentDeviation - historicalAvgDeviation| / 50)`
- Normalized so 0% difference = 1.0, 50%+ difference = 0.0

**Recency Score (15%)**
- Exponential decay with 180-day half-life
- Formula: `exp(-ln(2) × daysSinceMostRecent / 180)`
- Recent patterns weighted higher

### Thresholds

| Threshold | Value |
|-----------|-------|
| Minimum Confidence | 0.35 |
| Minimum Sample Size | 3 |
| Optimal Sample Size | 10 |
| Recency Half-Life | 180 days |

## Template Learning Algorithm

```
1. Fetch all completed/abandoned interventions with outcomes
2. Join with intervention_metric_links for baseline values
3. Group by:
   - metric_id
   - intervention_type
   - duration_bucket (30/60/90/120+ days)
4. For each group:
   a. Count successes (positive delta)
   b. Calculate success rate
   c. Compute median/avg improvement
   d. Compute avg time to result
   e. Extract common tags (>50% frequency)
5. Filter groups with sample_size >= 2
6. Upsert templates to database
```

## Recommendation Generation Trigger

Recommendations are generated when:
1. Metric status is `off_track` (from metricStatus())
2. Metric has at least 3 historical interventions with outcomes
3. Organization has opted into recommendations (currently always true)

## Recommendation Algorithm

```
1. Validate metric is off-track
2. Fetch intervention history for the metric
3. Check minimum sample size (3)
4. Group history by intervention type
5. For each group:
   a. Compute pattern statistics
   b. Calculate current deviation from target
   c. Calculate historical average deviation
   d. Calculate days since most recent case
   e. Compute confidence score
   f. Skip if below threshold (0.35)
6. Sort by confidence descending
7. Return top 3 recommendations
```

## Safety Rules

**Never recommend when:**
- Sample size < 3
- Confidence score < 0.35
- Metric has no historical outcomes
- User lacks manager+ permission (for accepting)

**Auto-creation prevention:**
- Recommendations only surface suggestions
- User must explicitly click "Accept"
- Accept flow creates intervention via standard mutation

## AI Summary Boundaries

AI is used ONLY for summarization:

**Inputs (structured data only):**
- intervention_type
- metric_name
- current_deviation_percent
- historical_success_rate
- matched_cases_count
- avg_improvement_percent
- typical_time_to_result_days
- confidence_score

**Output constraints:**
- Under 50 words
- Advisory language only ("typically", "historically", "may")
- No invented statistics
- No additional recommendations beyond the data

**AI does NOT:**
- Determine confidence scores
- Make logic decisions
- Trigger any automation

## Explainability Model

Every recommendation includes `recommendation_reason`:

```json
{
  "matched_cases_count": 5,
  "avg_improvement_percent": 12.5,
  "median_improvement_percent": 10.0,
  "typical_time_to_result_days": 45,
  "historical_success_rate": 75,
  "similar_context_notes": [
    "Based on 5 historical interventions",
    "Average improvement: 12.5%",
    "Typical time to see results: 45 days"
  ],
  "confidence_components": {
    "historicalSuccessRate": 0.75,
    "sampleSizeScore": 0.7,
    "similarityScore": 0.8,
    "recencyScore": 0.6
  }
}
```

## Multi-Tenant Isolation

- All queries filter by `organization_id`
- Templates are organization-scoped
- Recommendations are organization-scoped
- RLS policies enforce org isolation:
  - SELECT: `is_same_team(organization_id)`
  - INSERT: `is_same_team(organization_id)`
  - UPDATE: `is_same_team(organization_id) AND is_manager()`
  - DELETE: `is_same_team(organization_id) AND is_admin()`

**Future capability flag:**
```sql
allow_cross_org_learning BOOLEAN DEFAULT false
```

## Permission Enforcement

| Action | Required Role |
|--------|---------------|
| View recommendations | All authenticated |
| Generate recommendations | Manager+ |
| Accept recommendation | Manager+ |
| Dismiss recommendation | All authenticated |
| Delete recommendation | Admin only |

## UI Components

### MetricRecommendationsPanel
- Main panel displayed on off-track metrics
- Shows list of recommendations
- Generate/Refresh button

### RecommendationCard
- Individual recommendation display
- Confidence visualization
- Evidence preview
- Accept/Dismiss buttons

### RecommendationDetailModal
- Full evidence breakdown
- Confidence component analysis
- Dismiss reason capture

## Meeting Integration

When metric is off-track AND recommendation exists:
- Agenda item: "Recommended Intervention Available"
- Includes top recommendation summary
- Quick accept link to create intervention

## Performance Considerations

- Recommendations cached per metric/period
- Recalculation only on new outcome saves
- Template building is an explicit action (not page load)
- Batch queries for efficiency

## Data Flow Diagram

```
[Historical Interventions + Outcomes]
            ↓
[Pattern Learning Engine]
            ↓
[intervention_templates]
            ↓
[Metric goes off-track] → [Recommendation Generator]
            ↓
[Confidence Scoring]
            ↓
[intervention_recommendations]
            ↓
┌───────────┬──────────────┐
↓           ↓              ↓
[Metric UI] [Meeting Prep] [Scorecard]
            ↓
[User clicks Accept]
            ↓
[Create Intervention + Link Metric]
```

## Future Expansion Opportunities

1. **Cross-org learning (opt-in)**: Aggregate anonymized patterns across clinics
2. **Metric similarity matching**: Recommend based on similar metrics, not just same metric
3. **Seasonal adjustments**: Weight historical cases by time-of-year similarity
4. **Owner role matching**: Factor in owner specialization
5. **Department segmentation**: Segment patterns by department
6. **A/B recommendation testing**: Track which recommendations lead to success
7. **Automated template refinement**: Periodically rebuild templates on schedule
8. **Confidence threshold tuning**: Organization-specific thresholds
