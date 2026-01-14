import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPeriodKeys, PeriodType } from "@/lib/periodKeys";

export interface SeatMetric {
  id: string;
  seat_id: string;
  import_key: string;
  dimension_type: string | null;
  dimension_id: string | null;
  dimension_label: string | null;
  period_type: string;
  currentValue: number | null;
  previousValue: number | null;
  trend: number | null;
}

/**
 * Fetch all seat_metrics for a given seat and resolve their current values
 * from either metric_results (aggregate) or metric_breakdowns (dimension-specific)
 */
export function useSeatMetrics(seatId: string | undefined, organizationId: string | undefined) {
  // Use canonical period key helper for consistency with /data
  const weeklyKeys = getPeriodKeys("weekly");
  const currentWeekKey = weeklyKeys.current;
  const prevWeekKey = weeklyKeys.previous;

  // Fetch seat_metrics records for this seat
  const { data: seatMetrics, isLoading: loadingSeatMetrics } = useQuery({
    queryKey: ["seat-metrics-for-seat", seatId],
    queryFn: async () => {
      if (!seatId) return [];
      const { data, error } = await supabase
        .from("seat_metrics")
        .select("id, seat_id, import_key, dimension_type, dimension_id, dimension_label, period_type")
        .eq("seat_id", seatId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!seatId,
  });

  // Collect all import_keys for fetching values
  const importKeys = seatMetrics?.map((sm) => sm.import_key) || [];
  const dimensionIds = seatMetrics?.filter((sm) => sm.dimension_id).map((sm) => sm.dimension_id) || [];

  // Fetch metric_results for aggregate metrics (when dimension_id is null)
  const { data: metricResults, isLoading: loadingResults } = useQuery({
    queryKey: ["seat-metric-results", organizationId, importKeys, currentWeekKey, prevWeekKey],
    queryFn: async () => {
      if (!organizationId || importKeys.length === 0) return [];
      
      // We need to join metrics to get import_key, but metric_results has metric_id
      // For now, query metric_breakdowns where dimension_id is null or query metrics table
      // Actually, seat_metrics uses import_key which maps to metrics.import_key
      const { data, error } = await supabase
        .from("metrics")
        .select(`
          id,
          import_key,
          metric_results(value, week_start)
        `)
        .eq("organization_id", organizationId)
        .in("import_key", importKeys);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && importKeys.length > 0,
  });

  // Fetch metric_breakdowns for dimension-specific metrics
  const { data: breakdowns, isLoading: loadingBreakdowns } = useQuery({
    queryKey: ["seat-metric-breakdowns", organizationId, dimensionIds, importKeys, currentWeekKey, prevWeekKey],
    queryFn: async () => {
      if (!organizationId || dimensionIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("metric_breakdowns")
        .select("import_key, dimension_id, dimension_label, value, period_key, period_type")
        .eq("organization_id", organizationId)
        .in("dimension_id", dimensionIds as string[])
        .in("import_key", importKeys)
        .eq("period_type", "weekly")
        .in("period_key", [currentWeekKey, prevWeekKey]);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && dimensionIds.length > 0,
  });

  // Process and enrich seat_metrics with current values
  const enrichedMetrics: SeatMetric[] = (seatMetrics || []).map((sm) => {
    let currentValue: number | null = null;
    let previousValue: number | null = null;

    if (sm.dimension_id) {
      // Dimension-specific: look in breakdowns
      const currentBreakdown = breakdowns?.find(
        (b) => b.import_key === sm.import_key && b.dimension_id === sm.dimension_id && b.period_key === currentWeekKey
      );
      const prevBreakdown = breakdowns?.find(
        (b) => b.import_key === sm.import_key && b.dimension_id === sm.dimension_id && b.period_key === prevWeekKey
      );
      currentValue = currentBreakdown?.value ?? null;
      previousValue = prevBreakdown?.value ?? null;
    } else {
      // Aggregate: look in metric_results
      const metric = metricResults?.find((m) => m.import_key === sm.import_key);
      if (metric?.metric_results) {
        const results = metric.metric_results as Array<{ value: number; week_start: string }>;
        const currentResult = results.find((r) => r.week_start === currentWeekKey);
        const prevResult = results.find((r) => r.week_start === prevWeekKey);
        currentValue = currentResult?.value ?? null;
        previousValue = prevResult?.value ?? null;
      }
    }

    // Calculate trend
    let trend: number | null = null;
    if (currentValue !== null && previousValue !== null && previousValue > 0) {
      trend = Math.round(((currentValue - previousValue) / previousValue) * 100);
    }

    return {
      id: sm.id,
      seat_id: sm.seat_id,
      import_key: sm.import_key,
      dimension_type: sm.dimension_type,
      dimension_id: sm.dimension_id,
      dimension_label: sm.dimension_label,
      period_type: sm.period_type,
      currentValue,
      previousValue,
      trend,
    };
  });

  return {
    metrics: enrichedMetrics,
    isLoading: loadingSeatMetrics || loadingResults || loadingBreakdowns,
  };
}

/**
 * Get all seat_metrics for seats a user occupies (via seat_users)
 */
export function useUserSeatMetrics(userId: string | undefined, organizationId: string | undefined) {
  // First, get the seats this user occupies
  const { data: userSeats, isLoading: loadingSeats } = useQuery({
    queryKey: ["user-seats", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("seat_users")
        .select(`
          seat_id,
          seats(id, title)
        `)
        .eq("user_id", userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const seatIds = userSeats?.map((su) => su.seat_id) || [];

  // Use canonical period key helper for consistency with /data
  const weeklyKeys = getPeriodKeys("weekly");
  const currentWeekKey = weeklyKeys.current;
  const prevWeekKey = weeklyKeys.previous;

  // Fetch all seat_metrics for those seats
  const { data: seatMetrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ["user-seat-metrics", seatIds],
    queryFn: async () => {
      if (seatIds.length === 0) return [];
      const { data, error } = await supabase
        .from("seat_metrics")
        .select("id, seat_id, import_key, dimension_type, dimension_id, dimension_label, period_type")
        .in("seat_id", seatIds);
      if (error) throw error;
      return data || [];
    },
    enabled: seatIds.length > 0,
  });

  // Collect keys for value lookup
  const importKeys = seatMetrics?.map((sm) => sm.import_key) || [];
  const dimensionIds = seatMetrics?.filter((sm) => sm.dimension_id).map((sm) => sm.dimension_id) || [];

  // Fetch breakdowns for dimension-specific
  const { data: breakdowns, isLoading: loadingBreakdowns } = useQuery({
    queryKey: ["user-seat-breakdowns", organizationId, dimensionIds, importKeys, currentWeekKey],
    queryFn: async () => {
      if (!organizationId || dimensionIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("metric_breakdowns")
        .select("import_key, dimension_id, value, period_key")
        .eq("organization_id", organizationId)
        .in("dimension_id", dimensionIds as string[])
        .in("import_key", importKeys)
        .eq("period_type", "weekly")
        .in("period_key", [currentWeekKey, prevWeekKey]);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && dimensionIds.length > 0,
  });

  // Build enriched metrics with seat info
  interface UserSeatMetric extends SeatMetric {
    seatTitle: string;
  }

  const enrichedMetrics: UserSeatMetric[] = (seatMetrics || []).map((sm) => {
    const seatInfo = userSeats?.find((su) => su.seat_id === sm.seat_id);
    let currentValue: number | null = null;
    let previousValue: number | null = null;

    if (sm.dimension_id) {
      const currentBreakdown = breakdowns?.find(
        (b) => b.import_key === sm.import_key && b.dimension_id === sm.dimension_id && b.period_key === currentWeekKey
      );
      const prevBreakdown = breakdowns?.find(
        (b) => b.import_key === sm.import_key && b.dimension_id === sm.dimension_id && b.period_key === prevWeekKey
      );
      currentValue = currentBreakdown?.value ?? null;
      previousValue = prevBreakdown?.value ?? null;
    }

    let trend: number | null = null;
    if (currentValue !== null && previousValue !== null && previousValue > 0) {
      trend = Math.round(((currentValue - previousValue) / previousValue) * 100);
    }

    return {
      id: sm.id,
      seat_id: sm.seat_id,
      seatTitle: (seatInfo?.seats as any)?.title || "Unknown Seat",
      import_key: sm.import_key,
      dimension_type: sm.dimension_type,
      dimension_id: sm.dimension_id,
      dimension_label: sm.dimension_label,
      period_type: sm.period_type,
      currentValue,
      previousValue,
      trend,
    };
  });

  return {
    seats: userSeats?.map((su) => ({
      id: su.seat_id,
      title: (su.seats as any)?.title || "Unknown Seat",
    })) || [],
    metrics: enrichedMetrics,
    isLoading: loadingSeats || loadingMetrics || loadingBreakdowns,
  };
}
