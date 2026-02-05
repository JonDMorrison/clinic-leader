import type { Database } from "@/integrations/supabase/types";

// Enum types from database
export type InterventionStatus = Database["public"]["Enums"]["intervention_status"];
export type InterventionType = Database["public"]["Enums"]["intervention_type"];
export type InterventionOriginType = Database["public"]["Enums"]["intervention_origin_type"];
export type ExpectedDirection = Database["public"]["Enums"]["expected_direction"];

// Row types
export type InterventionRow = Database["public"]["Tables"]["interventions"]["Row"];
export type InterventionInsert = Database["public"]["Tables"]["interventions"]["Insert"];
export type InterventionUpdate = Database["public"]["Tables"]["interventions"]["Update"];

export type InterventionMetricLinkRow = Database["public"]["Tables"]["intervention_metric_links"]["Row"];
export type InterventionOutcomeRow = Database["public"]["Tables"]["intervention_outcomes"]["Row"];

// Extended type with joins
export interface InterventionWithDetails extends InterventionRow {
  owner?: { id: string; full_name: string } | null;
  linked_metrics_count?: number;
  outcomes?: { actual_delta_value: number | null; actual_delta_percent: number | null }[];
}

// Constants for UI
export const INTERVENTION_STATUS_OPTIONS: { value: InterventionStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "abandoned", label: "Abandoned" },
];

export const INTERVENTION_TYPE_OPTIONS: { value: InterventionType; label: string }[] = [
  { value: "staffing", label: "Staffing" },
  { value: "marketing", label: "Marketing" },
  { value: "referral_outreach", label: "Referral Outreach" },
  { value: "scheduling", label: "Scheduling" },
  { value: "pricing", label: "Pricing" },
  { value: "workflow", label: "Workflow" },
  { value: "training", label: "Training" },
  { value: "equipment", label: "Equipment" },
  { value: "service_line", label: "Service Line" },
  { value: "other", label: "Other" },
];

export const EXPECTED_DIRECTION_OPTIONS: { value: ExpectedDirection; label: string }[] = [
  { value: "up", label: "Increase ↑" },
  { value: "down", label: "Decrease ↓" },
  { value: "stable", label: "Stabilize →" },
];

export const ORIGIN_TYPE_OPTIONS: { value: InterventionOriginType; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "issue", label: "Issue" },
  { value: "rock", label: "Rock" },
  { value: "todo", label: "To-Do" },
  { value: "ai_recommendation", label: "AI Recommendation" },
  { value: "detection", label: "Smart Detection" },
];

export const STATUS_COLORS: Record<InterventionStatus, string> = {
  planned: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  abandoned: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};
