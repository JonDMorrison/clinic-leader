import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "./useCurrentUser";
import { computeTemplateHealth } from "@/lib/scorecard/templateHealth";

export interface CutoverStatus {
  // Step 1: Template Keys
  templateKeysReady: boolean;
  missingKeyCount: number;
  duplicateKeyCount: number;

  // Step 2: Duplicates Resolved
  duplicatesResolved: boolean;
  duplicateNameCount: number;

  // Step 3: Monthly Data Loaded
  monthlyDataLoaded: boolean;
  metricsWithDataCount: number;
  minimumRequired: number;

  // Step 4: VTO Measurables Mapped
  vtoMapped: boolean;
  unmappedMeasurablesCount: number;
  totalMeasurablesCount: number;

  // Step 5: Meeting System Ready
  meetingReady: boolean;
  upcomingMeetingCount: number;

  // Overall
  allStepsComplete: boolean;
  scorecardReady: boolean;
  isLockedMode: boolean;
}

export function useCutoverReadiness() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const organizationId = currentUser?.team_id;
  const queryClient = useQueryClient();

  const { data: cutoverStatus, isLoading, refetch } = useQuery({
    queryKey: ["cutover-readiness", organizationId],
    queryFn: async (): Promise<CutoverStatus> => {
      if (!organizationId) {
        return getDefaultStatus();
      }

      // Fetch org settings
      const { data: org } = await supabase
        .from("teams")
        .select("scorecard_mode, scorecard_ready")
        .eq("id", organizationId)
        .single();

      const isLockedMode = org?.scorecard_mode === "locked_to_template";
      const scorecardReady = org?.scorecard_ready ?? false;

      // If not locked mode, skip cutover checks
      if (!isLockedMode) {
        return {
          ...getDefaultStatus(),
          isLockedMode: false,
          scorecardReady: true,
          allStepsComplete: true,
        };
      }

      // Step 1 & 2: Template health
      const templateHealth = await computeTemplateHealth(organizationId);
      const health = templateHealth.health;

      const templateKeysReady = health.missing_import_keys_count === 0 && health.duplicate_import_keys_count === 0;
      const duplicatesResolved = health.duplicate_metric_names_count === 0;

      // Step 3: Monthly data (at least 5 metrics with data)
      const minimumRequired = 5;
      const { data: dataResults } = await (supabase as any)
        .from("metric_results")
        .select("metric_id")
        .eq("organization_id", organizationId)
        .eq("period_type", "monthly");

      const uniqueMetricsWithData = new Set(dataResults?.map(r => r.metric_id) || []);
      const metricsWithDataCount = uniqueMetricsWithData.size;
      const monthlyDataLoaded = metricsWithDataCount >= minimumRequired;

      // Step 4: VTO measurables mapped
      const { data: activeVTO } = await supabase
        .from("vto")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .maybeSingle();

      let unmappedMeasurablesCount = 0;
      let totalMeasurablesCount = 0;
      let vtoMapped = true;

      if (activeVTO) {
        // Get VTO version with measurables
        const { data: vtoVersion } = await supabase
          .from("vto_versions")
          .select("three_year_picture, one_year_plan")
          .eq("vto_id", activeVTO.id)
          .order("version_number", { ascending: false })
          .limit(1)
          .single();

        // Count measurables from 3-year picture and 1-year plan
        const threeYear = vtoVersion?.three_year_picture as any;
        const oneYear = vtoVersion?.one_year_plan as any;

        // Count all items that could be linked to metrics
        const measurables: string[] = [];
        if (threeYear?.revenue_target) measurables.push("revenue");
        if (threeYear?.profit_target) measurables.push("profit");
        if (oneYear?.initiatives?.length) {
          oneYear.initiatives.forEach((i: any) => {
            if (i.title) measurables.push(i.title);
          });
        }

        totalMeasurablesCount = measurables.length;

        // Check VTO links to metrics
        const { data: vtoLinks } = await (supabase as any)
          .from("vto_links")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("link_type", "kpi");

        const mappedCount = vtoLinks?.length || 0;
        unmappedMeasurablesCount = Math.max(0, totalMeasurablesCount - mappedCount);
        vtoMapped = totalMeasurablesCount === 0 || mappedCount > 0;
      }

      // Step 5: Meeting ready
      const { data: upcomingMeetings } = await supabase
        .from("meetings")
        .select("id")
        .eq("organization_id", organizationId)
        .in("status", ["scheduled", "draft", "in_progress"])
        .gte("scheduled_for", new Date().toISOString());

      const upcomingMeetingCount = upcomingMeetings?.length || 0;
      const meetingReady = upcomingMeetingCount > 0;

      const allStepsComplete = templateKeysReady && duplicatesResolved && monthlyDataLoaded && vtoMapped && meetingReady;

      return {
        templateKeysReady,
        missingKeyCount: health.missing_import_keys_count,
        duplicateKeyCount: health.duplicate_import_keys_count,
        duplicatesResolved,
        duplicateNameCount: health.duplicate_metric_names_count,
        monthlyDataLoaded,
        metricsWithDataCount,
        minimumRequired,
        vtoMapped,
        unmappedMeasurablesCount,
        totalMeasurablesCount,
        meetingReady,
        upcomingMeetingCount,
        allStepsComplete,
        scorecardReady,
        isLockedMode,
      };
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Mark as ready mutation
  const markReadyMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization");

      const { error } = await supabase
        .from("teams")
        .update({
          scorecard_ready: true,
          scorecard_ready_checked_at: new Date().toISOString(),
          scorecard_ready_notes: "All cutover steps completed",
        } as any)
        .eq("id", organizationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cutover-readiness"] });
      queryClient.invalidateQueries({ queryKey: ["org-settings"] });
    },
  });

  return {
    cutoverStatus: cutoverStatus ?? getDefaultStatus(),
    isLoading: isLoading || userLoading,
    refetch,
    markReady: markReadyMutation.mutate,
    isMarkingReady: markReadyMutation.isPending,
  };
}

function getDefaultStatus(): CutoverStatus {
  return {
    templateKeysReady: false,
    missingKeyCount: 0,
    duplicateKeyCount: 0,
    duplicatesResolved: true,
    duplicateNameCount: 0,
    monthlyDataLoaded: false,
    metricsWithDataCount: 0,
    minimumRequired: 5,
    vtoMapped: true,
    unmappedMeasurablesCount: 0,
    totalMeasurablesCount: 0,
    meetingReady: false,
    upcomingMeetingCount: 0,
    allStepsComplete: false,
    scorecardReady: false,
    isLockedMode: false,
  };
}
