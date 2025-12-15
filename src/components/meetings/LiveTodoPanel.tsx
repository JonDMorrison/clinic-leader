import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CheckCircle2, Circle, X, ListTodo, Calendar as CalendarIcon, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface LiveTodoPanelProps {
  organizationId: string;
  meetingId: string;
  disabled?: boolean;
  onTodosChange?: () => void;
}

export const LiveTodoPanel = ({ organizationId, meetingId, disabled, onTodosChange }: LiveTodoPanelProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newOwnerId, setNewOwnerId] = useState<string>("");
  const [newDueDate, setNewDueDate] = useState<Date | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

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
        due_date: newDueDate ? format(newDueDate, "yyyy-MM-dd") : null,
        organization_id: organizationId,
        meeting_id: meetingId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-todos", meetingId] });
      setNewTitle("");
      setNewOwnerId("");
      setNewDueDate(undefined);
      onTodosChange?.();
      // Keep focus on input for rapid entry
      setTimeout(() => inputRef.current?.focus(), 0);
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
      onTodosChange?.();
    },
  });

  // Update todo mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { title?: string; owner_id?: string | null; due_date?: string | null } }) => {
      const { error } = await supabase
        .from("todos")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-todos", meetingId] });
      setEditingId(null);
      onTodosChange?.();
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
      onTodosChange?.();
    },
  });

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addMutation.mutate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newTitle.trim()) {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleSaveEdit = () => {
    if (!editingId || !editingTitle.trim()) return;
    updateMutation.mutate({ id: editingId, updates: { title: editingTitle.trim() } });
  };

  const openTodos = (todos || []).filter(t => !t.done_at);
  const doneTodos = (todos || []).filter(t => t.done_at);

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <ListTodo className="w-4 h-4" />
          To-Dos
          {openTodos.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {openTodos.length} open
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 space-y-3 max-h-80 overflow-y-auto">
        {/* Always-visible quick add - sticky on mobile */}
        {!disabled && (
          <div className="space-y-2 sticky top-0 bg-card z-10 pb-2 -mt-1 pt-1">
            <Input
              ref={inputRef}
              placeholder="Add a to-do... (Enter to add)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-9"
            />
            {newTitle.trim() && (
              <div className="flex gap-2 items-center">
                <Select value={newOwnerId} onValueChange={setNewOwnerId}>
                  <SelectTrigger className="h-8 flex-1 text-xs">
                    <SelectValue placeholder="Owner (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {(users || []).map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {newDueDate ? format(newDueDate, "MMM d") : "Due"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newDueDate}
                      onSelect={setNewDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  size="sm"
                  className="h-8"
                  onClick={handleAdd}
                  disabled={addMutation.isPending}
                >
                  Add
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Todo list */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-2">Loading...</p>
        ) : (todos || []).length === 0 && disabled ? (
          <p className="text-sm text-muted-foreground py-2">No To-Dos for this meeting.</p>
        ) : (todos || []).length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Add action items above. Press Enter for fast entry.
          </p>
        ) : (
          <div className="space-y-1">
            {openTodos.map((todo) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                users={users || []}
                disabled={disabled}
                isEditing={editingId === todo.id}
                editingTitle={editingTitle}
                onToggle={() => toggleMutation.mutate({ id: todo.id, doneAt: todo.done_at })}
                onDelete={() => deleteMutation.mutate(todo.id)}
                onStartEdit={() => {
                  setEditingId(todo.id);
                  setEditingTitle(todo.title);
                }}
                onChangeTitle={setEditingTitle}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={() => setEditingId(null)}
                onUpdateOwner={(ownerId) => updateMutation.mutate({ id: todo.id, updates: { owner_id: ownerId || null } })}
                onUpdateDueDate={(date) => updateMutation.mutate({ id: todo.id, updates: { due_date: date ? format(date, "yyyy-MM-dd") : null } })}
              />
            ))}
            
            {doneTodos.length > 0 && (
              <div className="pt-2 border-t mt-2">
                <p className="text-xs text-muted-foreground mb-1">Completed ({doneTodos.length})</p>
                {doneTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-2 p-2 rounded opacity-60"
                  >
                    <button
                      onClick={() => !disabled && toggleMutation.mutate({ id: todo.id, doneAt: todo.done_at })}
                      disabled={disabled}
                      className="flex-shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </button>
                    <p className="text-sm line-through flex-1 truncate">{todo.title}</p>
                    {(todo.users as any)?.full_name && (
                      <span className="text-xs text-muted-foreground">{(todo.users as any).full_name}</span>
                    )}
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

// Individual todo row component
interface TodoRowProps {
  todo: any;
  users: Array<{ id: string; full_name: string }>;
  disabled?: boolean;
  isEditing: boolean;
  editingTitle: string;
  onToggle: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onChangeTitle: (title: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onUpdateOwner: (ownerId: string) => void;
  onUpdateDueDate: (date: Date | null) => void;
}

function TodoRow({
  todo,
  users,
  disabled,
  isEditing,
  editingTitle,
  onToggle,
  onDelete,
  onStartEdit,
  onChangeTitle,
  onSaveEdit,
  onCancelEdit,
  onUpdateOwner,
  onUpdateDueDate,
}: TodoRowProps) {
  return (
    <div className="flex items-start gap-2 p-2 rounded hover:bg-accent/50 group">
      <button
        onClick={onToggle}
        disabled={disabled}
        className="flex-shrink-0 mt-0.5"
      >
        <Circle className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
      </button>
      <div className="flex-1 min-w-0 space-y-1">
        {isEditing ? (
          <div className="flex gap-1">
            <Input
              value={editingTitle}
              onChange={(e) => onChangeTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
              autoFocus
              className="h-7 text-sm"
            />
            <Button size="sm" className="h-7 px-2" onClick={onSaveEdit}>Save</Button>
          </div>
        ) : (
          <p
            className={cn("text-sm font-medium cursor-pointer hover:text-primary", disabled && "cursor-default")}
            onClick={() => !disabled && onStartEdit()}
          >
            {todo.title}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Owner pill */}
          {disabled ? (
            <span className="text-xs text-muted-foreground">
              {(todo.users as any)?.full_name || "Unassigned"}
            </span>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground bg-muted/50 px-2 py-0.5 rounded transition-colors">
                  <User className="w-3 h-3" />
                  {(todo.users as any)?.full_name || "Assign"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1" align="start">
                <div className="space-y-0.5">
                  <button
                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent"
                    onClick={() => onUpdateOwner("")}
                  >
                    Unassigned
                  </button>
                  {users.map((user) => (
                    <button
                      key={user.id}
                      className={cn(
                        "w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent",
                        todo.owner_id === user.id && "bg-accent"
                      )}
                      onClick={() => onUpdateOwner(user.id)}
                    >
                      {user.full_name}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          {/* Due date pill */}
          {disabled ? (
            todo.due_date && (
              <span className="text-xs text-muted-foreground">
                Due {format(new Date(todo.due_date), "MMM d")}
              </span>
            )
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground bg-muted/50 px-2 py-0.5 rounded transition-colors">
                  <CalendarIcon className="w-3 h-3" />
                  {todo.due_date ? format(new Date(todo.due_date), "MMM d") : "Due"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={todo.due_date ? new Date(todo.due_date) : undefined}
                  onSelect={(date) => onUpdateDueDate(date || null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
      {!disabled && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
          onClick={onDelete}
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}
