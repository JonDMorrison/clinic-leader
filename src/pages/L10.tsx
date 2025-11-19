import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Save } from "lucide-react";
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

const L10 = () => {
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [decisions, setDecisions] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: teamData } = useQuery({
    queryKey: ["current-team-l10"],
    queryFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return null;

      const { data: userData } = await supabase
        .from("users")
        .select("team_id")
        .eq("email", authData.user.email)
        .single();
      
      return userData;
    },
  });

  // Enable real-time VTO progress sync during L10
  useVTORealtimeSync(teamData?.team_id);

  const { data: kpis, refetch: refetchKpis } = useQuery({
    queryKey: ["kpis-l10"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpis")
        .select("*, kpi_readings(value, week_start), users(full_name)")
        .eq("active", true)
        .order("category")
        .order("week_start", { foreignTable: "kpi_readings", ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: rocks, refetch: refetchRocks } = useQuery({
    queryKey: ["rocks-l10"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rocks")
        .select("*, users(full_name)")
        .neq("status", "done")
        .order("level");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: todos, refetch: refetchTodos } = useQuery({
    queryKey: ["todos-l10"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todos")
        .select("*, users(full_name)")
        .order("due_date");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: issues, refetch: refetchIssues } = useQuery({
    queryKey: ["issues-l10"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issues")
        .select("*, users(full_name)")
        .neq("status", "solved")
        .order("priority");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: currentTeam } = useQuery({
    queryKey: ["current-team"],
    queryFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return null;

      const { data: userData } = await supabase
        .from("users")
        .select("team_id, teams(name)")
        .eq("email", authData.user.email)
        .single();
      
      return userData;
    },
  });

  const handleCloseMeeting = async () => {
    try {
      // Prepare KPI snapshot
      const kpiSnapshot = kpis?.map(kpi => ({
        kpi_id: kpi.id,
        name: kpi.name,
        target: kpi.target,
        actual: kpi.kpi_readings?.[0]?.value || null,
        on_track: kpi.kpi_readings?.[0] ? 
          (kpi.direction === ">=" ? 
            parseFloat(String(kpi.kpi_readings[0].value)) >= parseFloat(String(kpi.target)) :
            parseFloat(String(kpi.kpi_readings[0].value)) <= parseFloat(String(kpi.target))) 
          : false,
      })) || [];

      // Prepare Rock check
      const rockCheck = rocks?.map(rock => ({
        rock_id: rock.id,
        title: rock.title,
        status: rock.status,
        confidence: rock.confidence,
      })) || [];

      // Create meeting record
      const { data: meeting, error: meetingError } = await supabase
        .from("meetings")
        .insert({
          type: "L10",
          team_id: currentTeam?.team_id || null,
          scheduled_for: new Date().toISOString(),
          duration_minutes: 90,
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      // Save meeting notes
      const { error: notesError } = await supabase
        .from("meeting_notes")
        .insert({
          meeting_id: meeting.id,
          headlines,
          rock_check: rockCheck,
          kpi_snapshot: kpiSnapshot,
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
    if (!kpis || !rocks) {
      toast({
        title: "Error",
        description: "Meeting data not loaded",
        variant: "destructive",
      });
      return;
    }

    const kpiSnapshot = kpis.map(kpi => ({
      name: kpi.name,
      target: `${kpi.target} ${kpi.unit}`,
      actual: kpi.kpi_readings?.[0]?.value ? `${kpi.kpi_readings[0].value} ${kpi.unit}` : "—",
      on_track: kpi.kpi_readings?.[0] ? 
        (kpi.direction === ">=" ? 
          parseFloat(String(kpi.kpi_readings[0].value)) >= parseFloat(String(kpi.target)) :
          parseFloat(String(kpi.kpi_readings[0].value)) <= parseFloat(String(kpi.target))) 
        : false,
    }));

    const rockCheck = rocks.map(rock => ({
      title: rock.title,
      status: rock.status,
      confidence: rock.confidence || 0,
    }));

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
      teamName: currentTeam?.teams?.name || "Team",
      kpiSnapshot,
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

  return (
    <div className="space-y-6">
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

      <AgendaSuggestions teamId={currentTeam?.team_id || null} />

      <VtoL10Panel />

      <div className="space-y-4">
        <AgendaTimer sectionName="Segue (Good News)" defaultMinutes={5} />
        
        <div className="space-y-4">
          <AgendaTimer sectionName="Scorecard" defaultMinutes={5} />
          <ScorecardSnapshot kpis={kpis || []} />
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
