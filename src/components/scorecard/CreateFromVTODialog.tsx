import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Target, TrendingUp, Mountain, Building2, Loader2, Check, Link as LinkIcon } from "lucide-react";

interface SuggestedMetric {
  name: string;
  category: string;
  unit: string;
  target: number | null;
  direction: 'up' | 'down';
  linkedGoalKey: string;
  rationale: string;
}

interface VTOGoal {
  key: string;
  title: string;
  category: 'ten_year' | 'three_year' | 'one_year' | 'rock';
}

interface CreateFromVTODialogProps {
  open: boolean;
  onClose: () => void;
}

export const CreateFromVTODialog = ({ open, onClose }: CreateFromVTODialogProps) => {
  const { data: currentUser } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState<'loading' | 'review' | 'creating' | 'done'>('loading');
  const [suggestedMetrics, setSuggestedMetrics] = useState<SuggestedMetric[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<Set<number>>(new Set());
  const [goals, setGoals] = useState<VTOGoal[]>([]);
  const [vtoVersionId, setVtoVersionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState(0);

  // Fetch AI suggestions when dialog opens with timeout
  const fetchSuggestionsMutation = useMutation({
    mutationFn: async () => {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out. Please try again.')), 60000);
      });

      const fetchPromise = supabase.functions.invoke('ai-generate-scorecard-from-vto', {
        body: { organization_id: currentUser?.team_id }
      });

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      setSuggestedMetrics(data.suggestedMetrics || []);
      setGoals(data.goals || []);
      setVtoVersionId(data.vtoVersionId);
      // Select all by default
      setSelectedMetrics(new Set((data.suggestedMetrics || []).map((_: any, i: number) => i)));
      setStep('review');
    },
    onError: (err: any) => {
      console.error('AI suggestion error:', err);
      setError(err.message || 'Failed to analyze V/TO. Please try again.');
      setStep('review');
    }
  });

  // Create selected metrics
  const createMetricsMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.team_id || !vtoVersionId) {
        throw new Error('Missing required data');
      }

      const metricsToCreate = suggestedMetrics.filter((_, i) => selectedMetrics.has(i));
      let created = 0;

      for (const metric of metricsToCreate) {
        // Create the metric
        const { data: newMetric, error: metricError } = await supabase
          .from('metrics')
          .insert({
            organization_id: currentUser.team_id,
            name: metric.name,
            category: metric.category,
            unit: metric.unit,
            target: metric.target,
            direction: metric.direction,
            sync_source: 'manual',
          })
          .select()
          .single();

        if (metricError) {
          console.error('Error creating metric:', metricError);
          continue;
        }

        // Create VTO link
        if (newMetric && metric.linkedGoalKey) {
          await supabase
            .from('vto_links')
            .insert({
              vto_version_id: vtoVersionId,
              link_type: 'kpi',
              link_id: newMetric.id,
              goal_key: metric.linkedGoalKey,
              weight: 1.0,
            });
        }

        created++;
        setCreatedCount(created);
      }

      return created;
    },
    onSuccess: (count) => {
      setStep('done');
      queryClient.invalidateQueries({ queryKey: ['scorecard-metrics'] });
      toast({
        title: "Scorecard Created!",
        description: `Created ${count} metrics linked to your V/TO goals`,
      });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    }
  });

  // Start loading when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && step === 'loading') {
      fetchSuggestionsMutation.mutate();
    }
    if (!isOpen) {
      onClose();
      // Reset state after close
      setTimeout(() => {
        setStep('loading');
        setSuggestedMetrics([]);
        setSelectedMetrics(new Set());
        setGoals([]);
        setError(null);
        setCreatedCount(0);
      }, 300);
    }
  };

  const toggleMetric = (index: number) => {
    const newSelected = new Set(selectedMetrics);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedMetrics(newSelected);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ten_year': return <TrendingUp className="h-4 w-4" />;
      case 'three_year': return <Building2 className="h-4 w-4" />;
      case 'one_year': return <Target className="h-4 w-4" />;
      case 'rock': return <Mountain className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Revenue': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'Patients': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Clinical': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'Marketing': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Operations': return 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getGoalLabel = (goalKey: string) => {
    const goal = goals.find(g => g.key === goalKey);
    if (!goal) return goalKey;
    return goal.title.length > 40 ? goal.title.substring(0, 40) + '...' : goal.title;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Create Scorecard from V/TO
          </DialogTitle>
          <DialogDescription>
            AI analyzes your V/TO goals and suggests KPIs to track on your weekly scorecard
          </DialogDescription>
        </DialogHeader>

        {step === 'loading' && (
          <div className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Analyzing your V/TO goals...</p>
            <p className="text-sm text-muted-foreground mt-2">This may take up to 30 seconds</p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-4"
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        )}

        {step === 'review' && error && (
          <div className="py-12 text-center">
            <div className="text-destructive mb-4">{error}</div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={() => {
                setError(null);
                setStep('loading');
                fetchSuggestionsMutation.mutate();
              }}>
                Try Again
              </Button>
            </div>
          </div>
        )}

        {step === 'review' && !error && (
          <div className="space-y-4">
            {/* Goals Summary */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">V/TO Goals Analyzed:</p>
              <div className="flex flex-wrap gap-1">
                {goals.slice(0, 5).map((goal, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {getCategoryIcon(goal.category)}
                    <span className="ml-1 truncate max-w-32">{goal.title}</span>
                  </Badge>
                ))}
                {goals.length > 5 && (
                  <Badge variant="outline" className="text-xs">+{goals.length - 5} more</Badge>
                )}
              </div>
            </div>

            {/* Suggested Metrics */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Suggested Metrics ({suggestedMetrics.length})</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selectedMetrics.size === suggestedMetrics.length) {
                      setSelectedMetrics(new Set());
                    } else {
                      setSelectedMetrics(new Set(suggestedMetrics.map((_, i) => i)));
                    }
                  }}
                >
                  {selectedMetrics.size === suggestedMetrics.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-3">
                  {suggestedMetrics.map((metric, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedMetrics.has(index)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                      onClick={() => toggleMetric(index)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedMetrics.has(index)}
                          onCheckedChange={() => toggleMetric(index)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{metric.name}</span>
                            <Badge variant="outline" className={`text-xs ${getCategoryColor(metric.category)}`}>
                              {metric.category}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                            <span>
                              Target: {metric.target !== null ? `${metric.unit === '$' ? '$' : ''}${metric.target}${metric.unit === '%' ? '%' : ''} ${metric.unit === '#' ? '' : ''}` : 'TBD'}
                            </span>
                            <span>
                              {metric.direction === 'up' ? '↑ Higher is better' : '↓ Lower is better'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{metric.rationale}</p>
                          <div className="flex items-center gap-1 text-xs">
                            <LinkIcon className="h-3 w-3 text-primary" />
                            <span className="text-primary">Links to: {getGoalLabel(metric.linkedGoalKey)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setStep('creating');
                  createMetricsMutation.mutate();
                }}
                disabled={selectedMetrics.size === 0}
                className="flex-1 gradient-brand"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Create {selectedMetrics.size} Metrics
              </Button>
            </div>
          </div>
        )}

        {step === 'creating' && (
          <div className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Creating metrics and linking to V/TO...</p>
            <p className="text-sm text-muted-foreground mt-2">
              {createdCount} of {selectedMetrics.size} created
            </p>
          </div>
        )}

        {step === 'done' && (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Scorecard Created!</h3>
            <p className="text-muted-foreground mb-6">
              {createdCount} metrics are now tracking progress toward your V/TO goals
            </p>
            <Button onClick={onClose} className="gradient-brand">
              View Scorecard
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
