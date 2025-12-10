import { supabase } from "@/integrations/supabase/client";

export interface RockMetricLink {
  id: string;
  rock_id: string;
  metric_id: string;
  organization_id: string;
  created_by?: string | null;
  created_at: string;
}

export interface LinkedMetricSummary {
  id: string;
  name: string;
  status_color: 'green' | 'yellow' | 'red' | 'grey';
  latest_value?: number | null;
  target?: number | null;
  unit?: string;
}

export interface LinkedRockSummary {
  id: string;
  title: string;
  quarter: string;
  status: 'on_track' | 'off_track' | 'done';
}

/**
 * Link a metric to a rock
 */
export async function linkMetricToRock(
  rockId: string,
  metricId: string,
  organizationId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("rock_metric_links")
    .insert({
      rock_id: rockId,
      metric_id: metricId,
      organization_id: organizationId,
      created_by: userId || null,
    });

  if (error) {
    if (error.code === "23505") {
      // Unique constraint violation - already linked
      return { success: true };
    }
    console.error("Error linking metric to rock:", error);
    return { success: false, error: "Failed to link metric to rock" };
  }

  return { success: true };
}

/**
 * Unlink a metric from a rock
 */
export async function unlinkMetricFromRock(
  rockId: string,
  metricId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("rock_metric_links")
    .delete()
    .eq("rock_id", rockId)
    .eq("metric_id", metricId);

  if (error) {
    console.error("Error unlinking metric from rock:", error);
    return { success: false, error: "Failed to unlink metric from rock" };
  }

  return { success: true };
}

/**
 * Set all metric links for a rock (replaces existing)
 */
export async function setRockMetricLinks(
  rockId: string,
  metricIds: string[],
  organizationId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  // Get existing links
  const { data: existingLinks, error: fetchError } = await supabase
    .from("rock_metric_links")
    .select("metric_id")
    .eq("rock_id", rockId);

  if (fetchError) {
    console.error("Error fetching existing links:", fetchError);
    return { success: false, error: "Failed to fetch existing links" };
  }

  const existingMetricIds = new Set(existingLinks?.map((l) => l.metric_id) || []);
  const newMetricIds = new Set(metricIds);

  // Find links to delete
  const toDelete = [...existingMetricIds].filter((id) => !newMetricIds.has(id));
  // Find links to add
  const toAdd = metricIds.filter((id) => !existingMetricIds.has(id));

  // Delete removed links
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("rock_metric_links")
      .delete()
      .eq("rock_id", rockId)
      .in("metric_id", toDelete);

    if (deleteError) {
      console.error("Error deleting links:", deleteError);
      return { success: false, error: "Failed to update links" };
    }
  }

  // Add new links
  if (toAdd.length > 0) {
    const { error: insertError } = await supabase.from("rock_metric_links").insert(
      toAdd.map((metricId) => ({
        rock_id: rockId,
        metric_id: metricId,
        organization_id: organizationId,
        created_by: userId || null,
      }))
    );

    if (insertError) {
      console.error("Error inserting links:", insertError);
      return { success: false, error: "Failed to update links" };
    }
  }

  return { success: true };
}

/**
 * Set all rock links for a metric (replaces existing)
 */
export async function setMetricRockLinks(
  metricId: string,
  rockIds: string[],
  organizationId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  // Get existing links
  const { data: existingLinks, error: fetchError } = await supabase
    .from("rock_metric_links")
    .select("rock_id")
    .eq("metric_id", metricId);

  if (fetchError) {
    console.error("Error fetching existing links:", fetchError);
    return { success: false, error: "Failed to fetch existing links" };
  }

  const existingRockIds = new Set(existingLinks?.map((l) => l.rock_id) || []);
  const newRockIds = new Set(rockIds);

  // Find links to delete
  const toDelete = [...existingRockIds].filter((id) => !newRockIds.has(id));
  // Find links to add
  const toAdd = rockIds.filter((id) => !existingRockIds.has(id));

  // Delete removed links
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("rock_metric_links")
      .delete()
      .eq("metric_id", metricId)
      .in("rock_id", toDelete);

    if (deleteError) {
      console.error("Error deleting links:", deleteError);
      return { success: false, error: "Failed to update links" };
    }
  }

  // Add new links
  if (toAdd.length > 0) {
    const { error: insertError } = await supabase.from("rock_metric_links").insert(
      toAdd.map((rockId) => ({
        rock_id: rockId,
        metric_id: metricId,
        organization_id: organizationId,
        created_by: userId || null,
      }))
    );

    if (insertError) {
      console.error("Error inserting links:", insertError);
      return { success: false, error: "Failed to update links" };
    }
  }

  return { success: true };
}

