# EMR Outcome Comparison Intelligence Module

## Overview

The EMR Outcome Comparison module provides anonymized, aggregated benchmarking insights comparing Jane-integrated organizations against non-Jane EMR sources. This system is designed to demonstrate operational outcome improvements while maintaining strict privacy and multi-tenant safety.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    EMR Benchmark Dashboard                       │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │ Performance   │  │ Data Quality  │  │ Intervention      │   │
│  │ Comparison    │  │ Comparison    │  │ Outcomes          │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    Comparison Engine                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │ Normalization │  │ Quality       │  │ AI Insight        │   │
│  │ Service       │  │ Scoring       │  │ Summarization     │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│              Aggregation Layer (Edge Function)                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ generate-benchmark-aggregates (Runs Monthly)               │  │
│  │ - Computes median, percentiles, std deviation              │  │
│  │ - Enforces minimum sample size (5 orgs)                    │  │
│  │ - Generates intervention analysis                          │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    Database Layer                                │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │ benchmark_    │  │ emr_data_     │  │ intervention_     │   │
│  │ metric_       │  │ quality_      │  │ emr_analysis      │   │
│  │ aggregates    │  │ scores        │  │                   │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Data Source Classification

Organizations are classified by their EMR source type:

| Value | Description |
|-------|-------------|
| `jane` | Direct Jane API integration |
| `jane_pipe` | Jane bulk data pipeline |
| `spreadsheet` | Manual spreadsheet uploads |
| `manual` | Manual data entry |
| `hybrid` | Mixed sources |
| `unknown` | Unclassified |

**Jane-integrated flag**: `emr_source_type IN ('jane', 'jane_pipe')`

### 2. Metric Normalization

All metrics are normalized for fair comparison across different clinic sizes:

#### Normalization Types

| Type | Formula | Use Case |
|------|---------|----------|
| `per_provider` | `value / provider_count` | Visits, revenue |
| `per_1000_visits` | `(value / total_visits) * 1000` | Rates, percentages |
| `per_patient_panel` | `(value / panel_size) * 1000` | Patient metrics |
| `raw` | Cadence-adjusted only | Time-based metrics |

#### Confidence Adjustments

| Condition | Adjustment |
|-----------|------------|
| Provider count < 3 | 0.7x |
| Visits < 100 | 0.6x |
| Visits < 500 | 0.8x |
| Patient panel < 200 | 0.65x |

### 3. Privacy & Anonymization Rules

**Critical Constraints:**

1. **Minimum Sample Size**: All aggregates require ≥5 organizations per group
2. **No Individual Data**: Organization identifiers never exposed in benchmarks
3. **RLS Enforcement**: 
   - `benchmark_metric_aggregates`: Read-only for all authenticated users
   - `emr_comparison_snapshots`: Organization-scoped RLS
   - `emr_data_quality_scores`: Organization-scoped RLS

### 4. Aggregation Algorithm

The monthly aggregation job computes:

```
For each (metric_key, period_key, emr_source_group):
  1. Collect values from metric_results where org.emr_source_type matches group
  2. Skip if sample_size < 5
  3. Calculate:
     - median_value: Middle value when sorted
     - percentile_25: 25th percentile
     - percentile_75: 75th percentile
     - std_deviation: sqrt(variance)
     - organization_count: Distinct orgs contributing
  4. Upsert to benchmark_metric_aggregates
```

### 5. Comparison Engine

#### Performance Delta Calculation

```typescript
performanceDelta = ((janeMedian - nonJaneMedian) / nonJaneMedian) * 100
```

#### Volatility Comparison

```typescript
janeCV = stdDeviation / median  // Coefficient of Variation
volatilityComparison = janeCV < nonJaneCV
```

#### Trend Stability Classification

| CV Range | Classification |
|----------|----------------|
| < 15% | Stable |
| 15-35% | Moderate |
| > 35% | Volatile |

### 6. AI Insight Summarization

The AI layer **only summarizes structured data** - it never:
- Determines confidence scores
- Calculates statistics
- Makes causal claims
- Invents statistics

#### Input to AI

```json
{
  "sampleSizes": { "jane": 15, "nonJane": 20 },
  "overallAdvantage": 12.5,
  "metricsAnalyzed": 8,
  "metricsWithAdvantage": 6,
  "volatilityAdvantage": 5,
  "qualityAdvantage": 8.2
}
```

#### Output Format

```json
{
  "performanceSummary": "...",
  "qualitySummary": "...",
  "interventionSummary": "...",
  "overallConclusion": "..."
}
```

### 7. Data Quality Scoring

Scores computed per organization, per period:

| Component | Weight | Calculation |
|-----------|--------|-------------|
| Completeness | 40% | (present_fields / expected_fields) - critical_penalty |
| Latency | 30% | 100 - (overdue_hours * 2) |
| Consistency | 30% | (reported_periods / expected) - gap_penalty |

### 8. Partner Report Generation

Export formats:
- **JSON**: Full structured report for integration
- **Slide Deck Data**: Formatted for partner presentations
- **Executive Summary**: Key findings with confidence intervals

## Database Schema

### benchmark_metric_aggregates

```sql
CREATE TABLE benchmark_metric_aggregates (
  id UUID PRIMARY KEY,
  metric_key TEXT NOT NULL,
  period_key TEXT NOT NULL,
  emr_source_group TEXT CHECK (IN ('jane', 'non_jane')),
  organization_count INTEGER,
  median_value NUMERIC,
  percentile_25 NUMERIC,
  percentile_75 NUMERIC,
  std_deviation NUMERIC,
  sample_size INTEGER CHECK (>= 5),
  generated_at TIMESTAMPTZ,
  UNIQUE(metric_key, period_key, emr_source_group)
);
```

### intervention_emr_analysis

```sql
CREATE TABLE intervention_emr_analysis (
  id UUID PRIMARY KEY,
  period_key TEXT,
  emr_source_group TEXT,
  intervention_type TEXT,
  total_interventions INTEGER,
  successful_interventions INTEGER,
  success_rate NUMERIC,
  avg_resolution_days NUMERIC,
  sample_size INTEGER CHECK (>= 5),
  UNIQUE(period_key, emr_source_group, intervention_type)
);
```

## Safety & Limitations

### Causation Disclaimers

All reports include:
- "Correlation does not imply causation"
- Sample size disclosures
- Regional/specialty variation acknowledgments
- Selection bias warnings

### Multi-Tenant Safety

- Organization-scoped RLS on all org-specific tables
- Aggregate-only queries for cross-org comparisons
- No raw record exposure
- `allow_cross_org_learning` flag for future use (default: false)

## Future Expansion

1. **Cross-Org Learning** (with explicit opt-in)
2. **Specialty-Specific Benchmarks**
3. **Regional Normalization**
4. **Predictive Modeling** (outcome forecasting)
5. **Real-Time Benchmark Updates**
