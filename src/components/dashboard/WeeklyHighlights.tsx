import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, AlertTriangle, Lightbulb, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

export const WeeklyHighlights = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: latestInsight, refetch } = useQuery({
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
          <div className="flex items-center gap-2">
            <CardTitle>AI Weekly Highlights</CardTitle>
            <Badge variant="muted" className="text-xs italic">AI-Generated</Badge>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
            {isGenerating ? "Generating..." : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!latestInsight ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No insights generated yet</p>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              Generate First Insights
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Wins */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-success" />
                <h3 className="font-semibold text-foreground">Wins</h3>
              </div>
              <ul className="space-y-2">
                {summary?.wins?.map((win: string, idx: number) => (
                  <li key={idx} className="text-sm text-foreground pl-7 italic">
                    • {win}
                  </li>
                ))}
              </ul>
            </div>

            {/* Warnings */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <h3 className="font-semibold text-foreground">Warnings</h3>
              </div>
              <ul className="space-y-2">
                {summary?.warnings?.map((warning: string, idx: number) => (
                  <li key={idx} className="text-sm text-foreground pl-7 italic">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>

            {/* Opportunities */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-brand" />
                <h3 className="font-semibold text-foreground">Opportunities</h3>
              </div>
              <ul className="space-y-2">
                {summary?.opportunities?.map((opp: string, idx: number) => (
                  <li key={idx} className="text-sm text-foreground pl-7 italic">
                    • {opp}
                  </li>
                ))}
              </ul>
            </div>

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
