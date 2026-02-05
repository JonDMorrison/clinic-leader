/**
 * OrphanTodoWarning - Leadership insight showing to-dos not linked to issues/interventions
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LinkIcon, Zap, User, Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useState } from "react";
import { InterventionSelector } from "@/components/interventions/InterventionSelector";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface OrphanTodoWarningProps {
  organizationId: string;
  isLeadership?: boolean;
}

export function OrphanTodoWarning({ 
  organizationId, 
  isLeadership = true 
}: OrphanTodoWarningProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedTodoId, setExpandedTodoId] = useState<string | null>(null);

  // Fetch orphan todos (not linked to issue or intervention)
  const { data: orphanTodos = [], isLoading } = useQuery({
    queryKey: ["orphan-todos", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todos")
        .select(`
          id, 
          title, 
          owner_id,
          due_date,
          created_at,
          users:owner_id(id, full_name)
        `)
        .eq("organization_id", organizationId)
        .is("issue_id", null)
        .is("intervention_id", null)
        .is("done_at", null)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId && isLeadership,
  });

  // Mutation to link todo to intervention
  const linkMutation = useMutation({
    mutationFn: async ({ todoId, interventionId }: { todoId: string; interventionId: string }) => {
      const { error } = await supabase
        .from("todos")
        .update({ intervention_id: interventionId })
        .eq("id", todoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orphan-todos", organizationId] });
      setExpandedTodoId(null);
      toast({
        title: "Linked",
        description: "To-do linked to intervention",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to link to-do",
        variant: "destructive",
      });
    },
  });

  if (!isLeadership || isLoading || orphanTodos.length === 0) {
    return null;
  }

  return (
    <Card className="border-yellow-300 bg-yellow-50/50 dark:border-yellow-700 dark:bg-yellow-900/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          Orphan To-Dos
          <Badge variant="secondary" className="ml-auto">
            {orphanTodos.length}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          These to-dos are not linked to any issue or intervention
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {orphanTodos.map((todo) => {
          const isOverdue = todo.due_date && differenceInDays(new Date(), new Date(todo.due_date)) > 0;
          const isExpanded = expandedTodoId === todo.id;

          return (
            <div 
              key={todo.id}
              className="bg-background rounded-lg border p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{todo.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {(todo.users as any)?.full_name && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {(todo.users as any).full_name}
                      </span>
                    )}
                    {todo.due_date && (
                      <span className={`flex items-center gap-1 ${isOverdue ? 'text-destructive' : ''}`}>
                        <Calendar className="h-3 w-3" />
                        {format(new Date(todo.due_date), "MMM d")}
                        {isOverdue && " (overdue)"}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() => setExpandedTodoId(isExpanded ? null : todo.id)}
                >
                  <LinkIcon className="h-3 w-3 mr-1" />
                  Link
                </Button>
              </div>

              {isExpanded && (
                <div className="pt-2 border-t">
                  <InterventionSelector
                    organizationId={organizationId}
                    value={null}
                    onChange={(interventionId) => {
                      if (interventionId) {
                        linkMutation.mutate({ todoId: todo.id, interventionId });
                      }
                    }}
                    disabled={linkMutation.isPending}
                  />
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
