import { supabase } from "@/integrations/supabase/client";
import { getCoachingTip } from "./coachingTips";
import { startOfWeek, subWeeks, format } from "date-fns";

interface MetricResult {
  metric_id: string;
  week_start: string;
  value: number | null;
}

interface Alert {
  organization_id: string;
  metric_id: string;
  week_of: string;
  alert_type: "off_target" | "downtrend" | "missing_data";
  message: string;
  tip: string;
}

export async function generateAlertsForOrganization(organizationId: string): Promise<void> {
  // Get current week
  const currentWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const lastWeek = format(subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1), "yyyy-MM-dd");

  // Fetch all metrics for org
  const { data: metrics, error: metricsError } = await supabase
    .from("metrics")
    .select("id, name, target, direction, organization_id")
    .eq("organization_id", organizationId);

  if (metricsError || !metrics) {
    console.error("Error fetching metrics:", metricsError);
    return;
  }

  const alerts: Alert[] = [];

  for (const metric of metrics) {
    // Get last 4 weeks of data
    const weeks = Array.from({ length: 4 }, (_, i) => {
      const date = subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), i + 1);
      return format(date, "yyyy-MM-dd");
    }).reverse();

    const { data: results } = await supabase
      .from("metric_results")
      .select("*")
      .eq("metric_id", metric.id)
      .in("week_start", weeks)
      .order("week_start", { ascending: true });

    if (!results) continue;

    const lastWeekResult = results.find(r => r.week_start === lastWeek);

    // Rule 1: Missing data for last week
    if (!lastWeekResult || lastWeekResult.value === null) {
      alerts.push({
        organization_id: organizationId,
        metric_id: metric.id,
        week_of: lastWeek,
        alert_type: "missing_data",
        message: `${metric.name}: No data entered for last week`,
        tip: getCoachingTip(metric.name, "missing_data")
      });
      continue; // Skip other checks if data is missing
    }

    // Rule 2: Off target by >15%
    if (metric.target && lastWeekResult.value !== null) {
      const percentageOfTarget = (lastWeekResult.value / metric.target) * 100;
      const isUp = metric.direction === "up" || metric.direction === ">=";
      
      let isOffTarget = false;
      if (isUp && percentageOfTarget < 85) {
        isOffTarget = true;
      } else if (!isUp && percentageOfTarget > 115) {
        isOffTarget = true;
      }

      if (isOffTarget) {
        alerts.push({
          organization_id: organizationId,
          metric_id: metric.id,
          week_of: lastWeek,
          alert_type: "off_target",
          message: `${metric.name}: ${Math.abs(100 - percentageOfTarget).toFixed(0)}% off target (${lastWeekResult.value} vs ${metric.target})`,
          tip: getCoachingTip(metric.name, "off_target")
        });
      }
    }

    // Rule 3: Downtrend for 3 weeks (direction aware)
    if (results.length >= 3) {
      const last3 = results.slice(-3).map(r => r.value).filter(v => v !== null) as number[];
      
      if (last3.length === 3) {
        const isUp = metric.direction === "up" || metric.direction === ">=";
        const isDowntrend = isUp 
          ? (last3[0] > last3[1] && last3[1] > last3[2])
          : (last3[0] < last3[1] && last3[1] < last3[2]);

        if (isDowntrend) {
          const trend = isUp ? "declining" : "increasing";
          alerts.push({
            organization_id: organizationId,
            metric_id: metric.id,
            week_of: lastWeek,
            alert_type: "downtrend",
            message: `${metric.name}: ${trend} for 3 consecutive weeks`,
            tip: getCoachingTip(metric.name, "downtrend")
          });
        }
      }
    }
  }

  // Upsert alerts (avoid duplicates)
  if (alerts.length > 0) {
    const { error: insertError } = await supabase
      .from("metric_alerts")
      .upsert(alerts, {
        onConflict: "metric_id,week_of,alert_type",
        ignoreDuplicates: true
      });

    if (insertError) {
      console.error("Error inserting alerts:", insertError);
    } else {
      console.log(`Generated ${alerts.length} alerts for org ${organizationId}`);
    }
  }
}
