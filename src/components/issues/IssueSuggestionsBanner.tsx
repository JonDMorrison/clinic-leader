import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Lightbulb, Check, X, ChevronDown, ChevronUp, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
  metrics?: {
    name: string;
    unit: string;
    category: string;
  };
}

interface IssueSuggestionsBannerProps {
  organizationId: string | null | undefined;
  onIssueCreated?: () => void;
}

export function IssueSuggestionsBanner({ organizationId, onIssueCreated }: IssueSuggestionsBannerProps) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["issue-suggestions", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from("issue_suggestions")
        .select(`
          id, metric_id, title, context, ai_analysis, priority, weeks_off_track, status,
          metrics(name, unit, category)
        `)
        .eq("organization_id", organizationId)
        .eq("status", "pending")
        .order("priority", { ascending: false })
        .order("weeks_off_track", { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []) as IssueSuggestion[];
    },
    enabled: !!organizationId,
  });

  const acceptMutation = useMutation({
    mutationFn: async (suggestion: IssueSuggestion) => {
      setProcessingIds((prev) => new Set(prev).add(suggestion.id));
      
      // Create the issue
      const { data: issue, error: issueError } = await supabase
        .from("issues")
        .insert({
          organization_id: organizationId!,
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
      onIssueCreated?.();
    },
    onError: (error) => {
      console.error("Error accepting suggestion:", error);
      toast.error("Failed to create issue");
    },
    onSettled: (_, __, suggestion) => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(suggestion.id);
        return next;
      });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      setProcessingIds((prev) => new Set(prev).add(suggestionId));
      
      const { error } = await supabase
        .from("issue_suggestions")
        .update({ status: "dismissed" })
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
    onSettled: (_, __, suggestionId) => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(suggestionId);
        return next;
      });
    },
  });

  const acceptAllMutation = useMutation({
    mutationFn: async () => {
      if (!suggestions) return;
      
      for (const suggestion of suggestions) {
        await acceptMutation.mutateAsync(suggestion);
      }
    },
    onSuccess: () => {
      toast.success(`Created ${suggestions?.length} issues from suggestions`);
    },
  });

  if (isLoading || !suggestions || suggestions.length === 0) {
    return null;
  }

  const displaySuggestions = isExpanded ? suggestions : suggestions.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-4 rounded-lg border border-warning/30 bg-gradient-to-r from-warning/5 via-warning/10 to-warning/5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-warning" />
          <h3 className="font-semibold">AI-Suggested Issues</h3>
          <Badge variant="secondary" className="bg-warning/20 text-warning">
            {suggestions.length} pending
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {suggestions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => acceptAllMutation.mutate()}
              disabled={acceptAllMutation.isPending}
              className="text-success border-success/30 hover:bg-success/10"
            >
              {acceptAllMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-1" />
              )}
              Accept All
            </Button>
          )}
          {suggestions.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Show All ({suggestions.length})
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {displaySuggestions.map((suggestion) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className={cn(
                "flex items-center justify-between gap-4 p-3 rounded-md bg-background/50 border",
                processingIds.has(suggestion.id) && "opacity-50"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn(
                    suggestion.priority >= 5 ? "text-destructive border-destructive/30" :
                    suggestion.priority >= 4 ? "text-warning border-warning/30" :
                    "text-muted-foreground"
                  )}>
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    P{suggestion.priority}
                  </Badge>
                  <Badge variant="outline" className="text-warning border-warning/30">
                    {suggestion.weeks_off_track}w
                  </Badge>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {suggestion.metrics?.name || suggestion.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {suggestion.ai_analysis?.recommendedAction || suggestion.context}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-success hover:text-success hover:bg-success/10"
                  onClick={() => acceptMutation.mutate(suggestion)}
                  disabled={processingIds.has(suggestion.id)}
                >
                  {processingIds.has(suggestion.id) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Create Issue
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => dismissMutation.mutate(suggestion.id)}
                  disabled={processingIds.has(suggestion.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
