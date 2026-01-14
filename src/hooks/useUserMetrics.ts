import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, format } from "date-fns";

interface UserMetricBreakdown {
  import_key: string;
  value: number;
  dimension_label: string;
  period_type: string;
  period_key: string;
}

interface UserMetricsSummary {
  totalVisits: number | null;
  totalInvoiced: number | null;
  visitsTrend: number | null; // percentage change vs last period
  invoicedTrend: number | null;
  isLinked: boolean;
  dimensionLabel: string | null;
}

export function useUserMetrics(userId: string | undefined, organizationId: string | undefined) {
  // First, get the user's jane_staff_member_guid
  const { data: user } = useQuery({
    queryKey: ["user-jane-guid", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("users")
        .select("jane_staff_member_guid")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const janeGuid = user?.jane_staff_member_guid;

  // Calculate current and previous period keys
  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const currentWeekKey = currentWeekStart.toISOString().slice(0, 10);
  
  const prevWeekStart = new Date(currentWeekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekKey = prevWeekStart.toISOString().slice(0, 10);

  // Fetch breakdown data for this user's linked clinician
  const { data: breakdowns, isLoading } = useQuery({
    queryKey: ["user-metric-breakdowns", janeGuid, organizationId, currentWeekKey, prevWeekKey],
    queryFn: async () => {
      if (!janeGuid || !organizationId) return [];
      
      const { data, error } = await supabase
        .from("metric_breakdowns")
        .select("import_key, value, dimension_label, period_type, period_key")
        .eq("organization_id", organizationId)
        .eq("dimension_id", janeGuid)
        .eq("period_type", "weekly")
        .in("period_key", [currentWeekKey, prevWeekKey]);

      if (error) throw error;
      return data as UserMetricBreakdown[];
    },
    enabled: !!janeGuid && !!organizationId,
  });

  // Process the data into a summary
  const summary: UserMetricsSummary = {
    totalVisits: null,
    totalInvoiced: null,
    visitsTrend: null,
    invoicedTrend: null,
    isLinked: !!janeGuid,
    dimensionLabel: null,
  };

  if (breakdowns && breakdowns.length > 0) {
    // Get dimension label from first record
    summary.dimensionLabel = breakdowns[0]?.dimension_label || null;

    // Current period values
    const currentVisits = breakdowns.find(
      (b) => b.import_key === "jane_total_visits" && b.period_key === currentWeekKey
    );
    const currentInvoiced = breakdowns.find(
      (b) => b.import_key === "jane_total_invoiced" && b.period_key === currentWeekKey
    );

    // Previous period values
    const prevVisits = breakdowns.find(
      (b) => b.import_key === "jane_total_visits" && b.period_key === prevWeekKey
    );
    const prevInvoiced = breakdowns.find(
      (b) => b.import_key === "jane_total_invoiced" && b.period_key === prevWeekKey
    );

    summary.totalVisits = currentVisits?.value ?? null;
    summary.totalInvoiced = currentInvoiced?.value ?? null;

    // Calculate trends
    if (currentVisits && prevVisits && prevVisits.value > 0) {
      summary.visitsTrend = Math.round(
        ((currentVisits.value - prevVisits.value) / prevVisits.value) * 100
      );
    }
    if (currentInvoiced && prevInvoiced && prevInvoiced.value > 0) {
      summary.invoicedTrend = Math.round(
        ((currentInvoiced.value - prevInvoiced.value) / prevInvoiced.value) * 100
      );
    }
  }

  return {
    summary,
    isLoading,
    isLinked: !!janeGuid,
  };
}

// Hook to fetch metrics for multiple users at once (more efficient)
export function useUsersMetrics(userIds: string[], organizationId: string | undefined) {
  // Fetch all users' jane_staff_member_guids
  const { data: users } = useQuery({
    queryKey: ["users-jane-guids", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("users")
        .select("id, jane_staff_member_guid")
        .in("id", userIds);
      if (error) throw error;
      return data;
    },
    enabled: userIds.length > 0,
  });

  const linkedGuids = users?.filter((u) => u.jane_staff_member_guid).map((u) => u.jane_staff_member_guid) || [];
  const guidToUserId = new Map(users?.map((u) => [u.jane_staff_member_guid, u.id]) || []);

  // Calculate current week key
  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const currentWeekKey = currentWeekStart.toISOString().slice(0, 10);

  const prevWeekStart = new Date(currentWeekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekKey = prevWeekStart.toISOString().slice(0, 10);

  // Fetch all breakdown data for linked users
  const { data: breakdowns, isLoading } = useQuery({
    queryKey: ["users-metric-breakdowns", linkedGuids, organizationId, currentWeekKey],
    queryFn: async () => {
      if (linkedGuids.length === 0 || !organizationId) return [];
      
      const { data, error } = await supabase
        .from("metric_breakdowns")
        .select("import_key, value, dimension_id, dimension_label, period_type, period_key")
        .eq("organization_id", organizationId)
        .in("dimension_id", linkedGuids as string[])
        .eq("period_type", "weekly")
        .in("period_key", [currentWeekKey, prevWeekKey]);

      if (error) throw error;
      return data;
    },
    enabled: linkedGuids.length > 0 && !!organizationId,
  });

  // Build a map of userId -> metrics summary
  const metricsMap = new Map<string, UserMetricsSummary>();

  // Initialize all users as not linked
  userIds.forEach((userId) => {
    const user = users?.find((u) => u.id === userId);
    metricsMap.set(userId, {
      totalVisits: null,
      totalInvoiced: null,
      visitsTrend: null,
      invoicedTrend: null,
      isLinked: !!user?.jane_staff_member_guid,
      dimensionLabel: null,
    });
  });

  // Process breakdown data
  if (breakdowns && users) {
    breakdowns.forEach((b) => {
      const userId = guidToUserId.get(b.dimension_id);
      if (!userId) return;

      const existing = metricsMap.get(userId);
      if (!existing) return;

      // Set dimension label
      if (!existing.dimensionLabel) {
        existing.dimensionLabel = b.dimension_label;
      }

      // Current period
      if (b.period_key === currentWeekKey) {
        if (b.import_key === "jane_total_visits") {
          existing.totalVisits = b.value;
        } else if (b.import_key === "jane_total_invoiced") {
          existing.totalInvoiced = b.value;
        }
      }
    });

    // Calculate trends
    breakdowns.forEach((b) => {
      if (b.period_key !== prevWeekKey) return;
      
      const userId = guidToUserId.get(b.dimension_id);
      if (!userId) return;

      const existing = metricsMap.get(userId);
      if (!existing) return;

      if (b.import_key === "jane_total_visits" && existing.totalVisits !== null && b.value > 0) {
        existing.visitsTrend = Math.round(((existing.totalVisits - b.value) / b.value) * 100);
      }
      if (b.import_key === "jane_total_invoiced" && existing.totalInvoiced !== null && b.value > 0) {
        existing.invoicedTrend = Math.round(((existing.totalInvoiced - b.value) / b.value) * 100);
      }
    });
  }

  return {
    metricsMap,
    isLoading,
  };
}
