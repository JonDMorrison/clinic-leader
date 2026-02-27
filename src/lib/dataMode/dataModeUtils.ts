/**
 * Canonical data mode display helpers
 * 
 * Single source of truth for computing display labels from:
 * - teams.data_mode
 * - jane_integrations.status
 * - presence of legacy imports
 * - teams.ehr_system
 */

export type DataModeLabel = "Jane" | "Spreadsheet" | "Manual" | "Other EMR";

export type DataModeBadgeVariant = "jane" | "spreadsheet" | "manual" | "other_emr";

interface DataModeInput {
  dataMode: string | null | undefined;
  janeStatus: string | null | undefined;
  hasLegacyImports: boolean;
  ehrSystem?: string | null;
}

/**
 * Compute the user-facing data mode label from canonical fields.
 * This is the ONLY function that should determine which label to show.
 */
export function getOrgDataModeLabel(input: DataModeInput): DataModeLabel {
  const { janeStatus, hasLegacyImports, ehrSystem } = input;

  // Primary signal: active Jane connector status (teams.data_mode no longer used for logic)
  if (janeStatus === "active" || janeStatus === "receiving_data") {
    return "Jane";
  }

  // Check for Other EMR (ehr_system set to something other than Jane/None)
  if (ehrSystem && !["Jane", "None", ""].includes(ehrSystem)) {
    return "Other EMR";
  }

  // Standard mode: distinguish spreadsheet vs manual
  if (hasLegacyImports) {
    return "Spreadsheet";
  }

  return "Manual";
}

/**
 * Short description for each mode
 */
export function getOrgDataModeDescription(label: DataModeLabel): string {
  switch (label) {
    case "Jane":
      return "Metrics sync automatically from your Jane EMR.";
    case "Spreadsheet":
      return "Upload monthly workbooks to update metrics.";
    case "Manual":
      return "Enter metric values directly in the scorecard.";
    case "Other EMR":
      return "EMR preference recorded. Automated sync coming soon.";
  }
}

/**
 * Status line for Jane mode
 */
export function getJaneStatusLine(janeStatus: string | null | undefined): string {
  if (!janeStatus) return "Not connected";
  switch (janeStatus) {
    case "active":
    case "receiving_data":
      return "Connected";
    case "pending":
    case "awaiting_first_file":
    case "awaiting_jane_setup":
    case "requested":
      return "Setup pending";
    case "error":
      return "Connection error";
    case "inactive":
    case "paused":
      return "Paused";
    default:
      return "Not connected";
  }
}

/**
 * Badge variant for styling
 */
export function getOrgDataModeBadgeVariant(label: DataModeLabel): DataModeBadgeVariant {
  switch (label) {
    case "Jane":
      return "jane";
    case "Spreadsheet":
      return "spreadsheet";
    case "Manual":
      return "manual";
    case "Other EMR":
      return "other_emr";
  }
}

/**
 * Get mode-specific bullets for "What happens in this mode"
 */
export function getModeBullets(label: DataModeLabel): string[] {
  switch (label) {
    case "Jane":
      return [
        "Metrics sync automatically from Jane daily",
        "Scorecard uses canonical Jane-sourced values",
        "Manual imports still available as backup",
      ];
    case "Spreadsheet":
      return [
        "Upload monthly workbooks to populate metrics",
        "Scorecard reads from imported canonical values",
        "Supports Lori workbook and custom Excel templates",
      ];
    case "Manual":
      return [
        "Enter values directly in the scorecard each period",
        "No integrations or imports required",
        "Flexible for any workflow or data source",
      ];
    case "Other EMR":
      return [
        "Your EMR preference is recorded",
        "Use Spreadsheet or Manual entry until integration is ready",
        "We'll notify you when automated sync is available",
      ];
  }
}

/**
 * @deprecated Use getWizardNextStepCard from dataModeNextStep.ts instead.
 * Kept temporarily for any remaining call sites.
 */
export interface NextStepCTA {
  title: string;
  description: string;
  buttonLabel: string;
  href: string;
}
