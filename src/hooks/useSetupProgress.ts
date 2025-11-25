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

      // Fetch counts directly to avoid deep type instantiation
      const [
        teamCount,
        usersCount,
        seatsCount,
        vtoCount,
        coreValuesCount,
        metricsCount,
        rocksCount,
        docsCount,
        janeStatus,
      ] = await Promise.all([
        supabase.from("teams").select("id", { count: "exact", head: false }).eq("id", orgId).single().then(r => r.data),
        supabase.from("users").select("id", { count: "exact", head: false }).eq("team_id", orgId).then(r => r.count || 0),
        supabase.from("seats").select("id", { count: "exact", head: false }).eq("organization_id", orgId).then(r => r.count || 0),
        supabase.from("vto").select("id", { count: "exact", head: false }).eq("organization_id", orgId).eq("active", true).then(r => r.count || 0),
        supabase.from("org_core_values").select("id", { count: "exact", head: false }).eq("organization_id", orgId).then(r => r.count || 0),
        supabase.from("metrics").select("id", { count: "exact", head: false }).eq("organization_id", orgId).then(r => r.count || 0),
        supabase.rpc("count_user_rocks", { org_id: orgId }).then(r => r.data || 0).catch(() => 0),
        supabase.from("docs").select("id", { count: "exact", head: false }).eq("organization_id", orgId).then(r => r.count || 0),
        supabase.from("jane_integrations").select("status").eq("organization_id", orgId).maybeSingle().then(r => r.data?.status),
      ]);

      const items: SetupChecklistItem[] = [
        {
          id: "org-profile",
          label: "Organization Profile",
          completed: !!teamCount,
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
        {
          id: "jane-integration",
          label: "Jane Integration (Optional)",
          completed: janeStatus === "active",
          route: "/integrations/jane",
          description: "Connect Jane App for automatic data sync",
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
