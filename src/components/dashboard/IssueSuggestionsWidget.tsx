import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Lightbulb, Check, X, ChevronRight, AlertTriangle, TrendingDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface IssueSuggestion {
  id: string;
  metric_id: string;
  title: string;
  context: string;
  ai_analysis: {
    weeksOffTrack?: number;
    latestValue?: number;
    target?: number;
    gap?: string;
    trend?: string;
    rootCause?: string;
    recommendedAction?: string;
  };
  priority: number;
  weeks_off_track: number;
  status: string;
  created_at: string;
  metrics?: {
    name: string;
    unit: string;
    category: string;
  };
}

export function IssueSuggestionsWidget() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["issue-suggestions", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];

      const { data, error } = await supabase
        .from("issue_suggestions")
        .select(`
          id, metric_id, title, context, ai_analysis, priority, weeks_off_track, status, created_at,
          metrics(name, unit, category)
        `)
        .eq("organization_id", currentUser.team_id)
        .eq("status", "pending")
        .order("priority", { ascending: false })
        .order("weeks_off_track", { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data || []) as IssueSuggestion[];
    },
    enabled: !!currentUser?.team_id,
  });

  const acceptMutation = useMutation({
    mutationFn: async (suggestion: IssueSuggestion) => {
      // Create the issue
      const { data: issue, error: issueError } = await supabase
        .from("issues")
        .insert({
          organization_id: currentUser!.team_id!,
          title: suggestion.title,
          context: suggestion.context + (suggestion.ai_analysis?.recommendedAction 
            ? `\n\nRecommended action: ${suggestion.ai_analysis.recommendedAction}` 
            : ""),
          metric_id: suggestion.metric_id,
          priority: suggestion.priority,
          status: "open",
          created_from: "suggestion",
        })
        .select("id")
        .single();

      if (issueError) throw issueError;

      // Update suggestion status
      const { error: updateError } = await supabase
        .from("issue_suggestions")
        .update({
          status: "accepted",
          created_issue_id: issue.id,
        })
        .eq("id", suggestion.id);

      if (updateError) throw updateError;

      return issue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      toast.success("Issue created from suggestion");
    },
    onError: (error) => {
      console.error("Error accepting suggestion:", error);
      toast.error("Failed to create issue");
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      const { error } = await supabase
        .from("issue_suggestions")
        .update({
          status: "dismissed",
          dismissed_by: currentUser?.id,
        })
        .eq("id", suggestionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue-suggestions"] });
      toast.success("Suggestion dismissed");
    },
    onError: (error) => {
      console.error("Error dismissing suggestion:", error);
      toast.error("Failed to dismiss suggestion");
    },
  });

  if (isLoading) {
    return null; // Don't show loading state for this widget
  }

  if (!suggestions || suggestions.length === 0) {
    return null; // Don't render if no suggestions
  }

  const getPriorityColor = (priority: number) => {
    if (priority >= 5) return "text-destructive bg-destructive/10";
    if (priority >= 4) return "text-warning bg-warning/10";
    return "text-muted-foreground bg-muted";
  };

  return (
    <Card className="border-warning/30 bg-gradient-to-br from-warning/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-warning" />
            <span>Suggested Issues</span>
            <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
              {suggestions.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/issues")}
          >
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          AI-detected metrics that need attention
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <AnimatePresence mode="popLayout">
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors cursor-pointer",
                expandedId === suggestion.id && "ring-1 ring-warning/30"
              )}
              onClick={() => setExpandedId(expandedId === suggestion.id ? null : suggestion.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={getPriorityColor(suggestion.priority)}>
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      P{suggestion.priority}
                    </Badge>
                    <Badge variant="outline" className="text-warning border-warning/30">
                      {suggestion.weeks_off_track}w off-track
                    </Badge>
                  </div>
                  <p className="font-medium text-sm truncate">
                    {suggestion.metrics?.name || suggestion.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {suggestion.context}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-success hover:text-success hover:bg-success/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      acceptMutation.mutate(suggestion);
                    }}
                    disabled={acceptMutation.isPending}
                  >
                    {acceptMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissMutation.mutate(suggestion.id);
                    }}
                    disabled={dismissMutation.isPending}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Expanded content */}
              <AnimatePresence>
                {expandedId === suggestion.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 pt-3 border-t space-y-2">
                      {suggestion.ai_analysis?.rootCause && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Root Cause</p>
                          <p className="text-sm">{suggestion.ai_analysis.rootCause}</p>
                        </div>
                      )}
                      {suggestion.ai_analysis?.recommendedAction && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Recommended Action</p>
                          <p className="text-sm">{suggestion.ai_analysis.recommendedAction}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {suggestion.ai_analysis?.latestValue !== undefined && (
                          <span>
                            Current: <strong>{suggestion.ai_analysis.latestValue}</strong>
                          </span>
                        )}
                        {suggestion.ai_analysis?.target !== undefined && (
                          <span>
                            Target: <strong>{suggestion.ai_analysis.target}</strong>
                          </span>
                        )}
                        {suggestion.ai_analysis?.trend && (
                          <span className="flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" />
                            {suggestion.ai_analysis.trend}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
