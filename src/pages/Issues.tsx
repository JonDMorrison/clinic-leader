import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IDSBoard } from "@/components/issues/IDSBoard";
import { NewIssueModal } from "@/components/issues/NewIssueModal";
import { IssueSuggestionsBanner } from "@/components/issues/IssueSuggestionsBanner";
import { IDSFollowThroughCard } from "@/components/issues/IDSFollowThroughCard";
import { IssuesWorkflowBanner } from "@/components/issues/IssuesWorkflowBanner";
import { SmartInterventionSuggestionList } from "@/components/interventions/SmartInterventionSuggestionList";
import { HelpHint } from "@/components/help/HelpHint";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useOrgSafetyCheck } from "@/hooks/useOrgSafetyCheck";

const Issues = () => {
  const [newIssueModalOpen, setNewIssueModalOpen] = useState(false);
  const { orgId, isLoading: userLoading, isValid, OrgMissingError } = useOrgSafetyCheck();
  const { data: currentUser } = useCurrentUser();

  const { data: issues, isLoading, refetch } = useQuery({
    queryKey: ["issues", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      const { data, error } = await supabase
        .from("issues")
        .select("*, users(full_name), todos(id, title, done_at)")
        .eq("organization_id", orgId) // MULTI-TENANCY: Explicit org filter
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Sort by source priority: Scorecard > Rock > Manual, then by manual priority
      const getSourceOrder = (issue: any) => {
        if (issue.metric_id) return 0; // Scorecard
        if (issue.rock_id) return 1;   // Rock
        return 2;                       // Manual
      };
      
      return (data || []).sort((a, b) => {
        // First by source
        const sourceA = getSourceOrder(a);
        const sourceB = getSourceOrder(b);
        if (sourceA !== sourceB) return sourceA - sourceB;
        // Then by priority
        return (a.priority || 999) - (b.priority || 999);
      });
    },
    enabled: !!orgId,
  });

  const { data: teams } = useQuery({
    queryKey: ["teams", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      // Only return current user's team
      const { data, error } = await supabase
        .from("teams")
        .select("id, name")
        .eq("id", orgId); // MULTI-TENANCY: Only current org
      
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: users } = useQuery({
    queryKey: ["users", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("team_id", orgId) // MULTI-TENANCY: Explicit org filter
        .order("full_name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  if (userLoading) {
    return <div className="space-y-6"><p className="text-muted-foreground">Loading...</p></div>;
  }

  if (!isValid) {
    return <OrgMissingError />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
            Issues
            <HelpHint term="Issue" context="issues_header" />
          </h1>
          <p className="text-muted-foreground">
            Identify, discuss, and solve operational challenges
          </p>
        </div>
        <Button onClick={() => setNewIssueModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Issue
        </Button>
      </div>

      {/* IDS Follow-through Metric */}
      <IDSFollowThroughCard />

      {/* Workflow Education Banner */}
      <IssuesWorkflowBanner />

      {/* AI Issue Suggestions Banner */}
      <IssueSuggestionsBanner organizationId={orgId} onIssueCreated={refetch} />

      {/* Smart Intervention Suggestions - compact mode */}
      <SmartInterventionSuggestionList organizationId={orgId} compact maxVisible={1} />

      <Card>
        <CardHeader>
          <CardTitle>Issues List</CardTitle>
          <p className="text-sm text-muted-foreground">
            Use the IDS process to resolve issues, then create an Intervention to track your solution.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading issues...</p>
          ) : (
            <IDSBoard issues={issues || []} onUpdate={refetch} />
          )}
        </CardContent>
      </Card>

      <NewIssueModal
        open={newIssueModalOpen}
        onClose={() => setNewIssueModalOpen(false)}
        teams={teams || []}
        users={users || []}
        onSuccess={refetch}
        organizationId={orgId}
      />
    </div>
  );
};

export default Issues;
