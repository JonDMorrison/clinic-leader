import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, AlertTriangle, Clock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays, parseISO } from "date-fns";

interface TodoReviewModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
}

const getMissedWeeks = (todo: any): number => {
  if (!todo.due_date || todo.done_at) return 0;
  const dueDate = parseISO(todo.due_date);
  const daysPastDue = differenceInDays(new Date(), dueDate);
  if (daysPastDue <= 0) return 0;
  return Math.ceil(daysPastDue / 7);
};

export function TodoReviewModal({ open, onClose, organizationId }: TodoReviewModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: todos, isLoading } = useQuery({
    queryKey: ["todo-review-modal", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todos")
        .select("*, users(full_name)")
        .eq("organization_id", organizationId)
        .order("due_date");
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!organizationId,
  });

  const handleToggle = async (todoId: string, currentDoneAt: string | null) => {
    const { error } = await supabase
      .from("todos")
      .update({ done_at: currentDoneAt ? null : new Date().toISOString() })
      .eq("id", todoId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["todo-review-modal", organizationId] });
    queryClient.invalidateQueries({ queryKey: ["todos-l10"] });
    queryClient.invalidateQueries({ queryKey: ["meeting-todos"] });
  };

  const incomplete = (todos || [])
    .filter(t => !t.done_at)
    .sort((a, b) => {
      const am = getMissedWeeks(a), bm = getMissedWeeks(b);
      if (am !== bm) return bm - am;
      return (a.due_date || "").localeCompare(b.due_date || "");
    });
  const completed = (todos || []).filter(t => t.done_at);
  const repeatMiss = incomplete.filter(t => getMissedWeeks(t) >= 2);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>To-Do Review</DialogTitle>
          <DialogDescription>
            {incomplete.length} open · {completed.length} completed
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading…</div>
        ) : (todos || []).length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No to-dos found.</div>
        ) : (
          <div className="space-y-4">
            {repeatMiss.length > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {repeatMiss.length} to-do{repeatMiss.length !== 1 ? "s" : ""} missed 2+ weeks
                </span>
              </div>
            )}

            {incomplete.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-sm font-medium mb-2">Open</h4>
                {incomplete.map(todo => {
                  const missed = getMissedWeeks(todo);
                  return (
                    <div key={todo.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${missed >= 2 ? "border-warning bg-warning/5" : missed > 0 ? "border-destructive/50 bg-destructive/5" : "border-border"}`}>
                      <Button size="sm" variant="ghost" className="p-1 h-6 w-6" onClick={() => handleToggle(todo.id, todo.done_at)}>
                        <Circle className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate flex items-center gap-2">
                          {todo.title}
                          {missed >= 2 && <Badge variant="warning" className="text-[10px]">{missed}w overdue</Badge>}
                          {missed > 0 && missed < 2 && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {todo.users?.full_name || "Unassigned"}
                          {todo.due_date && ` · Due ${new Date(todo.due_date).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {completed.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-sm font-medium mb-2 text-success">Completed</h4>
                {completed.map(todo => (
                  <div key={todo.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/30">
                    <Button size="sm" variant="ghost" className="p-1 h-6 w-6" onClick={() => handleToggle(todo.id, todo.done_at)}>
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    </Button>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate line-through opacity-60">{todo.title}</p>
                      <p className="text-xs text-muted-foreground">{todo.users?.full_name || "Unassigned"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
