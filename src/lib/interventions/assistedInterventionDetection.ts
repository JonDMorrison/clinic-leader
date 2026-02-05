/**
 * Assisted Intervention Detection Engine
 * 
 * Detects patterns that suggest an intervention is being implemented:
 * 1. To-Do Cluster: 3+ todos linked to same metric within 14 days
 * 2. Metric Change: Significant slope change post activity
 * 3. EMR Config Change: Booking/reminder/service updates
 * 
 * Never auto-creates interventions - always requires user confirmation.
 */

import { supabase } from "@/integrations/supabase/client";

// ============= Detection Types =============

export type DetectionSignalType = 
  | "todo_cluster" 
  | "metric_slope_change" 
  | "emr_config_change";

export interface DetectedIntervention {
  id: string;
  signalType: DetectionSignalType;
  confidence: number; // 0-100
  metricId: string | null;
  metricName: string | null;
  suggestedTitle: string;
  suggestedDescription: string;
  detectionContext: DetectionContext;
  detectedAt: Date;
  dismissed: boolean;
}

export interface DetectionContext {
  // For todo_cluster
  todoIds?: string[];
  todoTitles?: string[];
  todoCount?: number;
  clusterSpanDays?: number;
  
  // For metric_slope_change
  slopeChangePct?: number;
  preActivitySlope?: number;
  postActivitySlope?: number;
  activityTrigger?: "todo" | "issue";
  activityDate?: string;
  
  // For emr_config_change
  configType?: "booking_template" | "reminder_workflow" | "service_availability";
  changeDescription?: string;
  changedAt?: string;
}

export interface DetectionResult {
  detections: DetectedIntervention[];
  hasDetections: boolean;
}

// ============= Detection Constants =============

const TODO_CLUSTER_THRESHOLD = 3; // Minimum todos to trigger
const TODO_CLUSTER_WINDOW_DAYS = 14; // Days to look back
const SLOPE_CHANGE_THRESHOLD = 0.15; // 15% slope change threshold
const MIN_DATA_POINTS_FOR_SLOPE = 4; // Minimum weeks of data

// ============= Detection Functions =============

/**
 * Detect todo clusters - 3+ todos linked to same metric within 14 days
 */
