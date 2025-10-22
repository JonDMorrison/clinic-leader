import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { InsightCard } from "@/components/ai/InsightCard";
import { Skeleton } from "@/components/ui/skeleton";

export const WeeklyHighlights = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: latestInsight, isLoading, refetch } = useQuery({
    queryKey: ["latest-insight"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_insights")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  const { data: insightLog } = useQuery({
    queryKey: ["latest-insight-log", latestInsight?.id],
    queryFn: async () => {
      if (!latestInsight?.id) return null;
      
      const { data, error } = await supabase
        .from("ai_logs")
        .select("id")
        .eq("type", "insight")
        .contains("payload", { insight_id: latestInsight.id })
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!latestInsight?.id,
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("ai-generate-insights");
      if (error) throw error;
      
      toast.success("AI insights generated successfully");
      await refetch();
    } catch (error: any) {
      console.error("Error generating insights:", error);
      toast.error(error.message || "Failed to generate insights");
    } finally {
      setIsGenerating(false);
    }
  };

  const summary = latestInsight?.summary as any;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>AI Weekly Highlights</CardTitle>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || isLoading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
            {isGenerating ? "Analyzing..." : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !latestInsight ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No insights generated yet</p>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              Generate First Insights
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {summary?.wins?.map((win: string, idx: number) => (
              <InsightCard
                key={`win-${idx}`}
                type="win"
                content={win}
                logId={insightLog?.id}
              />
            ))}
            {summary?.warnings?.map((warning: string, idx: number) => (
              <InsightCard
                key={`warning-${idx}`}
                type="warning"
                content={warning}
                logId={insightLog?.id}
              />
            ))}
            {summary?.opportunities?.map((opp: string, idx: number) => (
              <InsightCard
                key={`opp-${idx}`}
                type="opportunity"
                content={opp}
                logId={insightLog?.id}
              />
            ))}

            <div className="text-xs text-muted-foreground pt-4 border-t border-border">
              Generated: {new Date(latestInsight.created_at).toLocaleDateString()} • 
              Week of {new Date(latestInsight.week_start).toLocaleDateString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
