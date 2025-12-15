import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Circle, Plus, X, ListTodo } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface LiveTodoPanelProps {
  organizationId: string;
  meetingId: string;
  disabled?: boolean;
}

export const LiveTodoPanel = ({ organizationId, meetingId, disabled }: LiveTodoPanelProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [newOwnerId, setNewOwnerId] = useState<string>("");
  const [showForm, setShowForm] = useState(false);

  // Fetch todos for this meeting
  const { data: todos, isLoading } = useQuery({
    queryKey: ["meeting-todos", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todos")
        .select("*, users:owner_id(id, full_name)")
        .eq("meeting_id", meetingId)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!meetingId && !!organizationId,
  });

  // Fetch org users for owner dropdown
  const { data: users } = useQuery({
    queryKey: ["org-users", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("team_id", organizationId)
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Add todo mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("todos").insert({
        title: newTitle.trim(),
        owner_id: newOwnerId || null,
        organization_id: organizationId,
        meeting_id: meetingId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-todos", meetingId] });
      setNewTitle("");
      setNewOwnerId("");
      setShowForm(false);
      toast({ title: "To-Do added" });
    },
    onError: () => {
      toast({ title: "Failed to add To-Do", variant: "destructive" });
    },
  });

  // Toggle done mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, doneAt }: { id: string; doneAt: string | null }) => {
      const { error } = await supabase
        .from("todos")
        .update({ done_at: doneAt ? null : new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-todos", meetingId] });
    },
  });

  // Delete todo mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-todos", meetingId] });
      toast({ title: "To-Do removed" });
    },
  });

  const openTodos = (todos || []).filter(t => !t.done_at);
  const doneTodos = (todos || []).filter(t => t.done_at);

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ListTodo className="w-4 h-4" />
            To-Dos
            {openTodos.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {openTodos.length} open
              </span>
            )}
          </span>
          {!disabled && !showForm && (
            <Button size="sm" variant="ghost" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 space-y-3">
        {/* Add form */}
        {showForm && !disabled && (
          <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
            <Input
              placeholder="What needs to be done?"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTitle.trim()) {
                  addMutation.mutate();
                }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <Select value={newOwnerId} onValueChange={setNewOwnerId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Assign owner (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {(users || []).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => addMutation.mutate()}
                disabled={!newTitle.trim() || addMutation.isPending}
              >
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Todo list */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-2">Loading...</p>
        ) : (todos || []).length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No To-Dos yet. Add action items during the meeting.
          </p>
        ) : (
          <div className="space-y-1">
            {openTodos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-center justify-between p-2 rounded hover:bg-accent/50 group"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    onClick={() => toggleMutation.mutate({ id: todo.id, doneAt: todo.done_at })}
                    disabled={disabled}
                    className="flex-shrink-0"
                  >
                    <Circle className="w-4 h-4 text-muted-foreground hover:text-primary" />
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{todo.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {(todo.users as any)?.full_name || "Unassigned"}
                    </p>
                  </div>
                </div>
                {!disabled && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => deleteMutation.mutate(todo.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
            
            {doneTodos.length > 0 && (
              <div className="pt-2 border-t mt-2">
                <p className="text-xs text-muted-foreground mb-1">Completed</p>
                {doneTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-2 p-2 rounded opacity-60"
                  >
                    <button
                      onClick={() => toggleMutation.mutate({ id: todo.id, doneAt: todo.done_at })}
                      disabled={disabled}
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </button>
                    <p className="text-sm line-through">{todo.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
