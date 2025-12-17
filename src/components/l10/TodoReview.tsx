import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, AlertTriangle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { HelpHint } from "@/components/help/HelpHint";
import { differenceInDays, parseISO } from "date-fns";

interface TodoReviewProps {
  todos: any[];
  onUpdate: () => void;
}

// Calculate consecutive weeks a todo has been missed
const getMissedWeeks = (todo: any): number => {
  if (!todo.due_date || todo.done_at) return 0;
  const dueDate = parseISO(todo.due_date);
  const today = new Date();
  const daysPastDue = differenceInDays(today, dueDate);
  if (daysPastDue <= 0) return 0;
  return Math.ceil(daysPastDue / 7);
};

export const TodoReview = ({ todos, onUpdate }: TodoReviewProps) => {
  const { toast } = useToast();

  const handleToggleTodo = async (todoId: string, currentDoneAt: string | null) => {
    try {
      const { error } = await supabase
        .from("todos")
        .update({
          done_at: currentDoneAt ? null : new Date().toISOString(),
        })
        .eq("id", todoId);

      if (error) throw error;
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Separate and sort todos
  const incompleteTodos = todos
    .filter(t => !t.done_at)
    .sort((a, b) => {
      // Sort by overdue status first, then by due date
      const aMissed = getMissedWeeks(a);
      const bMissed = getMissedWeeks(b);
      if (aMissed !== bMissed) return bMissed - aMissed;
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      return 0;
    });
  const completedTodos = todos.filter(t => t.done_at);

  // Count repeat misses
  const repeatMissTodos = incompleteTodos.filter(t => getMissedWeeks(t) >= 2);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          Todo Review (5 min)
          <HelpHint term="To-Do" context="l10_todo_review" size="sm" />
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Review last week's todos - what got done? Overdue items are highlighted.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Repeated miss warning */}
          {repeatMissTodos.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm font-medium">
                {repeatMissTodos.length} to-do{repeatMissTodos.length !== 1 ? "s" : ""} missed 2+ weeks in a row
              </span>
            </div>
          )}

          {incompleteTodos.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Incomplete</h4>
              <div className="space-y-2">
                {incompleteTodos.map((todo) => {
                  const missedWeeks = getMissedWeeks(todo);
                  const isOverdue = missedWeeks > 0;
                  const isRepeatMiss = missedWeeks >= 2;
                  
                  return (
                    <div
                      key={todo.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isRepeatMiss 
                          ? "border-warning bg-warning/5" 
                          : isOverdue 
                          ? "border-destructive/50 bg-destructive/5" 
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleTodo(todo.id, todo.done_at)}
                        >
                          <Circle className="w-5 h-5 text-muted-foreground" />
                        </Button>
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            {todo.title}
                            {isRepeatMiss && (
                              <Badge variant="warning" className="text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {missedWeeks}w overdue
                              </Badge>
                            )}
                            {isOverdue && !isRepeatMiss && (
                              <Badge variant="destructive" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Overdue
                              </Badge>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {todo.users?.full_name || <span className="text-warning">No owner</span>}
                            {todo.due_date ? (
                              ` • Due ${new Date(todo.due_date).toLocaleDateString()}`
                            ) : (
                              <span className="text-warning"> • No due date</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {completedTodos.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 text-success">Completed</h4>
              <div className="space-y-2">
                {completedTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleTodo(todo.id, todo.done_at)}
                      >
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      </Button>
                      <div>
                        <p className="font-medium line-through opacity-60">{todo.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {todo.users?.full_name || "Unassigned"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {todos.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No todos to review.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
