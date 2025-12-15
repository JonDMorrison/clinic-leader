import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Save, ArrowRight } from "lucide-react";
import { HelpHint } from "@/components/help/HelpHint";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AgendaTimer } from "@/components/l10/AgendaTimer";
import { ScorecardSnapshot } from "@/components/l10/ScorecardSnapshot";
import { RockReview } from "@/components/l10/RockReview";
import { HeadlinesCapture } from "@/components/l10/HeadlinesCapture";
import { TodoReview } from "@/components/l10/TodoReview";
import { IDSSection } from "@/components/l10/IDSSection";
import { VtoL10Panel } from "@/components/vto/VtoL10Panel";
import { exportMeetingMinutes } from "@/utils/exportMinutes";
import { AgendaSuggestions } from "@/components/l10/AgendaSuggestions";
import { useVTORealtimeSync } from "@/hooks/useVTORealtimeSync";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { CoreValuesStrip, CoreValueOfWeekCard, ShoutoutSection } from "@/components/core-values";
import { getMonthlyPeriodSelection } from "@/lib/scorecard/periodHelper";
import { metricStatus } from "@/lib/scorecard/metricStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";

const L10 = () => {
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [decisions, setDecisions] = useState<string[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Use centralized current user hook for org context
  const { data: currentUser } = useCurrentUser();
  const organizationId = currentUser?.team_id;

  // Enable real-time VTO progress sync during L10
  useVTORealtimeSync(organizationId);

  // Check for in-progress meeting today
  const { data: activeMeeting } = useQuery({
    queryKey: ["active-meeting-today", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data } = await supabase
        .from("meetings")
        .select("id, title, status")
        .eq("organization_id", organizationId)
        .eq("status", "in_progress")
        .gte("scheduled_for", today.toISOString())
        .lt("scheduled_for", tomorrow.toISOString())
        .limit(1)
        .single();

      return data;
    },
    enabled: !!organizationId,
  });

  // Fetch metrics instead of legacy kpis table
  const { data: metricsData, refetch: refetchMetrics } = useQuery({
    queryKey: ["metrics-l10", organizationId],
    queryFn: async () => {
      if (!organizationId) return { metrics: [], periodKey: null };
      
      // Get the latest period for this org
      const periodSelection = await getMonthlyPeriodSelection(organizationId);
      const periodKey = periodSelection.selectedPeriodKey;
      
      // Fetch active metrics
      const { data: metrics, error: metricsError } = await supabase
        .from("metrics")
        .select("id, name, target, direction, unit, owner, category, is_active")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("category")
        .order("name");
      
      if (metricsError) throw metricsError;
      if (!metrics?.length) return { metrics: [], periodKey };

      // Fetch owner names
      const ownerIds = [...new Set(metrics.map(m => m.owner).filter(Boolean))];
      const { data: users } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", ownerIds);
      
      const userMap = users?.reduce((acc, u) => {
        acc[u.id] = u.full_name;
        return acc;
      }, {} as Record<string, string>) || {};

      // Fetch metric results for the selected period
      const metricIds = metrics.map(m => m.id);
      const { data: results } = await supabase
        .from("metric_results")
        .select("metric_id, value, period_key")
        .in("metric_id", metricIds)
        .eq("period_type", "monthly")
        .eq("period_key", periodKey);

      // Map results by metric_id
      const resultsByMetric = results?.reduce((acc, r) => {
        acc[r.metric_id] = r;
        return acc;
      }, {} as Record<string, any>) || {};

      // Enrich metrics with current values and owner names
      const enrichedMetrics = metrics.map(metric => ({
        id: metric.id,
        name: metric.name,
        target: metric.target,
        direction: metric.direction,
        unit: metric.unit,
        owner_name: metric.owner ? userMap[metric.owner] : null,
        current_value: resultsByMetric[metric.id]?.value ?? null,
        period_key: periodKey,
      }));
      
      return { metrics: enrichedMetrics, periodKey };
    },
    enabled: !!organizationId,
  });

  const { data: rocks, refetch: refetchRocks } = useQuery({
    queryKey: ["rocks-l10", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("rocks")
        .select("*, users(full_name)")
        .eq("organization_id", organizationId)
        .neq("status", "done")
        .order("level");
      
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: todos, refetch: refetchTodos } = useQuery({
    queryKey: ["todos-l10", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("todos")
        .select("*, users(full_name)")
        .order("due_date");
      
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: issues, refetch: refetchIssues } = useQuery({
    queryKey: ["issues-l10", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("issues")
        .select("*, users(full_name)")
        .eq("organization_id", organizationId)
        .neq("status", "solved")
        .order("priority");
      
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: currentTeam } = useQuery({
    queryKey: ["current-team", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data } = await supabase
        .from("teams")
        .select("id, name")
        .eq("id", organizationId)
        .single();
      
      return data;
    },
    enabled: !!organizationId,
  });

  const handleCloseMeeting = async () => {
    try {
      const metrics = metricsData?.metrics || [];
      const periodKey = metricsData?.periodKey || null;
      
      // Prepare metric snapshot using metricStatus
      const metricSnapshot = metrics.map(metric => {
        const statusResult = metricStatus(
          { target: metric.target, direction: metric.direction, owner: metric.owner_name },
          { value: metric.current_value },
          periodKey
        );
        return {
          metric_id: metric.id,
          name: metric.name,
          target: metric.target,
          actual: metric.current_value,
          on_track: statusResult.status === 'on_track',
          status: statusResult.status,
        };
      });

      // Prepare Rock check
      const rockCheck = rocks?.map(rock => ({
        rock_id: rock.id,
        title: rock.title,
        status: rock.status,
        confidence: rock.confidence,
      })) || [];

      // Create meeting record (organization_id is now required)
      if (!organizationId) {
        throw new Error("No organization context available");
      }
      const { data: meeting, error: meetingError } = await supabase
        .from("meetings")
        .insert({
          type: "L10",
          organization_id: organizationId,
          scheduled_for: new Date().toISOString(),
          duration_minutes: 90,
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      // Save meeting notes with metric snapshot (using kpi_snapshot field for backward compat)
      const { error: notesError } = await supabase
        .from("meeting_notes")
        .insert({
          meeting_id: meeting.id,
          headlines,
          rock_check: rockCheck,
          kpi_snapshot: metricSnapshot, // Now contains metric data, not kpi data
          decisions,
        });

      if (notesError) throw notesError;

      toast({
        title: "Success",
        description: "Meeting closed and notes saved",
      });

      // Reset state
      setHeadlines([]);
      setDecisions([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExportMinutes = () => {
    const metrics = metricsData?.metrics || [];
    const periodKey = metricsData?.periodKey || null;
    
    if (!metrics.length && !rocks?.length) {
      toast({
        title: "Error",
        description: "Meeting data not loaded",
        variant: "destructive",
      });
      return;
    }

    const metricSnapshot = metrics.map(metric => {
      const statusResult = metricStatus(
        { target: metric.target, direction: metric.direction, owner: metric.owner_name },
        { value: metric.current_value },
        periodKey
      );
      return {
        name: metric.name,
        target: metric.target !== null ? `${metric.target} ${metric.unit}` : "—",
        actual: metric.current_value !== null ? `${metric.current_value} ${metric.unit}` : "—",
        on_track: statusResult.status === 'on_track',
      };
    });

    const rockCheck = rocks?.map(rock => ({
      title: rock.title,
      status: rock.status,
      confidence: rock.confidence || 0,
    })) || [];

    const todosList = todos?.map(todo => ({
      title: todo.title,
      owner: todo.users?.full_name || "Unassigned",
      due_date: todo.due_date,
    })) || [];

    const issuesList = issues?.map(issue => ({
      title: issue.title,
      priority: issue.priority,
    })) || [];

    exportMeetingMinutes({
      meetingDate: new Date().toISOString(),
      teamName: currentTeam?.name || "Team",
      kpiSnapshot: metricSnapshot, // Using kpiSnapshot field name for backward compat
      rockCheck,
      headlines,
      decisions,
      todos: todosList,
      issues: issuesList,
    });

    toast({
      title: "Success",
      description: "Meeting minutes exported as PDF",
    });
  };

  const metrics = metricsData?.metrics || [];
  const periodKey = metricsData?.periodKey || null;

  return (
    <div className="space-y-6">
      {/* Redirect Banner */}
      <Alert className="border-blue-500/50 bg-blue-500/10">
        <AlertDescription className="flex items-center justify-between">
          <span className="text-blue-700">
            <strong>Meetings have moved!</strong> Use the new Meetings page for scheduling, agenda editing, and live meeting mode.
          </span>
          <div className="flex gap-2">
            {activeMeeting && (
              <Button size="sm" onClick={() => navigate(`/meetings/${activeMeeting.id}`)}>
                Resume Current Meeting
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => navigate("/meetings")}>
              Go to Meetings
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
            Level 10 Meeting
            <HelpHint term="Meeting" context="l10_header" />
          </h1>
          <p className="text-muted-foreground">
            90-minute weekly leadership team meeting
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportMinutes}>
            <Download className="w-4 h-4 mr-2" />
            Export Minutes
          </Button>
          <Button onClick={handleCloseMeeting}>
            <Save className="w-4 h-4 mr-2" />
            Close Meeting
          </Button>
        </div>
      </div>

      <AgendaSuggestions teamId={organizationId || null} />

      {/* Core Values Strip */}
      <CoreValuesStrip compact />

      <VtoL10Panel />

      <div className="space-y-4">
        <AgendaTimer sectionName="Segue (Good News)" defaultMinutes={5} />
        
        {/* Core Values Shout-Out Section */}
        <ShoutoutSection />
        
        <div className="space-y-4">
          <AgendaTimer sectionName="Scorecard" defaultMinutes={5} />
          <ScorecardSnapshot metrics={metrics} periodKey={periodKey} />
        </div>

        <div className="space-y-4">
          <AgendaTimer sectionName="Rock Review" defaultMinutes={5} />
          <RockReview rocks={rocks || []} />
        </div>

        <div className="space-y-4">
          <AgendaTimer sectionName="Headlines" defaultMinutes={5} />
          <HeadlinesCapture headlines={headlines} onHeadlinesChange={setHeadlines} />
        </div>

        <div className="space-y-4">
          <AgendaTimer sectionName="Todo List" defaultMinutes={5} />
          <TodoReview todos={todos || []} onUpdate={refetchTodos} />
        </div>

        <div className="space-y-4">
          <AgendaTimer sectionName="IDS" defaultMinutes={60} />
          <IDSSection issues={issues || []} />
        </div>

        <AgendaTimer sectionName="Conclude (Recap & Rate)" defaultMinutes={5} />
      </div>
    </div>
  );
};

export default L10;
