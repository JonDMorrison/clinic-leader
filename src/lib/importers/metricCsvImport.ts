import { parseCSV } from "./csvParser";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, parseISO } from "date-fns";

export interface ImportError {
  line: number;
  message: string;
}

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
}

interface MetricInfo {
  id: string;
  name: string;
  unit: string;
}

export const importMetricResultsFromCSV = async (
  csvContent: string,
  organizationId: string,
  allowOverrides: boolean = false
): Promise<ImportResult> => {
  const result: ImportResult = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Parse CSV
    const parsed = parseCSV(csvContent);
    
    // Validate headers
    const requiredHeaders = ["metric_name", "week_of", "actual", "source"];
    const missingHeaders = requiredHeaders.filter(h => !parsed.headers.includes(h));
    
    if (missingHeaders.length > 0) {
      result.errors.push({
        line: 0,
        message: `Missing required columns: ${missingHeaders.join(", ")}`,
      });
      return result;
    }

    // Fetch all metrics for the organization
    const { data: metrics, error: metricsError } = await supabase
      .from("metrics")
      .select("id, name, unit")
      .eq("organization_id", organizationId);

    if (metricsError || !metrics) {
      result.errors.push({
        line: 0,
        message: "Failed to fetch metrics from database",
      });
      return result;
    }

    // Create metric lookup map
    const metricMap = new Map<string, MetricInfo>(
      metrics.map((m) => [m.name.toLowerCase(), m])
    );

    // Process each row
    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      const lineNumber = i + 2; // +2 for header and 0-based index

      try {
        // Validate metric name
        const metricName = row.metric_name?.trim();
        if (!metricName) {
          result.errors.push({
            line: lineNumber,
            message: "Metric name is required",
          });
          continue;
        }

        const metric = metricMap.get(metricName.toLowerCase());
        if (!metric) {
          result.errors.push({
            line: lineNumber,
            message: `Metric "${metricName}" not found`,
          });
          continue;
        }

        // Validate and normalize date to Monday of week (ISO 8601)
        let weekStart: string;
        try {
          const parsedDate = parseISO(row.week_of);
          const monday = startOfWeek(parsedDate, { weekStartsOn: 1 });
          weekStart = monday.toISOString().split("T")[0];
        } catch (e) {
          result.errors.push({
            line: lineNumber,
            message: `Invalid date format: ${row.week_of}. Expected YYYY-MM-DD`,
          });
          continue;
        }

        // Validate actual value
        const actualValue = row.actual?.trim();
        if (actualValue === "" || actualValue === null || actualValue === undefined) {
          result.errors.push({
            line: lineNumber,
            message: "Actual value is required",
          });
          continue;
        }

        const numericValue = Number(actualValue);
        if (isNaN(numericValue)) {
          result.errors.push({
            line: lineNumber,
            message: `Invalid numeric value: ${actualValue}`,
          });
          continue;
        }

        // Validate source
        const source = row.source?.trim().toLowerCase();
        if (source !== "manual" && source !== "jane") {
          result.errors.push({
            line: lineNumber,
            message: `Invalid source: ${source}. Must be "manual" or "jane"`,
          });
          continue;
        }

        // Check if row already exists
        const { data: existing } = await supabase
          .from("metric_results")
          .select("*")
          .eq("metric_id", metric.id)
          .eq("week_start", weekStart)
          .maybeSingle();

        // If exists with Jane source and no override allowed, skip
        if (existing?.source === "jane" && !allowOverrides) {
          result.skipped++;
          continue;
        }

        // Upsert the row
        const { error: upsertError } = await supabase
          .from("metric_results")
          .upsert(
            {
              metric_id: metric.id,
              week_start: weekStart,
              value: numericValue,
              source: source as "manual" | "jane",
            },
            {
              onConflict: "metric_id,week_start",
            }
          );

        if (upsertError) {
          result.errors.push({
            line: lineNumber,
            message: `Database error: ${upsertError.message}`,
          });
          continue;
        }

        if (existing) {
          result.updated++;
        } else {
          result.inserted++;
        }
      } catch (error) {
        result.errors.push({
          line: lineNumber,
          message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }
  } catch (error) {
    result.errors.push({
      line: 0,
      message: `Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  return result;
};
