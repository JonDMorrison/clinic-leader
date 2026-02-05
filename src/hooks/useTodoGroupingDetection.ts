/**
 * Todo Grouping Detection Hook
 * 
 * Detects when multiple to-dos created in the same meeting context
 * relate to the same metric - suggesting they should be grouped as an intervention
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TodoGroupingOpportunity {
  metricId: string;
  metricName: string;
  todoCount: number;
  todoIds: string[];
  todoTitles: string[];
}

interface UseTodoGroupingDetectionOptions {
  meetingId: string | undefined;
  organizationId: string | undefined;
  enabled?: boolean;
}

/**
 * Detect when multiple to-dos in a meeting could be grouped into an intervention
 * 
 * Logic:
 * 1. Get all to-dos for the meeting
 * 2. Identify to-dos NOT linked to an intervention
 * 3. Check if they're linked to issues that relate to the same metric
 * 4. Suggest grouping if 2+ to-dos relate to the same metric
 */
export function useTodoGroupingDetection({
  meetingId,
  organizationId,
  enabled = true,
}: UseTodoGroupingDetectionOptions) {
  // Fetch meeting to-dos with their issue links
  const { data: todos = [] } = useQuery({
    queryKey: ["meeting-todos-grouping", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todos")
        .select(`
          id,
          title,
          intervention_id,
          issue_id,
          issues:issue_id(
            id,
            metric_id,
            metrics:metric_id(id, name)
          )
        `)
        .eq("meeting_id", meetingId!)
        .is("intervention_id", null) // Only unlinked to-dos
        .is("done_at", null); // Only open to-dos

      if (error) throw error;
      return data || [];
    },
    enabled: enabled && !!meetingId,
  });

  // Detect grouping opportunities
  const groupingOpportunities = useMemo<TodoGroupingOpportunity[]>(() => {
    // Group by metric
    const metricMap = new Map<string, { name: string; todos: { id: string; title: string }[] }>();

    for (const todo of todos) {
      const issue = todo.issues as any;
      if (!issue?.metric_id) continue;
      
      const metricId = issue.metric_id;
      const metricName = (issue.metrics as any)?.name || "Unknown Metric";

      if (!metricMap.has(metricId)) {
        metricMap.set(metricId, { name: metricName, todos: [] });
      }
      metricMap.get(metricId)!.todos.push({ id: todo.id, title: todo.title });
    }

    // Filter to groups with 2+ to-dos
    const opportunities: TodoGroupingOpportunity[] = [];
    
    for (const [metricId, { name, todos: groupTodos }] of metricMap) {
      if (groupTodos.length >= 2) {
        opportunities.push({
          metricId,
          metricName: name,
          todoCount: groupTodos.length,
          todoIds: groupTodos.map((t) => t.id),
          todoTitles: groupTodos.map((t) => t.title),
        });
      }
    }

    return opportunities;
  }, [todos]);

  return {
    groupingOpportunities,
    hasOpportunities: groupingOpportunities.length > 0,
  };
}
