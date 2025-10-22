import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, ListTodo, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ConvertToTodoModal } from "./ConvertToTodoModal";

interface IssueCardProps {
  issue: any;
  onUpdate: () => void;
  dragHandleProps?: any;
}

export const IssueCard = ({ issue, onUpdate, dragHandleProps }: IssueCardProps) => {
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const { toast } = useToast();

  const getPriorityBadge = (priority: number) => {
    if (priority === 1) return { variant: "danger", label: "Critical" };
    if (priority === 2) return { variant: "warning", label: "High" };
    if (priority === 3) return { variant: "muted", label: "Medium" };
    return { variant: "muted", label: "Low" };
  };

  const getStatusBadge = (status: string) => {
    if (status === "solved") return { variant: "success", label: "Solved" };
    if (status === "in_progress") return { variant: "brand", label: "In Progress" };
    if (status === "parked") return { variant: "muted", label: "Parked" };
    return { variant: "warning", label: "Open" };
  };

  const handleMarkSolved = async () => {
    try {
      const { error } = await supabase
        .from("issues")
        .update({
          status: "solved",
          solved_at: new Date().toISOString(),
        })
        .eq("id", issue.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Issue marked as solved",
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReopenIssue = async () => {
    try {
      const { error } = await supabase
        .from("issues")
        .update({
          status: "open",
          solved_at: null,
        })
        .eq("id", issue.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Issue reopened",
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const priorityBadge = getPriorityBadge(issue.priority);
  const statusBadge = getStatusBadge(issue.status);

  return (
    <>
      <Card className={`transition-all ${issue.status === "solved" ? "opacity-60" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {dragHandleProps && issue.status !== "solved" && (
              <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing mt-1">
                <GripVertical className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground mb-1">{issue.title}</h4>
                  {issue.context && (
                    <p className="text-sm text-muted-foreground">{issue.context}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Badge variant={priorityBadge.variant as "danger" | "warning" | "muted"}>
                    {priorityBadge.label}
                  </Badge>
                  <Badge variant={statusBadge.variant as "success" | "brand" | "warning" | "muted"}>
                    {statusBadge.label}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>Owner: {issue.users?.full_name || "Unassigned"}</span>
                  {issue.todos && issue.todos.length > 0 && (
                    <span className="flex items-center gap-1">
                      <ListTodo className="w-4 h-4" />
                      {issue.todos.length} todo{issue.todos.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {issue.solved_at && (
                    <span className="text-success">
                      Solved {new Date(issue.solved_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {issue.status !== "solved" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConvertModalOpen(true)}
                      >
                        <ListTodo className="w-4 h-4 mr-1" />
                        Add Todo
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleMarkSolved}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Mark Solved
                      </Button>
                    </>
                  )}
                  {issue.status === "solved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleReopenIssue}
                    >
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Reopen
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConvertToTodoModal
        open={convertModalOpen}
        onClose={() => setConvertModalOpen(false)}
        issue={issue}
        onSuccess={onUpdate}
      />
    </>
  );
};
