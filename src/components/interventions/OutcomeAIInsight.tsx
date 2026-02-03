/**
 * OutcomeAIInsight - Displays AI-generated advisory insight for an intervention outcome
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw, AlertCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OutcomeAIInsightProps {
  outcomeId: string;
  existingSummary: string | null;
  metricName: string;
  isAdmin: boolean;
}

export function OutcomeAIInsight({
  outcomeId,
  existingSummary,
  metricName,
  isAdmin,
}: OutcomeAIInsightProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [summary, setSummary] = useState<string | null>(existingSummary);

  const generateInsightMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "ai-intervention-insight",
        {
          body: { outcome_id: outcomeId },
        }
      );

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.ai_summary as string;
    },
    onSuccess: (newSummary) => {
      setSummary(newSummary);
      queryClient.invalidateQueries({ queryKey: ["intervention-outcomes"] });
      toast({
        title: "AI insight generated",
        description: "Advisory summary has been created for this outcome.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate insight",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // If no summary exists and not generating, show generate button (admin only)
  if (!summary && !generateInsightMutation.isPending) {
    if (!isAdmin) return null;

    return (
      <div className="mt-3 pt-3 border-t border-border/50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => generateInsightMutation.mutate()}
          className="text-xs"
        >
          <Sparkles className="h-3 w-3 mr-1.5" />
          Generate AI Insight
        </Button>
      </div>
    );
  }

  // Loading state
  if (generateInsightMutation.isPending) {
    return (
      <div className="mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-brand animate-pulse" />
          <span className="text-xs text-muted-foreground">Generating insight...</span>
        </div>
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  // Display the AI summary
  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          <Badge variant="outline" className="text-xs font-normal">
            AI Insight (Advisory)
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                <p>
                  This insight is AI-generated based on the intervention data.
                  It is advisory only and should not replace clinical judgment
                  or evidence-based decision making.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => generateInsightMutation.mutate()}
            disabled={generateInsightMutation.isPending}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground italic leading-relaxed">
        {summary}
      </p>
    </div>
  );
}
