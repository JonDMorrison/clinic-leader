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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, AlertTriangle, Plus, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SuggestionItem {
  id?: string;
  name: string;
  newName?: string;
  newTarget?: number;
  reason: string;
  category?: string;
}

interface AlignmentSuggestions {
  keep: SuggestionItem[];
  improve: SuggestionItem[];
  add: SuggestionItem[];
}

type Step = "intro" | "loading" | "review" | "applying" | "done" | "error";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function ScorecardAlignmentDialog({ open, onOpenChange, onComplete }: Props) {
  const { data: currentUser } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("intro");
  const [suggestions, setSuggestions] = useState<AlignmentSuggestions | null>(null);
  const [selectedImprove, setSelectedImprove] = useState<Set<string>>(new Set());
  const [selectedAdd, setSelectedAdd] = useState<Set<number>>(new Set());
  const [editedImprove, setEditedImprove] = useState<Record<string, SuggestionItem>>({});
  const [error, setError] = useState<string | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("ai-review-scorecard-against-vto", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { organization_id: currentUser?.team_id },
      });

      if (response.error) throw new Error(response.error.message || "Failed to analyze alignment");
      return response.data;
    },
    onSuccess: (data) => {
      setSuggestions(data);
      // Pre-select all improvements and additions
      setSelectedImprove(new Set(data.improve?.map((i: SuggestionItem) => i.id) || []));
      setSelectedAdd(new Set(data.add?.map((_: SuggestionItem, idx: number) => idx) || []));
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

      // Apply improvements (update existing metrics)
      for (const item of suggestions.improve) {
        if (selectedImprove.has(item.id!)) {
          const edited = editedImprove[item.id!] || item;
          await supabase
            .from("metrics")
            .update({
              name: edited.newName || item.name,
              target: edited.newTarget || null,
            })
            .eq("id", item.id!)
            .eq("organization_id", currentUser.team_id);
        }
      }

      // Apply additions (create new metrics)
      const metricsToAdd = suggestions.add
        .filter((_, idx) => selectedAdd.has(idx))
        .map((item) => ({
          organization_id: currentUser.team_id,
          name: item.name,
          category: item.category || "Strategic",
          unit: "number",
          direction: "up",
          sync_source: "manual",
        }));

      if (metricsToAdd.length > 0) {
        const { error } = await supabase
          .from("metrics")
          .insert(metricsToAdd);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scorecard-metrics"] });
      setStep("done");
      toast({
        title: "Scorecard Updated",
        description: "Your scorecard has been aligned with your V/TO.",
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
    setError(null);
    onOpenChange(false);
    if (step === "done") {
      onComplete();
    }
  };

  const toggleImprove = (id: string) => {
    const newSet = new Set(selectedImprove);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedImprove(newSet);
  };

  const toggleAdd = (idx: number) => {
    const newSet = new Set(selectedAdd);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setSelectedAdd(newSet);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Scorecard Alignment Review
          </DialogTitle>
          <DialogDescription>
            AI analyzes your V/TO and suggests scorecard improvements
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === "intro" && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Your Vision/Traction Organizer has been updated. Let's ensure your
                Scorecard KPIs are aligned with your strategic goals.
              </p>
              <p className="text-sm text-muted-foreground">
                The AI will analyze your V/TO and current scorecard, then suggest:
              </p>
              <ul className="text-sm space-y-2 ml-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  KPIs to keep (already aligned)
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  KPIs to improve (need adjustments)
                </li>
                <li className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-500" />
                  KPIs to add (missing from strategy)
                </li>
              </ul>
            </div>
          )}

          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing your V/TO and Scorecard...</p>
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
                      KPIs to Keep ({suggestions.keep.length})
                    </h3>
                    <div className="space-y-2">
                      {suggestions.keep.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <span className="font-medium text-sm">{item.name}</span>
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
                      KPIs to Improve ({suggestions.improve.length})
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
                                <span className="font-medium text-sm">{item.name}</span>
                                {item.newName && (
                                  <>
                                    <span className="text-muted-foreground">→</span>
                                    <Input
                                      value={editedImprove[item.id!]?.newName || item.newName}
                                      onChange={(e) => setEditedImprove({
                                        ...editedImprove,
                                        [item.id!]: { ...item, newName: e.target.value }
                                      })}
                                      className="h-7 w-48"
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
                      KPIs to Add ({suggestions.add.length})
                    </h3>
                    <div className="space-y-2">
                      {suggestions.add.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <Checkbox
                            checked={selectedAdd.has(idx)}
                            onCheckedChange={() => toggleAdd(idx)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{item.name}</span>
                              {item.category && (
                                <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{item.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {suggestions.keep?.length === 0 && suggestions.improve?.length === 0 && suggestions.add?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Your scorecard is already well-aligned with your V/TO!
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
              <p className="text-sm font-medium">Scorecard aligned successfully!</p>
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