export async function detectTodoClusters(
  organizationId: string,
  options: { lookbackDays?: number } = {}
): Promise<DetectedIntervention[]> {
  const lookbackDays = options.lookbackDays ?? TODO_CLUSTER_WINDOW_DAYS;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

  // Fetch recent todos with issue/metric links, excluding those already linked to interventions
  const { data: todos, error } = await supabase
    .from("todos")
    .select(`
      id,
      title,
      created_at,
      intervention_id,
      issue_id,
      issues:issue_id(
        id,
        metric_id,
        metrics:metric_id(id, name)
      )
    `)
    .eq("organization_id", organizationId)
    .is("intervention_id", null)
    .gte("created_at", cutoffDate.toISOString())
    .order("created_at", { ascending: false });

  if (error || !todos) {
    console.error("Error fetching todos for cluster detection:", error);
    return [];
  }

  // Group by metric_id
  const metricGroups = new Map<string, {
    metricName: string;
    todos: Array<{ id: string; title: string; createdAt: Date }>;
    earliestDate: Date;
    latestDate: Date;
  }>();

  for (const todo of todos) {
    const issue = todo.issues as any;
    if (!issue?.metric_id) continue;

    const metricId = issue.metric_id;
    const metricName = (issue.metrics as any)?.name || "Unknown Metric";
    const createdAt = new Date(todo.created_at);

    if (!metricGroups.has(metricId)) {
      metricGroups.set(metricId, {
        metricName,
        todos: [],
        earliestDate: createdAt,
        latestDate: createdAt,
      });
    }

    const group = metricGroups.get(metricId)!;
    group.todos.push({ id: todo.id, title: todo.title, createdAt });
    
    if (createdAt < group.earliestDate) group.earliestDate = createdAt;
    if (createdAt > group.latestDate) group.latestDate = createdAt;
  }

  // Filter to clusters meeting threshold
  const detections: DetectedIntervention[] = [];

  for (const [metricId, group] of metricGroups) {
    if (group.todos.length >= TODO_CLUSTER_THRESHOLD) {
      const spanDays = Math.ceil(
        (group.latestDate.getTime() - group.earliestDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate confidence based on cluster density
      const densityScore = Math.min(group.todos.length / 5, 1); // Cap at 5 todos
      const timeScore = Math.max(0, 1 - spanDays / lookbackDays);
      const confidence = Math.round((densityScore * 0.7 + timeScore * 0.3) * 100);

      detections.push({
        id: `todo_cluster_${metricId}_${Date.now()}`,
        signalType: "todo_cluster",
        confidence,
        metricId,
        metricName: group.metricName,
        suggestedTitle: `Improve ${group.metricName}`,
        suggestedDescription: `Multiple action items (${group.todos.length}) targeting ${group.metricName} detected in the last ${spanDays} days. Consider tracking this as a formal intervention to measure impact.`,
        detectionContext: {
          todoIds: group.todos.map(t => t.id),
          todoTitles: group.todos.map(t => t.title),
          todoCount: group.todos.length,
          clusterSpanDays: spanDays,
        },
        detectedAt: new Date(),
        dismissed: false,
      });
    }
  }

  return detections;
}

/**
 * Detect significant metric slope changes after todo/issue activity
 */
export async function detectMetricSlopeChanges(
  organizationId: string,
  options: { lookbackWeeks?: number } = {}
): Promise<DetectedIntervention[]> {
  const lookbackWeeks = options.lookbackWeeks ?? 8;

  // Get metrics with recent results
  const { data: metrics, error: metricsError } = await supabase
    .from("metrics")
    .select("id, name")
    .eq("organization_id", organizationId);

  if (metricsError || !metrics) {
    console.error("Error fetching metrics for slope detection:", metricsError);
    return [];
  }

  const detections: DetectedIntervention[] = [];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookbackWeeks * 7);

  for (const metric of metrics) {
    // Get metric results
    const { data: results } = await supabase
      .from("metric_results")
      .select("id, value, week_start")
      .eq("metric_id", metric.id)
      .gte("week_start", cutoffDate.toISOString())
      .order("week_start", { ascending: true });

    if (!results || results.length < MIN_DATA_POINTS_FOR_SLOPE * 2) continue;

    // Get recent activity (todos/issues) for this metric
    const { data: recentActivity } = await supabase
      .from("issues")
      .select("id, created_at")
      .eq("metric_id", metric.id)
      .eq("organization_id", organizationId)
      .gte("created_at", cutoffDate.toISOString())
      .order("created_at", { ascending: true })
      .limit(1);

    if (!recentActivity || recentActivity.length === 0) continue;

    const activityDate = new Date(recentActivity[0].created_at);
    
    // Split results into pre and post activity
    const preActivity = results.filter(r => new Date(r.week_start) < activityDate);
    const postActivity = results.filter(r => new Date(r.week_start) >= activityDate);

    if (preActivity.length < MIN_DATA_POINTS_FOR_SLOPE || 
        postActivity.length < MIN_DATA_POINTS_FOR_SLOPE) continue;

    // Calculate slopes
    const preSlope = calculateSlope(preActivity.map(r => r.value));
    const postSlope = calculateSlope(postActivity.map(r => r.value));

    // Detect significant change (direction reversal or magnitude change)
    const slopeChange = Math.abs(postSlope - preSlope);
    const avgMagnitude = (Math.abs(preSlope) + Math.abs(postSlope)) / 2;
    const relativeChange = avgMagnitude > 0 ? slopeChange / avgMagnitude : 0;

    // Also check for direction reversal
    const directionReversed = (preSlope < 0 && postSlope > 0) || (preSlope > 0 && postSlope < 0);

    if (relativeChange >= SLOPE_CHANGE_THRESHOLD || directionReversed) {
      // Check if already has an active intervention
      const { data: existingInterventions } = await supabase
        .from("intervention_metric_links")
        .select("intervention_id, interventions:intervention_id(status)")
        .eq("metric_id", metric.id);

      const hasActiveIntervention = existingInterventions?.some(
        link => {
          const intervention = link.interventions as any;
          return intervention?.status === "active" || intervention?.status === "planned";
        }
      );

      if (!hasActiveIntervention) {
        const confidence = Math.min(
          Math.round((relativeChange / 0.3) * 50 + (directionReversed ? 30 : 0) + postActivity.length * 2),
          95
        );

        const direction = postSlope > preSlope ? "improving" : "declining";

        detections.push({
          id: `slope_change_${metric.id}_${Date.now()}`,
          signalType: "metric_slope_change",
          confidence,
          metricId: metric.id,
          metricName: metric.name,
          suggestedTitle: `Track ${metric.name} ${direction === "improving" ? "Improvement" : "Response"}`,
          suggestedDescription: `${metric.name} shows a significant trend change after recent activity. The metric is now ${direction}. Track this as an intervention to measure the impact of your changes.`,
          detectionContext: {
            slopeChangePct: Math.round(relativeChange * 100),
            preActivitySlope: preSlope,
            postActivitySlope: postSlope,
            activityTrigger: "issue",
            activityDate: activityDate.toISOString(),
          },
          detectedAt: new Date(),
          dismissed: false,
        });
      }
    }
  }

  return detections;
}

/**
 * Detect EMR configuration changes that might indicate an intervention
 */
export async function detectEMRConfigChanges(
  organizationId: string
): Promise<DetectedIntervention[]> {
  // Check for recent EMR-related activity in audit logs or data ingestion
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7); // Last 7 days

  const { data: recentIngestions } = await supabase
    .from("data_ingestion_ledger")
    .select("id, resource_type, timestamp, rows_ingested")
    .eq("organization_id", organizationId)
    .gte("timestamp", cutoffDate.toISOString())
    .in("resource_type", ["scheduling", "reminders", "services"])
    .order("timestamp", { ascending: false });

  if (!recentIngestions || recentIngestions.length === 0) {
    return [];
  }

  const detections: DetectedIntervention[] = [];
  const processedTypes = new Set<string>();

  for (const ingestion of recentIngestions) {
    if (processedTypes.has(ingestion.resource_type)) continue;
    processedTypes.add(ingestion.resource_type);

    let configType: "booking_template" | "reminder_workflow" | "service_availability";
    let description: string;

    switch (ingestion.resource_type) {
      case "scheduling":
        configType = "booking_template";
        description = "Booking template or scheduling configuration changes detected";
        break;
      case "reminders":
        configType = "reminder_workflow";
        description = "Patient reminder workflow updates detected";
        break;
      case "services":
        configType = "service_availability";
        description = "Service availability or offering changes detected";
        break;
      default:
        continue;
    }

    detections.push({
      id: `emr_config_${ingestion.resource_type}_${Date.now()}`,
      signalType: "emr_config_change",
      confidence: 60, // Medium confidence for config changes
      metricId: null,
      metricName: null,
      suggestedTitle: `Track ${formatConfigType(configType)} Change`,
      suggestedDescription: `${description}. If this is part of an improvement initiative, track it as an intervention to measure its impact on your metrics.`,
      detectionContext: {
        configType,
        changeDescription: description,
        changedAt: ingestion.timestamp,
      },
      detectedAt: new Date(),
      dismissed: false,
    });
  }

  return detections;
}

