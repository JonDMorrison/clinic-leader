import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Edit2, MessageSquare, ListTodo, Target, TrendingUp, User } from "lucide-react";
import { HelpHint } from "@/components/help/HelpHint";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ConvertToTodoModal } from "@/components/issues/ConvertToTodoModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface IDSSectionProps {
  issues: any[];
  onUpdate?: () => void;
}

// Get source type from issue
const getSourceType = (issue: any): 'scorecard' | 'rock' | 'manual' => {
  if (issue.metric_id) return 'scorecard';
  if (issue.rock_id) return 'rock';
  return 'manual';
};

// Sort issues by source priority: Scorecard > Rock > Manual, then by priority
const sortIssuesBySource = (issues: any[]) => {
  const sourceOrder = { scorecard: 0, rock: 1, manual: 2 };
  return [...issues].sort((a, b) => {
    const sourceA = getSourceType(a);
    const sourceB = getSourceType(b);
    if (sourceOrder[sourceA] !== sourceOrder[sourceB]) {
      return sourceOrder[sourceA] - sourceOrder[sourceB];
    }
    return (a.priority || 999) - (b.priority || 999);
  });
};

export const IDSSection = ({ issues, onUpdate }: IDSSectionProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [discussNotes, setDiscussNotes] = useState<Record<string, string>>({});
  const [todoModalOpen, setTodoModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [solveDialogOpen, setSolveDialogOpen] = useState(false);
  const [issueToSolve, setIssueToSolve] = useState<any>(null);
  const [solveDecision, setSolveDecision] = useState("");
  const { toast } = useToast();

  const getPriorityBadge = (priority: number) => {
    if (priority === 1) return { variant: "danger", label: "Critical" };
    if (priority === 2) return { variant: "warning", label: "High" };
    return { variant: "muted", label: "Medium" };
  };

  const getSourceBadge = (issue: any) => {
    const source = getSourceType(issue);
    switch (source) {
      case 'scorecard':
        return { icon: TrendingUp, label: "Scorecard", variant: "outline" as const };
      case 'rock':
        return { icon: Target, label: "Rock", variant: "outline" as const };
      default:
        return { icon: User, label: "Manual", variant: "outline" as const };
    }
  };

  const openIssues = sortIssuesBySource(issues.filter(i => i.status !== "solved"));

  // Handle inline title editing (Identify phase)
  const handleSaveTitle = async (issueId: string) => {
    if (!editTitle.trim()) return;
    try {
      await supabase
        .from("issues")
        .update({ title: editTitle.trim() })
        .eq("id", issueId);
      setEditingId(null);
      onUpdate?.();
      toast({ title: "Issue title updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Handle discussion notes (Discuss phase)
  const handleSaveNotes = async (issueId: string) => {
    const notes = discussNotes[issueId];
    if (!notes?.trim()) return;
    try {
      await supabase
        .from("issues")
        .update({ context: notes.trim() })
        .eq("id", issueId);
      toast({ title: "Notes saved" });
      onUpdate?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Attempt to mark solved - requires decision or todo
  const handleAttemptSolve = (issue: any) => {
    const hasTodos = issue.todos && issue.todos.length > 0;
    if (hasTodos) {
      // Has todos, can solve directly
      handleMarkSolved(issue.id, "Resolved via to-do creation");
    } else {
      // No todos, require decision
      setIssueToSolve(issue);
      setSolveDecision("");
      setSolveDialogOpen(true);
    }
  };

  const handleMarkSolved = async (issueId: string, decision: string) => {
    try {
      await supabase
        .from("issues")
        .update({
          status: "solved",
          solved_at: new Date().toISOString(),
          context: decision ? `[Decision] ${decision}` : undefined,
        })
        .eq("id", issueId);
      setSolveDialogOpen(false);
      setIssueToSolve(null);
      onUpdate?.();
      toast({ title: "Issue solved" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCreateTodo = (issue: any) => {
    setSelectedIssue(issue);
    setTodoModalOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            IDS - Identify, Discuss, Solve (60 min)
            <HelpHint term="IDS" context="l10_ids_section" size="sm" />
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Work through the issue list in priority order. Scorecard issues first, then Rock issues, then others.
          </p>
        </CardHeader>
        <CardContent>
          {openIssues.length > 0 ? (
            <div className="space-y-3">
              {openIssues.map((issue, index) => {
                const priorityBadge = getPriorityBadge(issue.priority);
                const sourceBadge = getSourceBadge(issue);
                const SourceIcon = sourceBadge.icon;
                const isEditing = editingId === issue.id;
                const hasTodos = issue.todos && issue.todos.length > 0;
                
                return (
                  <div
                    key={issue.id}
                    className="p-4 rounded-lg border border-border hover:bg-muted/50 space-y-3"
                  >
                    {/* Header Row */}
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand text-brand-foreground flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            {isEditing ? (
                              <div className="flex gap-2">
                                <Input
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="h-8"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveTitle(issue.id);
                                    if (e.key === 'Escape') setEditingId(null);
                                  }}
                                />
                                <Button size="sm" onClick={() => handleSaveTitle(issue.id)}>Save</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                              </div>
                            ) : (
                              <p className="font-medium flex items-center gap-2">
                                {issue.title}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => {
                                    setEditingId(issue.id);
                                    setEditTitle(issue.title);
                                  }}
                                  title="Edit title (Identify)"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground mt-1">
                              Owner: {issue.users?.full_name || "Unassigned"}
                              {issue.created_at && (
                                <span className="ml-2">
                                  • Created {new Date(issue.created_at).toLocaleDateString()}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex gap-1.5 flex-wrap">
                            <Badge variant={sourceBadge.variant} className="text-xs">
                              <SourceIcon className="w-3 h-3 mr-1" />
                              {sourceBadge.label}
                            </Badge>
                            <Badge variant={priorityBadge.variant as "danger" | "warning" | "muted"}>
                              {priorityBadge.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Discussion Notes */}
                    <div className="ml-9 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MessageSquare className="w-4 h-4" />
                        <span>Discussion Notes</span>
                      </div>
                      <Textarea
                        placeholder="Capture key points from discussion..."
                        value={discussNotes[issue.id] ?? issue.context ?? ""}
                        onChange={(e) => setDiscussNotes({ ...discussNotes, [issue.id]: e.target.value })}
                        className="min-h-[60px] text-sm"
                        onBlur={() => handleSaveNotes(issue.id)}
                      />
                    </div>

                    {/* Actions */}
                    <div className="ml-9 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateTodo(issue)}
                      >
                        <ListTodo className="w-4 h-4 mr-1" />
                        Add To-Do
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAttemptSolve(issue)}
                      >
                        Mark Solved
                      </Button>
                      {hasTodos && (
                        <span className="text-xs text-muted-foreground">
                          {issue.todos.length} to-do{issue.todos.length !== 1 ? "s" : ""} created
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No open issues to discuss. Great job team!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* To-Do Modal */}
      {selectedIssue && (
        <ConvertToTodoModal
          open={todoModalOpen}
          onClose={() => {
            setTodoModalOpen(false);
            setSelectedIssue(null);
          }}
          issue={selectedIssue}
          onSuccess={() => {
            setTodoModalOpen(false);
            setSelectedIssue(null);
            onUpdate?.();
          }}
        />
      )}

      {/* Solve Enforcement Dialog */}
      <AlertDialog open={solveDialogOpen} onOpenChange={setSolveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Record Decision to Solve</AlertDialogTitle>
            <AlertDialogDescription>
              EOS requires either a to-do or a decision before closing an issue. 
              What was decided?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="e.g., 'We will not pursue this initiative' or 'Accepted current state as is'"
            value={solveDecision}
            onChange={(e) => setSolveDecision(e.target.value)}
            className="min-h-[80px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setSolveDialogOpen(false);
              setIssueToSolve(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                setSolveDialogOpen(false);
                handleCreateTodo(issueToSolve);
              }}
            >
              Create To-Do Instead
            </Button>
            <AlertDialogAction
              disabled={!solveDecision.trim()}
              onClick={() => handleMarkSolved(issueToSolve?.id, solveDecision)}
            >
              Record Decision & Solve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
