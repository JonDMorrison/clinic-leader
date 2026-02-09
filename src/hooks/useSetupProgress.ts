import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "./useCurrentUser";

export interface SetupChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  route?: string;
  description: string;
}

export function useSetupProgress() {
  const { data: currentUser } = useCurrentUser();

  const { data: setupProgress, isLoading } = useQuery({
    queryKey: ["setup-progress", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;

      const orgId = currentUser.team_id;

      // Fetch team info
      const { data: teamData } = await supabase
        .from("teams")
        .select("id")
        .eq("id", orgId)
        .maybeSingle();

      // Fetch counts
      const usersResult = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("team_id", orgId);
      const usersCount = usersResult.count || 0;

      const seatsResult = await supabase
        .from("seats")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId);
      const seatsCount = seatsResult.count || 0;

      const { data: vtoData } = await (supabase as any)
        .from("vto")
        .select("id")
        .eq("organization_id", orgId)
        .eq("active", true);
      const vtoCount = vtoData?.length || 0;

      const coreValuesResult = await supabase
        .from("org_core_values")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId);
      const coreValuesCount = coreValuesResult.count || 0;

      const metricsResult = await supabase
        .from("metrics")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId);
      const metricsCount = metricsResult.count || 0;

      const rocksResult = await supabase
        .from("rocks")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", orgId);
      const rocksCount = rocksResult.count || 0;

      const docsResult = await supabase
        .from("docs")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId);
      const docsCount = docsResult.count || 0;

      // Check data pipeline: any configured data source counts
      const { data: teamInfo } = await supabase
        .from("teams")
        .select("data_mode")
        .eq("id", orgId)
        .maybeSingle();

      const { data: janeIntegration } = await supabase
        .from("jane_integrations")
        .select("status")
        .eq("organization_id", orgId)
        .maybeSingle();

      const hasDataPipeline =
        teamInfo?.data_mode === "jane" && !!janeIntegration ||
        teamInfo?.data_mode === "default" && metricsCount > 0 ||
        janeIntegration?.status === "active" ||
        janeIntegration?.status === "connected";

      const items: SetupChecklistItem[] = [
        {
          id: "jane-integration",
          label: "Connect Your Data Pipeline",
          completed: !!hasDataPipeline,
          route: "/data",
          description: hasDataPipeline
            ? `Data source configured: ${teamInfo?.data_mode === "jane" ? "Jane" : "Manual / Workbook"}`
            : "Automate your scorecard with Jane — saves 2+ hours/week",
        },
        {
          id: "org-profile",
          label: "Organization Profile",
          completed: !!teamData,
          route: "/settings/organization",
          description: "Configure basic organization information and settings",
        },
        {
          id: "team-members",
          label: "Team Members Added",
          completed: usersCount > 1,
          route: "/people",
          description: "Add team members to your organization",
        },
        {
          id: "seats",
          label: "Organizational Seats",
          completed: seatsCount > 0,
          route: "/people",
          description: "Define roles and responsibilities with organizational seats",
        },
        {
          id: "vto",
          label: "V/TO Created",
          completed: vtoCount > 0,
          route: "/vto",
          description: "Build your Vision/Traction Organizer strategic plan",
        },
        {
          id: "core-values",
          label: "Core Values Defined",
          completed: coreValuesCount >= 3,
          route: "/vto/vision",
          description: "Define 3-7 core values that guide your organization",
        },
        {
          id: "scorecard",
          label: "Scorecard KPIs",
          completed: metricsCount >= 5,
          route: "/scorecard",
          description: "Set up key performance indicators to track weekly",
        },
        {
          id: "rocks",
          label: "First Rock Created",
          completed: rocksCount > 0,
          route: "/rocks",
          description: "Define your first 90-day priority",
        },
        {
          id: "docs",
          label: "Documents Uploaded",
          completed: docsCount > 0,
          route: "/docs",
          description: "Upload SOPs, policies, or training materials",
        },
      ];

      const completedCount = items.filter((item) => item.completed).length;
      const totalCount = items.length;
      const percentage = Math.round((completedCount / totalCount) * 100);

      return {
        items,
        completedCount,
        totalCount,
        percentage,
        isComplete: percentage === 100,
      };
    },
    enabled: !!currentUser?.team_id,
  });

  return {
    setupProgress,
    isLoading,
  };
}
