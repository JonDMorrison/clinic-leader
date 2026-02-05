/**
 * TodoGroupingSuggestion - Banner suggesting grouping related to-dos into an intervention
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, X, ArrowRight } from "lucide-react";
import { useTodoGroupingDetection, type TodoGroupingOpportunity } from "@/hooks/useTodoGroupingDetection";
import { QuickInterventionModal, type InterventionOriginContext } from "@/components/interventions/QuickInterventionModal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TodoGroupingSuggestionProps {
  meetingId: string;
  organizationId: string;
}

export function TodoGroupingSuggestion({ 
  meetingId, 
  organizationId 
}: TodoGroupingSuggestionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [selectedOpportunity, setSelectedOpportunity] = useState<TodoGroupingOpportunity | null>(null);

  const { groupingOpportunities } = useTodoGroupingDetection({
    meetingId,
    organizationId,
  });

  // Link to-dos to newly created intervention
  const linkTodosMutation = useMutation({
    mutationFn: async ({ interventionId, todoIds }: { interventionId: string; todoIds: string[] }) => {
      const { error } = await supabase
        .from("todos")
        .update({ intervention_id: interventionId })
        .in("id", todoIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-todos"] });
      queryClient.invalidateQueries({ queryKey: ["meeting-todos-grouping"] });
      toast({
        title: "Linked",
        description: "To-dos linked to the new intervention",
      });
    },
  });

  // Filter out dismissed opportunities
  const activeOpportunities = groupingOpportunities.filter(
    (opp) => !dismissed.has(opp.metricId)
  );

  if (activeOpportunities.length === 0) {
    return null;
  }

  const handleDismiss = (metricId: string) => {
    setDismissed((prev) => new Set([...prev, metricId]));
  };

  const handleCreateIntervention = (opportunity: TodoGroupingOpportunity) => {
    setSelectedOpportunity(opportunity);
  };

  const handleInterventionCreated = (interventionId: string) => {
    if (selectedOpportunity) {
      // Link the to-dos to the new intervention
      linkTodosMutation.mutate({
        interventionId,
        todoIds: selectedOpportunity.todoIds,
      });
      setSelectedOpportunity(null);
    }
  };

  return (
    <>
      {activeOpportunities.map((opportunity) => (
        <Card 
          key={opportunity.metricId}
          className="border-primary/30 bg-primary/5"
        >
          <CardContent className="py-3 px-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Group related to-dos into an intervention?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <Badge variant="secondary" className="mr-2">
                      {opportunity.todoCount} to-dos
                    </Badge>
                    related to <span className="font-medium">{opportunity.metricName}</span>
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {opportunity.todoTitles.slice(0, 3).map((title, idx) => (
                      <Badge key={idx} variant="outline" className="text-[10px] max-w-[200px] truncate">
                        {title}
                      </Badge>
                    ))}
                    {opportunity.todoTitles.length > 3 && (
                      <Badge variant="outline" className="text-[10px]">
                        +{opportunity.todoTitles.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDismiss(opportunity.metricId)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleCreateIntervention(opportunity)}
                >
                  Create Intervention
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {selectedOpportunity && (
        <QuickInterventionModal
          open={true}
          onClose={() => setSelectedOpportunity(null)}
          organizationId={organizationId}
          originContext={{
            originType: "todo",
            preSelectedMetricId: selectedOpportunity.metricId,
            suggestedTitle: `Improve ${selectedOpportunity.metricName}`,
            suggestedDescription: `Grouped from ${selectedOpportunity.todoCount} related to-dos: ${selectedOpportunity.todoTitles.join(", ")}`,
          }}
          onSuccess={handleInterventionCreated}
        />
      )}
    </>
  );
}