/**
 * Get all metric links for a rock with metric details
 */
export async function getLinkedMetricsForRock(
  rockId: string
): Promise<LinkedMetricSummary[]> {
  const { data: links, error } = await supabase
    .from("rock_metric_links")
    .select(`
      metric_id,
      metrics (
        id,
        name,
        target,
        direction,
        unit
      )
    `)
    .eq("rock_id", rockId);

  if (error || !links) {
    console.error("Error fetching linked metrics:", error);
    return [];
  }

  // Get latest values for these metrics
  const metricIds = links.map((l) => l.metric_id);
  const { data: results } = await supabase
    .from("metric_results")
    .select("metric_id, value, week_start")
    .in("metric_id", metricIds)
    .order("week_start", { ascending: false });

  // Build latest value map
  const latestValues: Record<string, number | null> = {};
  results?.forEach((r) => {
    if (!(r.metric_id in latestValues)) {
      latestValues[r.metric_id] = r.value;
    }
  });

  return links.map((link) => {
    const metric = link.metrics as any;
    const value = latestValues[link.metric_id];
    const target = metric?.target;
    const direction = metric?.direction;

    let status_color: LinkedMetricSummary["status_color"] = "grey";
    if (value !== null && value !== undefined && target !== null && target !== undefined) {
      const isUp = direction === "up" || direction === ">=";
      const diff = isUp ? value - target : target - value;
      const threshold = Math.abs(target * 0.15);
      
      if (diff >= 0) {
        status_color = "green";
      } else if (Math.abs(diff) <= threshold) {
        status_color = "yellow";
      } else {
        status_color = "red";
      }
    }

    return {
      id: metric?.id || link.metric_id,
      name: metric?.name || "Unknown Metric",
      status_color,
      latest_value: value,
      target: metric?.target,
      unit: metric?.unit,
    };
  });
}

/**
 * Get all rock links for a metric with rock details
 */
export async function getLinkedRocksForMetric(
  metricId: string
): Promise<LinkedRockSummary[]> {
  const { data: links, error } = await supabase
    .from("rock_metric_links")
    .select(`
      rock_id,
      rocks (
        id,
        title,
        quarter,
        status
      )
    `)
    .eq("metric_id", metricId);

  if (error || !links) {
    console.error("Error fetching linked rocks:", error);
    return [];
  }

  return links.map((link) => {
    const rock = link.rocks as any;
    return {
      id: rock?.id || link.rock_id,
      title: rock?.title || "Unknown Rock",
      quarter: rock?.quarter || "",
      status: rock?.status || "on_track",
    };
  });
}

/**
 * Get metric IDs linked to a rock
 */
export async function getLinkedMetricIds(rockId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("rock_metric_links")
    .select("metric_id")
    .eq("rock_id", rockId);

  if (error) {
    console.error("Error fetching linked metric IDs:", error);
    return [];
  }

  return data?.map((l) => l.metric_id) || [];
}

/**
 * Get rock IDs linked to a metric
 */
export async function getLinkedRockIds(metricId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("rock_metric_links")
    .select("rock_id")
    .eq("metric_id", metricId);

  if (error) {
    console.error("Error fetching linked rock IDs:", error);
    return [];
  }

  return data?.map((l) => l.rock_id) || [];
}