/**
 * Run all detection checks and return combined results
 */
export async function runAssistedDetection(
  organizationId: string
): Promise<DetectionResult> {
  const [todoClusters, slopeChanges, emrChanges] = await Promise.all([
    detectTodoClusters(organizationId),
    detectMetricSlopeChanges(organizationId),
    detectEMRConfigChanges(organizationId),
  ]);

  const allDetections = [...todoClusters, ...slopeChanges, ...emrChanges];

  // Sort by confidence descending
  allDetections.sort((a, b) => b.confidence - a.confidence);

  return {
    detections: allDetections,
    hasDetections: allDetections.length > 0,
  };
}

// ============= Helper Functions =============

function calculateSlope(values: number[]): number {
  if (values.length < 2) return 0;
  
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) ** 2;
  }
  
  return denominator !== 0 ? numerator / denominator : 0;
}

function formatConfigType(type: string): string {
  return type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// ============= Detection Source Metadata =============

export interface DetectionSourceMetadata {
  detection_type: DetectionSignalType;
  detection_id: string;
  confidence: number;
  context: Record<string, unknown>;
  detected_at: string;
}

export function createDetectionSourceMetadata(
  detection: DetectedIntervention
): DetectionSourceMetadata {
  return {
    detection_type: detection.signalType,
    detection_id: detection.id,
    confidence: detection.confidence,
    context: detection.detectionContext as unknown as Record<string, unknown>,
    detected_at: detection.detectedAt.toISOString(),
  };
}
