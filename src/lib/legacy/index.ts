/**
 * Legacy Data Module
 * 
 * Bridges Lori's workbook imports (legacy_monthly_reports) to the main 
 * metric_results table so Scorecard, off-track detection, and meeting
 * agenda generation work for Default (Legacy) mode organizations.
 */

export * from './legacyMetricMapping';
export * from './legacyMetricBridge';
export * from './legacyMetricAudit';
