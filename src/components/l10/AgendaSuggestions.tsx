import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface AgendaSuggestionsProps {
  teamId: string | null;
}

export const AgendaSuggestions = ({ teamId }: AgendaSuggestionsProps) => {
  const [dismissed, setDismissed] = useState(false);

  const { data: latestAgenda, refetch } = useQuery({
    queryKey: ["latest-agenda", teamId],
    queryFn: async () => {
      if (!teamId) return null;
      
      const { data, error } = await supabase
        .from("ai_agendas")
        .select("*")
        .eq("organization_id", teamId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!teamId && !dismissed,
  });

  const handleGenerate = async () => {
    if (!teamId) return;
    
    try {
      const { error } = await supabase.functions.invoke("ai-generate-agenda", {
        body: { team_id: teamId },
      });
      if (error) throw error;
      
      toast.success("AI agenda generated successfully");
      await refetch();
    } catch (error: any) {
      console.error("Error generating agenda:", error);
      toast.error(error.message || "Failed to generate agenda");
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    toast.info("Agenda suggestions dismissed");
  };

  if (dismissed || !latestAgenda) {
    return null;
  }

  const agenda = latestAgenda.agenda as any;

  return (
    <Card className="bg-muted/30 border-brand/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand" />
            <CardTitle className="text-lg">AI-Suggested Agenda</CardTitle>
            <Badge variant="muted" className="text-xs italic">AI-Generated</Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleDismiss}>
              <X className="w-4 h-4 mr-1" />
              Dismiss
            </Button>
            <Button size="sm" onClick={handleGenerate}>
              <Check className="w-4 h-4 mr-1" />
              Accept
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {agenda?.topics?.map((topic: any, idx: number) => (
            <div key={idx} className="p-4 rounded-lg bg-background border border-border">
              <h4 className="font-semibold text-foreground mb-2">{idx + 1}. {topic.title}</h4>
              <p className="text-sm text-muted-foreground mb-2 italic">{topic.description}</p>
              <div className="space-y-1 text-xs">
                <p className="text-foreground">
                  <span className="font-medium">Root Cause:</span> {topic.root_cause_hypothesis}
                </p>
                <p className="text-foreground">
                  <span className="font-medium">Action:</span> {topic.suggested_action}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
          Generated: {new Date(latestAgenda.created_at).toLocaleDateString()} • 
          Week of {new Date(latestAgenda.week_start).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};
