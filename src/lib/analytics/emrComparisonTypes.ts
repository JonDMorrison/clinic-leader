/**
 * EMR Comparison Type Definitions
 * Enforces output contract and safe language requirements
 */

/** Quality thresholds for inclusion in comparisons */
export const EMR_QUALITY_THRESHOLDS = {
  MIN_COMPLETENESS: 0.85,     // 85% completeness required
  MAX_LATENCY_DAYS: 45,       // Max 45 days reporting delay
  MIN_CONSISTENCY: 0.80,      // 80% consistency required
  MIN_SAMPLE_SIZE: 5,         // Privacy threshold
} as const;

/** Confidence levels based on sample size and quality */
export type ConfidenceLabel = 'high' | 'medium' | 'low' | 'insufficient_data';

/** Normalization types for fair comparison */
export type NormalizationType = 'per_provider' | 'per_1000_visits' | 'per_patient_panel' | 'raw';

/** Full output contract for EMR comparisons */
export interface EMRComparisonOutput {
  metricKey: string;
  periodKey: string;
  
  // Sample sizes (always visible)
  sampleSizeJane: number;
  sampleSizeNonJane: number;
  orgsExcludedQuality: number;
  
  // Jane statistics (NULL if suppressed)
  janeMedian: number | null;
  janeP25: number | null;
  janeP75: number | null;
  janeStdDeviation: number | null;
  
  // Non-Jane statistics (NULL if suppressed)
  nonJaneMedian: number | null;
  nonJaneP25: number | null;
  nonJaneP75: number | null;
  nonJaneStdDeviation: number | null;
  
  // Comparison
  deltaPercent: number | null;
  
  // Data quality summary
  qualitySummary: {
    jane: {
      avgCompleteness: number | null;
      avgLatencyDays: number | null;
      avgConsistency: number | null;
    };
    nonJane: {
      avgCompleteness: number | null;
      avgLatencyDays: number | null;
      avgConsistency: number | null;
    };
  };
  
  // Volatility measures
  janeCoefficientOfVariation: number | null;
  nonJaneCoefficientOfVariation: number | null;
  
  // Confidence
  confidenceLabel: ConfidenceLabel;
  suppressed: boolean;
  suppressionReason: string | null;
  
  // Peer matching
  peerMatchingUsed: boolean;
  peerMatchCriteria: string | null;
}

/** Safe language helpers - NEVER use causation terms */
export const SAFE_LANGUAGE = {
  /** Phrases that imply causation - NEVER USE */
  FORBIDDEN: [
    'caused by',
    'due to',
    'because of',
    'results in',
    'leads to',
    'improves',
    'reduces',
    'increases',
  ],
  
  /** Safe association language - ALWAYS USE */
  ALLOWED: [
    'associated with',
    'correlated with',
    'observed in',
    'demonstrated',
    'showed',
    'exhibited',
    'may indicate',
    'suggests',
    'linked to',
  ],
  
  /** Standard interpretation callout */
  INTERPRETATION_CALLOUT: `
    **Interpretation Notice**: This analysis shows statistical associations only. 
    Correlation does not imply causation. Differences may reflect selection bias, 
    regional variations, specialty mix, or other confounding factors not controlled 
    for in this comparison. These findings should inform further investigation, 
    not definitive conclusions about EMR effectiveness.
  `.trim(),
  
  /** Confidence label descriptions */
  CONFIDENCE_DESCRIPTIONS: {
    high: 'High confidence: ≥20 orgs per group with ≥90% data quality',
    medium: 'Medium confidence: ≥10 orgs per group',
    low: 'Low confidence: 5-9 orgs per group or quality concerns',
    insufficient_data: 'Insufficient data: Below minimum sample size requirements',
  } as Record<ConfidenceLabel, string>,
} as const;

/** Metric normalization documentation */
export const METRIC_NORMALIZATION: Record<string, {
  type: NormalizationType;
  description: string;
  formula: string;
}> = {
  total_visits: {
    type: 'per_provider',
    description: 'Visits normalized per provider',
    formula: 'value / provider_count',
  },
  total_revenue: {
    type: 'per_provider',
    description: 'Revenue normalized per provider',
    formula: 'value / provider_count',
  },
  total_collected: {
    type: 'per_provider',
    description: 'Collections normalized per provider',
    formula: 'value / provider_count',
  },
  new_patients: {
    type: 'per_1000_visits',
    description: 'New patients per 1000 visits',
    formula: '(value / total_visits) * 1000',
  },
  cancellation_rate: {
    type: 'raw',
    description: 'Already a rate (percentage)',
    formula: 'value (no normalization)',
  },
  no_show_rate: {
    type: 'raw',
    description: 'Already a rate (percentage)',
    formula: 'value (no normalization)',
  },
  utilization: {
    type: 'raw',
    description: 'Already a percentage',
    formula: 'value (no normalization)',
  },
  avg_wait_time: {
    type: 'raw',
    description: 'Time-based metric',
    formula: 'value (cadence-adjusted only)',
  },
  patient_satisfaction: {
    type: 'raw',
    description: 'Already a score',
    formula: 'value (no normalization)',
  },
  treatment_completion_rate: {
    type: 'per_1000_visits',
    description: 'Completions per 1000 visits',
    formula: '(value / total_visits) * 1000',
  },
};

/**
 * Validates that text uses safe language (no causation claims)
 */
export function validateSafeLanguage(text: string): {
  isValid: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const forbidden of SAFE_LANGUAGE.FORBIDDEN) {
    if (lowerText.includes(forbidden.toLowerCase())) {
      violations.push(forbidden);
    }
  }
  
  return {
    isValid: violations.length === 0,
    violations,
  };
}

/**
 * Gets confidence badge variant for UI
 */
export function getConfidenceBadgeVariant(confidence: ConfidenceLabel): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (confidence) {
    case 'high':
      return 'default';
    case 'medium':
      return 'secondary';
    case 'low':
      return 'outline';
    case 'insufficient_data':
      return 'destructive';
  }
}
