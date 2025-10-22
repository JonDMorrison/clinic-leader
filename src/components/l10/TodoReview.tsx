import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TodoReviewProps {
  todos: any[];
  onUpdate: () => void;
}

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

  const incompleteTodos = todos.filter(t => !t.done_at);
  const completedTodos = todos.filter(t => t.done_at);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Todo Review (5 min)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Review last week's todos - what got done?
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {incompleteTodos.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Incomplete</h4>
              <div className="space-y-2">
                {incompleteTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
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
                        <p className="font-medium">{todo.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {todo.users?.full_name || "Unassigned"}
                          {todo.due_date && ` • Due ${new Date(todo.due_date).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
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
