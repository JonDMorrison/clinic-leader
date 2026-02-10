/**
 * Enterprise-grade "What happens next" card logic.
 *
 * 3-state Jane, spreadsheet upload awareness, manual metric awareness,
 * proof lines, and a secondary "Change data source" link.
 */
import { type LastDataActivity, formatProofDate } from "./dataModeActivity";

export interface NextStepCard {
  title: string;
  body: string;
  primaryCta: { label: string; href: string };
  proofLine: string;
  secondaryLink: { label: string; href: string };
}

interface NextStepParams {
  targetSource: "jane" | "spreadsheet" | "manual" | "other_emr";
  janeStatus: string | null | undefined;
  hasSpreadsheetUploads: boolean;
  hasAnyMetrics: boolean;
  lastActivity: LastDataActivity;
  hasRecentAutomatedDeliveries?: boolean;
}

export function getWizardNextStepCard(params: NextStepParams): NextStepCard {
  const { targetSource, janeStatus, hasSpreadsheetUploads, hasAnyMetrics, lastActivity } = params;

  const secondary = { label: "Change data source", href: "/settings/data" };
  const title = "What happens next";

  switch (targetSource) {
    case "jane": {
      const isActive = janeStatus === "active" || janeStatus === "receiving_data";
      const hasDeliveries = !!lastActivity.janeLastDeliveryAt;

      if (!isActive) {
        // State 1: Not connected
        return {
          title,
          body: "Connect Jane to start syncing your clinic performance data automatically.",
          primaryCta: { label: "Connect Jane", href: "/integrations/jane" },
          proofLine: hasDeliveries
            ? `Last sync: ${formatProofDate(lastActivity.janeLastDeliveryAt!)}`
            : "No sync received yet",
          secondaryLink: secondary,
        };
      }

      if (!hasDeliveries) {
        // State 2: Connected but no deliveries yet
        return {
          title,
          body: "Jane is connected. Your first sync should arrive shortly. Once it does, you'll be able to choose which metrics to track on your Scorecard.",
          primaryCta: { label: "Go to Data", href: "/data" },
          proofLine: "No sync received yet",
          secondaryLink: secondary,
        };
      }

      // State 3: Connected with deliveries
      return {
        title,
        body: "Jane data is syncing. Go to Data to review available metrics and choose what to track on your Scorecard.",
        primaryCta: { label: "View Your Data", href: "/data" },
        proofLine: `Last sync: ${formatProofDate(lastActivity.janeLastDeliveryAt!)}`,
        secondaryLink: secondary,
      };
    }

    case "spreadsheet": {
      if (!hasSpreadsheetUploads) {
        return {
          title,
          body: "Upload your monthly workbook to populate your metrics.",
          primaryCta: { label: "Upload Monthly Workbook", href: "/imports/monthly-report" },
          proofLine: "No workbook uploaded yet",
          secondaryLink: secondary,
        };
      }
      return {
        title,
        body: "Upload your latest month when it's ready. Your Scorecard will update automatically.",
        primaryCta: { label: "Upload Latest Workbook", href: "/imports/monthly-report" },
        proofLine: lastActivity.spreadsheetLastUploadAt
          ? `Last upload: ${formatProofDate(lastActivity.spreadsheetLastUploadAt)}`
          : "No workbook uploaded yet",
        secondaryLink: secondary,
      };
    }

    case "manual": {
      if (!hasAnyMetrics) {
        return {
          title,
          body: "Create your first metric, then you can enter values each week or month.",
          primaryCta: { label: "Create First Metric", href: "/scorecard" },
          proofLine: "No manual entries yet",
          secondaryLink: secondary,
        };
      }
      return {
        title,
        body: "Enter this period's values to keep your Scorecard up to date.",
        primaryCta: { label: "Enter Scorecard Values", href: "/scorecard" },
        proofLine: lastActivity.manualLastEntryAt
          ? `Last entry: ${formatProofDate(lastActivity.manualLastEntryAt)}`
          : "No manual entries yet",
        secondaryLink: secondary,
      };
    }

    case "other_emr": {
      if (params.hasRecentAutomatedDeliveries) {
        return {
          title,
          body: "Your EMR is delivering data. Go to Data to review available metrics and choose what to track.",
          primaryCta: { label: "View Your Data", href: "/data" },
          proofLine: lastActivity.spreadsheetLastUploadAt
            ? `Last workbook upload: ${formatProofDate(lastActivity.spreadsheetLastUploadAt)}`
            : "Automated deliveries detected",
          secondaryLink: secondary,
        };
      }
      return {
        title,
        body: "Automated sync for your EMR is coming later. You can start today using Spreadsheet Import.",
        primaryCta: { label: "Set Up Spreadsheet Import", href: "/imports/monthly-report" },
        proofLine: lastActivity.spreadsheetLastUploadAt
          ? `Last workbook upload: ${formatProofDate(lastActivity.spreadsheetLastUploadAt)}`
          : "No workbook uploaded yet",
        secondaryLink: secondary,
      };
    }
  }
}
