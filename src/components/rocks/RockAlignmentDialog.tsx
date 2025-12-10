import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, AlertTriangle, Plus, Sparkles, Mountain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfQuarter, addQuarters } from "date-fns";

interface RockSuggestion {
  id?: string;
  title: string;
  newTitle?: string;
  description?: string;
  newDescription?: string;
  owner_id?: string;
  reason: string;
  linked_metric_ids?: string[];
}

interface AlignmentSuggestions {
  keep: RockSuggestion[];
  improve: RockSuggestion[];
  add: RockSuggestion[];
}

type Step = "intro" | "loading" | "review" | "applying" | "done" | "error";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function RockAlignmentDialog({ open, onOpenChange, onComplete }: Props) {
  const { data: currentUser } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("intro");
  const [suggestions, setSuggestions] = useState<AlignmentSuggestions | null>(null);
  const [selectedImprove, setSelectedImprove] = useState<Set<string>>(new Set());
  const [selectedAdd, setSelectedAdd] = useState<Set<number>>(new Set());
  const [editedImprove, setEditedImprove] = useState<Record<string, RockSuggestion>>({});
  const [editedAdd, setEditedAdd] = useState<Record<number, RockSuggestion>>({});
  const [error, setError] = useState<string | null>(null);

  const currentQuarter = `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`;

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("ai-review-rocks-against-vto-scorecard", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { organization_id: currentUser?.team_id },
      });

      if (response.error) throw new Error(response.error.message || "Failed to analyze alignment");
      return response.data;
    },
    onSuccess: (data) => {
      setSuggestions(data);
      setSelectedImprove(new Set(data.improve?.map((i: RockSuggestion) => i.id) || []));
      setSelectedAdd(new Set(data.add?.map((_: RockSuggestion, idx: number) => idx) || []));
      setStep("review");
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setStep("error");
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.team_id || !suggestions) return;

      // Apply improvements (update existing rocks)
      for (const item of suggestions.improve) {
        if (selectedImprove.has(item.id!)) {
          const edited = editedImprove[item.id!] || item;
          await supabase
            .from("rocks")
            .update({
              title: edited.newTitle || edited.title,
              note: edited.newDescription || edited.description,
            })
            .eq("id", item.id!)
            .eq("organization_id", currentUser.team_id);
        }
      }

      // Apply additions (create new rocks)
      const rocksToAdd = suggestions.add
        .filter((_, idx) => selectedAdd.has(idx))
        .map((item, idx) => {
          const edited = editedAdd[idx] || item;
          return {
            organization_id: currentUser.team_id,
            title: edited.title,
            note: edited.description,
            owner_id: edited.owner_id || currentUser.id,
            quarter: currentQuarter,
            level: "company" as const,
            status: "on_track" as const,
          };
        });

      if (rocksToAdd.length > 0) {
        const { data: newRocks, error } = await supabase
          .from("rocks")
          .insert(rocksToAdd)
          .select();
        
        if (error) throw error;

        // Link metrics to new rocks
        if (newRocks) {
          const links: { rock_id: string; metric_id: string; organization_id: string }[] = [];
          suggestions.add.forEach((item, idx) => {
            if (selectedAdd.has(idx) && item.linked_metric_ids?.length) {
              const newRock = newRocks[rocksToAdd.findIndex((r) => r.title === (editedAdd[idx]?.title || item.title))];
              if (newRock) {
                item.linked_metric_ids.forEach((metricId) => {
                  links.push({
                    rock_id: newRock.id,
                    metric_id: metricId,
                    organization_id: currentUser.team_id,
                  });
                });
              }
            }
          });

          if (links.length > 0) {
            await supabase.from("rock_metric_links").insert(links);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rocks"] });
      setStep("done");
      toast({
        title: "Rocks Updated",
        description: "Your quarterly priorities have been aligned with your strategy.",
      });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to apply changes");
      setStep("error");
    },
  });

  const handleStartAnalysis = () => {
    setStep("loading");
    analyzeMutation.mutate();
  };

  const handleApply = () => {
    setStep("applying");
    applyMutation.mutate();
  };

  const handleClose = () => {
    setStep("intro");
    setSuggestions(null);
    setSelectedImprove(new Set());
    setSelectedAdd(new Set());
    setEditedImprove({});
    setEditedAdd({});
    setError(null);
    onOpenChange(false);
    if (step === "done") {
      onComplete();
    }
  };

  const toggleImprove = (id: string) => {
    const newSet = new Set(selectedImprove);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedImprove(newSet);
  };

  const toggleAdd = (idx: number) => {
    const newSet = new Set(selectedAdd);
    if (newSet.has(idx)) newSet.delete(idx);
    else newSet.add(idx);
    setSelectedAdd(newSet);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mountain className="w-5 h-5 text-primary" />
            Rock Alignment Review
          </DialogTitle>
          <DialogDescription>
            AI analyzes your V/TO and Scorecard to suggest quarterly priorities
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === "intro" && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Your V/TO or Scorecard has been updated. Let's ensure your Quarterly
                Rocks (priorities) are aligned with your strategic goals.
              </p>
              <p className="text-sm text-muted-foreground">
                The AI will analyze your strategy and current rocks, then suggest:
              </p>
              <ul className="text-sm space-y-2 ml-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Rocks to keep (already aligned)
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  Rocks to improve (need adjustments)
                </li>
                <li className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-500" />
                  Rocks to add (based on off-track KPIs)
                </li>
              </ul>
            </div>
          )}

          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing V/TO, Scorecard, and Rocks...</p>
            </div>
          )}

          {step === "review" && suggestions && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {/* Keep Section */}
                {suggestions.keep?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Rocks to Keep ({suggestions.keep.length})
                    </h3>
                    <div className="space-y-2">
                      {suggestions.keep.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <span className="font-medium text-sm">{item.title}</span>
                          <span className="text-xs text-muted-foreground">{item.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Improve Section */}
                {suggestions.improve?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      Rocks to Improve ({suggestions.improve.length})
                    </h3>
                    <div className="space-y-3">
                      {suggestions.improve.map((item) => (
                        <div key={item.id} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg space-y-2">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedImprove.has(item.id!)}
                              onCheckedChange={() => toggleImprove(item.id!)}
                            />
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{item.title}</span>
                                {item.newTitle && (
                                  <>
                                    <span className="text-muted-foreground">→</span>
                                    <Input
                                      value={editedImprove[item.id!]?.newTitle || item.newTitle}
                                      onChange={(e) => setEditedImprove({
                                        ...editedImprove,
                                        [item.id!]: { ...item, newTitle: e.target.value }
                                      })}
                                      className="h-7 flex-1"
                                    />
                                  </>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{item.reason}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Section */}
                {suggestions.add?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                      <Plus className="w-4 h-4 text-blue-500" />
                      Suggested New Rocks ({suggestions.add.length})
                    </h3>
                    <div className="space-y-3">
                      {suggestions.add.map((item, idx) => (
                        <div key={idx} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-2">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedAdd.has(idx)}
                              onCheckedChange={() => toggleAdd(idx)}
                            />
                            <div className="flex-1 space-y-2">
                              <Input
                                value={editedAdd[idx]?.title || item.title}
                                onChange={(e) => setEditedAdd({
                                  ...editedAdd,
                                  [idx]: { ...item, ...editedAdd[idx], title: e.target.value }
                                })}
                                className="h-8"
                                placeholder="Rock title"
                              />
                              <Textarea
                                value={editedAdd[idx]?.description || item.description || ""}
                                onChange={(e) => setEditedAdd({
                                  ...editedAdd,
                                  [idx]: { ...item, ...editedAdd[idx], description: e.target.value }
                                })}
                                className="text-sm"
                                placeholder="Description (optional)"
                                rows={2}
                              />
                              <p className="text-xs text-muted-foreground">{item.reason}</p>
                              {item.linked_metric_ids?.length && (
                                <Badge variant="secondary" className="text-xs">
                                  Links to {item.linked_metric_ids.length} KPI(s)
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {suggestions.keep?.length === 0 && suggestions.improve?.length === 0 && suggestions.add?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Your rocks are already well-aligned with your strategy!
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {step === "applying" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Applying changes...</p>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <p className="text-sm font-medium">Rocks aligned successfully!</p>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <AlertTriangle className="w-12 h-12 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "intro" && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleStartAnalysis}>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Alignment
              </Button>
            </>
          )}
          {step === "review" && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleApply} disabled={selectedImprove.size === 0 && selectedAdd.size === 0}>
                Apply Updates ({selectedImprove.size + selectedAdd.size})
              </Button>
            </>
          )}
          {(step === "done" || step === "error") && (
            <Button onClick={handleClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
