/**
 * Metric Normalization Layer for EMR Benchmarking
 * Ensures metrics are comparable across different clinic sizes and EMR sources
 */

export type NormalizationType = 'per_provider' | 'per_1000_visits' | 'per_patient_panel' | 'raw';

export interface NormalizationContext {
  providerCount: number;
  totalVisits: number;
  patientPanelSize: number;
  cadenceWeeks: number;
}

export interface NormalizedMetricResult {
  rawValue: number;
  normalizedValue: number;
  normalizationType: NormalizationType;
  scalingFactor: number;
  confidenceAdjustment: number;
}

/**
 * Determines the best normalization strategy based on metric type
 */
export function selectNormalizationType(metricKey: string): NormalizationType {
  const perProviderMetrics = [
    'visits_per_provider', 'revenue_per_provider', 'appointments_per_provider',
    'cancellations_per_provider', 'no_shows_per_provider'
  ];
  
  const perVisitMetrics = [
    'cancellation_rate', 'no_show_rate', 'rebooking_rate', 'conversion_rate',
    'average_visit_duration', 'revenue_per_visit'
  ];
  
  const perPatientMetrics = [
    'patient_retention', 'patient_churn', 'avg_visits_per_patient',
    'patient_satisfaction', 'treatment_adherence'
  ];

  if (perProviderMetrics.some(m => metricKey.toLowerCase().includes(m))) {
    return 'per_provider';
  }
  if (perVisitMetrics.some(m => metricKey.toLowerCase().includes(m))) {
    return 'per_1000_visits';
  }
  if (perPatientMetrics.some(m => metricKey.toLowerCase().includes(m))) {
    return 'per_patient_panel';
  }
  
  return 'raw';
}

/**
 * Normalizes a metric value for cross-organization comparison
 */
export function normalizeMetricValue(
  rawValue: number,
  context: NormalizationContext,
  normalizationType?: NormalizationType,
  metricKey?: string
): NormalizedMetricResult {
  const type = normalizationType || (metricKey ? selectNormalizationType(metricKey) : 'raw');
  
  let normalizedValue = rawValue;
  let scalingFactor = 1;
  let confidenceAdjustment = 1.0;
  
  switch (type) {
    case 'per_provider':
      if (context.providerCount > 0) {
        normalizedValue = rawValue / context.providerCount;
        scalingFactor = context.providerCount;
      }
      // Reduce confidence for very small or very large teams
      if (context.providerCount < 3) {
        confidenceAdjustment = 0.7;
      } else if (context.providerCount > 50) {
        confidenceAdjustment = 0.9;
      }
      break;
      
    case 'per_1000_visits':
      if (context.totalVisits > 0) {
        normalizedValue = (rawValue / context.totalVisits) * 1000;
        scalingFactor = context.totalVisits / 1000;
      }
      // Reduce confidence for low visit volumes
      if (context.totalVisits < 100) {
        confidenceAdjustment = 0.6;
      } else if (context.totalVisits < 500) {
        confidenceAdjustment = 0.8;
      }
      break;
      
    case 'per_patient_panel':
      if (context.patientPanelSize > 0) {
        normalizedValue = (rawValue / context.patientPanelSize) * 1000;
        scalingFactor = context.patientPanelSize / 1000;
      }
      // Reduce confidence for small panels
      if (context.patientPanelSize < 200) {
        confidenceAdjustment = 0.65;
      } else if (context.patientPanelSize < 1000) {
        confidenceAdjustment = 0.85;
      }
      break;
      
    case 'raw':
    default:
      // Apply cadence adjustment for time-based metrics
      if (context.cadenceWeeks > 1) {
        normalizedValue = rawValue / context.cadenceWeeks;
        scalingFactor = context.cadenceWeeks;
      }
      break;
  }
  
  return {
    rawValue,
    normalizedValue,
    normalizationType: type,
    scalingFactor,
    confidenceAdjustment,
  };
}

/**
 * Adjusts for missing data by computing confidence penalty
 */
export function calculateDataQualityConfidence(
  reportedPeriods: number,
  expectedPeriods: number,
  missingFieldsPercent: number
): number {
  // Base confidence from data completeness
  const periodCompleteness = Math.min(reportedPeriods / expectedPeriods, 1);
  
  // Field completeness penalty
  const fieldCompleteness = 1 - (missingFieldsPercent / 100);
  
  // Combined weighted score
  return Math.round((periodCompleteness * 0.6 + fieldCompleteness * 0.4) * 100) / 100;
}

/**
 * Computes weighted percentile position for an organization
 */
export function calculatePercentilePosition(
  orgValue: number,
  cohortValues: number[],
  ascending: boolean = true
): number {
  if (cohortValues.length === 0) return 50;
  
  const sorted = [...cohortValues].sort((a, b) => ascending ? a - b : b - a);
  let position = 0;
  
  for (let i = 0; i < sorted.length; i++) {
    if (ascending ? orgValue >= sorted[i] : orgValue <= sorted[i]) {
      position = i + 1;
    }
  }
  
  return Math.round((position / sorted.length) * 100);
}

/**
 * Denormalizes a benchmark value back to organization context
 */
export function denormalizeValue(
  normalizedValue: number,
  context: NormalizationContext,
  normalizationType: NormalizationType
): number {
  switch (normalizationType) {
    case 'per_provider':
      return normalizedValue * context.providerCount;
    case 'per_1000_visits':
      return (normalizedValue * context.totalVisits) / 1000;
    case 'per_patient_panel':
      return (normalizedValue * context.patientPanelSize) / 1000;
    default:
      return normalizedValue * context.cadenceWeeks;
  }
}
