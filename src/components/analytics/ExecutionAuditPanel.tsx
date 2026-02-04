/**
 * ExecutionAuditPanel - Dev-only collapsible panel showing recent audit events
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { 
  Bug, 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  FileText, 
  Beaker, 
  Users,
} from "lucide-react";
import { format } from "date-fns";

interface ExecutionAuditPanelProps {
  organizationId: string | null;
}

export function ExecutionAuditPanel({ organizationId }: ExecutionAuditPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Only show in development
  const isDev = import.meta.env.DEV;
  
  if (!isDev) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-dashed border-warning/50 bg-warning/5">
        <CardHeader className="py-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-warning">
                <Bug className="w-4 h-4" />
                Dev Audit Panel
              </CardTitle>
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-warning" />
              ) : (
                <ChevronRight className="w-4 h-4 text-warning" />
              )}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {organizationId ? (
              <AuditTabs organizationId={organizationId} />
            ) : (
              <p className="text-sm text-muted-foreground">No organization context</p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function AuditTabs({ organizationId }: { organizationId: string }) {
  return (
    <Tabs defaultValue="resolution-events" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="resolution-events" className="text-xs">
          <FileText className="w-3 h-3 mr-1" />
          Resolutions
        </TabsTrigger>
        <TabsTrigger value="meeting-commitments" className="text-xs">
          <Users className="w-3 h-3 mr-1" />
          Commitments
        </TabsTrigger>
        <TabsTrigger value="issue-interventions" className="text-xs">
          <Beaker className="w-3 h-3 mr-1" />
          From Issues
        </TabsTrigger>
      </TabsList>

      <TabsContent value="resolution-events" className="mt-2">
        <ResolutionEventsTab organizationId={organizationId} />
      </TabsContent>
      <TabsContent value="meeting-commitments" className="mt-2">
        <MeetingCommitmentsTab organizationId={organizationId} />
      </TabsContent>
      <TabsContent value="issue-interventions" className="mt-2">
        <IssueInterventionsTab organizationId={organizationId} />
      </TabsContent>
    </Tabs>
  );
}

function ResolutionEventsTab({ organizationId }: { organizationId: string }) {
  const { data: events, isLoading } = useQuery({
    queryKey: ["audit-resolution-events", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issue_resolution_events")
        .select("id, event_type, resolution_type, note, created_at, issue_id")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto">
      {events?.length === 0 && (
        <p className="text-xs text-muted-foreground">No resolution events</p>
      )}
      {events?.map((event) => (
        <div key={event.id} className="flex items-start gap-2 p-2 rounded bg-muted/50 text-xs">
          <Clock className="w-3 h-3 shrink-0 mt-0.5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">
                {event.event_type}
              </Badge>
              {event.resolution_type && (
                <Badge variant="secondary" className="text-[10px]">
                  {event.resolution_type}
                </Badge>
              )}
            </div>
            {event.note && (
              <p className="text-muted-foreground truncate mt-1">{event.note}</p>
            )}
            <p className="text-muted-foreground mt-1">
              {format(new Date(event.created_at), "MMM d, h:mm a")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MeetingCommitmentsTab({ organizationId }: { organizationId: string }) {
  const { data: commitments, isLoading } = useQuery({
    queryKey: ["audit-meeting-commitments", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_commitments")
        .select("id, commitment_type, label, created_at, meeting_id")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto">
      {commitments?.length === 0 && (
        <p className="text-xs text-muted-foreground">No meeting commitments</p>
      )}
      {commitments?.map((commitment) => (
        <div key={commitment.id} className="flex items-start gap-2 p-2 rounded bg-muted/50 text-xs">
          <Users className="w-3 h-3 shrink-0 mt-0.5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">
                {commitment.commitment_type}
              </Badge>
            </div>
            <p className="text-foreground truncate mt-1">{commitment.label}</p>
            <p className="text-muted-foreground mt-1">
              {format(new Date(commitment.created_at), "MMM d, h:mm a")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function IssueInterventionsTab({ organizationId }: { organizationId: string }) {
  const { data: interventions, isLoading } = useQuery({
    queryKey: ["audit-issue-interventions", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interventions")
        .select("id, title, created_at, origin_id, status")
        .eq("organization_id", organizationId)
        .eq("origin_type", "issue")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto">
      {interventions?.length === 0 && (
        <p className="text-xs text-muted-foreground">No interventions from issues</p>
      )}
      {interventions?.map((intervention) => (
        <div key={intervention.id} className="flex items-start gap-2 p-2 rounded bg-muted/50 text-xs">
          <Beaker className="w-3 h-3 shrink-0 mt-0.5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">
                {intervention.status}
              </Badge>
            </div>
            <p className="text-foreground truncate mt-1">{intervention.title}</p>
            <p className="text-muted-foreground mt-1">
              {format(new Date(intervention.created_at), "MMM d, h:mm a")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
