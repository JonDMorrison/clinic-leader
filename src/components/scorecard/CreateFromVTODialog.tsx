import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Sparkles, 
  Target, 
  TrendingUp, 
  Mountain, 
  Building2, 
  Loader2, 
  Check, 
  Link as LinkIcon,
  AlertCircle,
  FileWarning,
  ServerCrash,
  WifiOff,
  Lock
} from "lucide-react";

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

interface ExistingMetric {
  id: string;
  name: string;
  category: string;
  target: number | null;
}

interface VTOMappingItem {
  goalKey: string;
  goalTitle: string;
  goalCategory: string;
  suggestedMetricId: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
}

interface CreateFromVTODialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'intro' | 'loading' | 'review' | 'mapping' | 'creating' | 'done' | 'error';

// Error code to UI mapping
const ERROR_UI: Record<string, { title: string; body: string; icon: React.ReactNode }> = {
  NO_ACTIVE_VTO: {
    title: "No Vision Planner found",
    body: "We could not find an active Vision Planner for this clinic. Finish your Vision Planner first, then we'll help you build the Scorecard from it.",
    icon: <FileWarning className="h-10 w-10 text-amber-500" />,
  },
  VTO_QUERY_FAILED: {
    title: "Problem loading your Vision Planner",
    body: "We had a problem loading your Vision Planner. This is on us, not you. Please try again, and if it continues, contact support.",
    icon: <ServerCrash className="h-10 w-10 text-destructive" />,
  },
  AI_OR_UNKNOWN_ERROR: {
    title: "Could not generate suggestions",
    body: "We ran into a problem generating scorecard suggestions. Please try again.",
    icon: <AlertCircle className="h-10 w-10 text-destructive" />,
  },
  NETWORK_OR_UNKNOWN: {
    title: "Connection problem",
    body: "We could not reach the server. Please check your connection and try again.",
    icon: <WifiOff className="h-10 w-10 text-destructive" />,
  },
};

export const CreateFromVTODialog = ({ open, onClose, onSuccess }: CreateFromVTODialogProps) => {
  const { data: currentUser } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Explicit state machine
  const [step, setStep] = useState<Step>('intro');
  const [suggestedMetrics, setSuggestedMetrics] = useState<SuggestedMetric[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<Set<number>>(new Set());
  const [goals, setGoals] = useState<VTOGoal[]>([]);
  const [vtoVersionId, setVtoVersionId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState(0);
  
  // For aligned mode mapping
  const [mappingItems, setMappingItems] = useState<VTOMappingItem[]>([]);

  // Fetch org settings to check if aligned mode
  const { data: orgSettings } = useQuery({
    queryKey: ['org-settings', currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;
      const { data, error } = await supabase
        .from('teams')
        .select('scorecard_mode')
        .eq('id', currentUser.team_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.team_id && open,
  });

  // Fetch existing metrics for aligned mode
  const { data: existingMetrics } = useQuery({
    queryKey: ['existing-metrics-for-vto', currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      const { data, error } = await supabase
        .from('metrics')
        .select('id, name, category, target')
        .eq('organization_id', currentUser.team_id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as ExistingMetric[];
    },
    enabled: !!currentUser?.team_id && open && orgSettings?.scorecard_mode === 'aligned',
  });

  const isAlignedMode = orgSettings?.scorecard_mode === 'aligned';

  // Reset all state to initial
  const resetState = () => {
    setStep('intro');
    setSuggestedMetrics([]);
    setSelectedMetrics(new Set());
    setGoals([]);
    setVtoVersionId(null);
    setApiError(null);
    setErrorCode(null);
    setCreatedCount(0);
    setMappingItems([]);
  };

  // Handle dialog close - always reset
  const handleClose = () => {
    resetState();
    onClose();
  };

  // For aligned mode: fetch VTO goals and suggest metric mappings
  const handleMapToExisting = async () => {
    setStep('loading');
    setApiError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        'ai-generate-scorecard-from-vto',
        { body: { organization_id: currentUser?.team_id } }
      );

      if (invokeError || data?.error) {
        setErrorCode(data?.error?.code || 'NETWORK_OR_UNKNOWN');
        setApiError(data?.error?.message || 'Failed to load VTO goals');
        setStep('error');
        return;
      }

      if (!data?.data?.goals?.length) {
        setErrorCode('NO_ACTIVE_VTO');
        setApiError('No goals found in your Vision Planner');
        setStep('error');
        return;
      }

      const vtoGoals = data.data.goals as VTOGoal[];
      setGoals(vtoGoals);
      setVtoVersionId(data.data.vtoVersionId);

      // Auto-suggest mappings based on name similarity
      const mappings: VTOMappingItem[] = vtoGoals.map(goal => {
        // Try to find a matching metric by fuzzy name matching
        const goalNorm = goal.title.toLowerCase();
        let bestMatch: ExistingMetric | null = null;
        let confidence: 'high' | 'medium' | 'low' | 'none' = 'none';

        for (const metric of existingMetrics || []) {
          const metricNorm = metric.name.toLowerCase();
          if (goalNorm.includes(metricNorm) || metricNorm.includes(goalNorm)) {
            bestMatch = metric;
            confidence = goalNorm === metricNorm ? 'high' : 'medium';
            break;
          }
        }

        return {
          goalKey: goal.key,
          goalTitle: goal.title,
          goalCategory: goal.category,
          suggestedMetricId: bestMatch?.id || null,
          confidence,
        };
      });

      setMappingItems(mappings);
      setStep('mapping');
    } catch (err) {
      setErrorCode('NETWORK_OR_UNKNOWN');
      setApiError('Connection failed');
      setStep('error');
    }
  };

  // Generate suggestions from VTO (standard mode)
  const handleGenerate = async () => {
    if (isAlignedMode) {
      await handleMapToExisting();
      return;
    }

    setStep('loading');
    setApiError(null);
    setErrorCode(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        'ai-generate-scorecard-from-vto',
        { body: { organization_id: currentUser?.team_id } }
      );

      // Handle network/invoke errors
      if (invokeError) {
        console.error('Function invoke error:', invokeError);
        setErrorCode('NETWORK_OR_UNKNOWN');
        setApiError('We could not reach the server. Please check your connection and try again.');
        setStep('error');
        return;
      }

      // Handle structured error response from edge function
      if (data?.error) {
        const { code, message } = data.error;
        console.error('API error:', code, message);
        setErrorCode(code || 'AI_OR_UNKNOWN_ERROR');
        setApiError(message || 'An unexpected error occurred.');
        setStep('error');
        return;
      }

      // Handle missing data
      if (!data?.data) {
        console.error('No data in response:', data);
        setErrorCode('AI_OR_UNKNOWN_ERROR');
        setApiError('We ran into a problem generating scorecard suggestions. Please try again.');
        setStep('error');
        return;
      }

      // Success!
      const responseData = data.data;
      setSuggestedMetrics(responseData.suggestedMetrics || []);
      setGoals(responseData.goals || []);
      setVtoVersionId(responseData.vtoVersionId);
      // Select all by default
      setSelectedMetrics(new Set((responseData.suggestedMetrics || []).map((_: any, i: number) => i)));
      setStep('review');

    } catch (err: any) {
      console.error('Unexpected error:', err);
      setErrorCode('NETWORK_OR_UNKNOWN');
      setApiError('We could not reach the server. Please check your connection and try again.');
      setStep('error');
    }
  };

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
      // Force refetch by invalidating with refetchType 'all' to bypass staleTime
      queryClient.invalidateQueries({ 
        queryKey: ['scorecard-metrics'],
        refetchType: 'all'
      });
      toast({
        title: "Scorecard Created!",
        description: `Created ${count} metrics linked to your Vision Planner goals`,
      });
      // Auto-close and trigger parent refetch
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 500);
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    }
  });

  // Handle dialog open/close
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      handleClose();
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

  // Get error UI based on error code
  const getErrorUI = () => {
    const errorUI = ERROR_UI[errorCode || 'AI_OR_UNKNOWN_ERROR'] || ERROR_UI.AI_OR_UNKNOWN_ERROR;
    return errorUI;
  };

  // Save VTO mappings (aligned mode)
  const saveMappingsMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.team_id || !vtoVersionId) {
        throw new Error('Missing required data');
      }

      let saved = 0;
      for (const mapping of mappingItems) {
        if (!mapping.suggestedMetricId) continue;

        // Verify metric belongs to this org
        const { data: metric } = await supabase
          .from('metrics')
          .select('id')
          .eq('id', mapping.suggestedMetricId)
          .eq('organization_id', currentUser.team_id)
          .single();

        if (!metric) continue;

        // Upsert vto_link
        await supabase
          .from('vto_links')
          .upsert({
            vto_version_id: vtoVersionId,
            link_type: 'kpi',
            link_id: mapping.suggestedMetricId,
            goal_key: mapping.goalKey,
            weight: 1.0,
          }, { onConflict: 'vto_version_id,link_type,link_id' });

        saved++;
      }

      return saved;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['vto-links'] });
      toast({
        title: "Mappings Saved!",
        description: `Linked ${count} metrics to your Vision Planner goals`,
      });
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 500);
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    }
  });

  const updateMapping = (goalKey: string, metricId: string | null) => {
    setMappingItems(prev => prev.map(m => 
      m.goalKey === goalKey ? { ...m, suggestedMetricId: metricId, confidence: metricId ? 'high' : 'none' } : m
    ));
  };

  const mappedCount = mappingItems.filter(m => m.suggestedMetricId).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAlignedMode ? (
              <>
                <Lock className="w-5 h-5 text-primary" />
                Map V/TO to Scorecard
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-primary" />
                Create Scorecard from Vision Planner
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isAlignedMode 
              ? "Link your Vision Planner goals to existing scorecard metrics. No new metrics will be created."
              : "AI analyzes your Vision Planner goals and suggests KPIs to track on your weekly scorecard"
            }
          </DialogDescription>
        </DialogHeader>

        {/* INTRO STEP */}
        {step === 'intro' && (
          <div className="py-8 space-y-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                {isAlignedMode ? <Lock className="h-8 w-8 text-primary" /> : <Sparkles className="h-8 w-8 text-primary" />}
              </div>
              <h3 className="text-lg font-semibold">
                {isAlignedMode ? "Map V/TO to Existing Metrics" : "Let AI build your Scorecard"}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {isAlignedMode 
                  ? "We'll read your Vision Planner goals and help you link them to your aligned scorecard metrics."
                  : "We'll read your long-term and short-term goals from your Vision Planner and suggest relevant KPIs to track weekly progress toward those goals."
                }
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} className="gradient-brand">
                {isAlignedMode ? (
                  <>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Load Goals & Map
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Suggestions
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* LOADING STEP */}
        {step === 'loading' && (
          <div className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Analyzing your Vision Planner goals and drafting KPI suggestions...</p>
            <p className="text-sm text-muted-foreground mt-2">This may take up to 30 seconds</p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-4"
              onClick={handleClose}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* ERROR STEP */}
        {step === 'error' && (
          <div className="py-12 text-center space-y-4">
            <div className="flex justify-center">
              {getErrorUI().icon}
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{getErrorUI().title}</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {getErrorUI().body}
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleGenerate}>
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* REVIEW STEP */}
        {step === 'review' && (
          <div className="flex flex-col overflow-hidden flex-1 min-h-0">
            {/* Goals Summary - fixed */}
            <div className="flex-shrink-0 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Vision Planner Goals Analyzed:</p>
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

            {/* Intro text - fixed */}
            <p className="flex-shrink-0 text-sm text-muted-foreground py-3">
              Select which KPIs you want to add to your Scorecard. You can adjust them later.
            </p>

            {/* Metrics header - fixed */}
            <div className="flex-shrink-0 flex items-center justify-between mb-2">
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

            {/* ScrollArea - fixed height for reliable scrolling */}
            <ScrollArea className="h-[300px] pr-2">
              <div className="space-y-3 pb-2">
                {suggestedMetrics.map((metric, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors overflow-hidden ${
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
                        className="mt-1 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium truncate max-w-[280px]">{metric.name}</span>
                          <Badge variant="outline" className={`text-xs flex-shrink-0 ${getCategoryColor(metric.category)}`}>
                            {metric.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2 flex-wrap">
                          <span>
                            Target: {metric.target !== null ? `${metric.unit === '$' ? '$' : ''}${metric.target}${metric.unit === '%' ? '%' : ''} ${metric.unit === '#' ? '' : ''}` : 'TBD'}
                          </span>
                          <span>
                            {metric.direction === 'up' ? '↑ Higher is better' : '↓ Lower is better'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{metric.rationale}</p>
                        <div className="flex items-center gap-1 text-xs overflow-hidden">
                          <LinkIcon className="h-3 w-3 text-primary flex-shrink-0" />
                          <span className="text-primary truncate">Links to: {getGoalLabel(metric.linkedGoalKey)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Actions - fixed at bottom */}
            <div className="flex-shrink-0 flex gap-3 pt-4 border-t mt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
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

        {/* MAPPING STEP (Aligned Mode) */}
        {step === 'mapping' && (
          <div className="flex flex-col overflow-hidden flex-1 min-h-0">
            <div className="flex-shrink-0 p-3 bg-muted/50 rounded-lg mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-brand" />
                <p className="text-sm font-medium">Aligned Scorecard</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Map your Vision Planner goals to existing scorecard metrics. Alignment keeps your metrics, meetings, and Rocks on track using one consistent set of numbers.
              </p>
            </div>

            <p className="flex-shrink-0 text-sm text-muted-foreground pb-3">
              Select which metric best tracks each goal ({mappedCount} of {mappingItems.length} mapped)
            </p>

            <ScrollArea className="h-[320px] pr-2">
              <div className="space-y-3 pb-2">
                {mappingItems.map((item) => (
                  <div key={item.goalKey} className="p-3 rounded-lg border border-border">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getCategoryIcon(item.goalCategory)}
                          <span className="font-medium text-sm truncate">{item.goalTitle}</span>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.goalCategory.replace('_', ' ')}
                        </Badge>
                      </div>
                      {item.confidence !== 'none' && (
                        <Badge 
                          variant={item.confidence === 'high' ? 'default' : 'outline'}
                          className="text-xs flex-shrink-0"
                        >
                          {item.confidence === 'high' ? 'Strong match' : 'Partial match'}
                        </Badge>
                      )}
                    </div>
                    <Select
                      value={item.suggestedMetricId || 'none'}
                      onValueChange={(val) => updateMapping(item.goalKey, val === 'none' ? null : val)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a metric to link..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">No metric linked</span>
                        </SelectItem>
                        {existingMetrics?.map(metric => (
                          <SelectItem key={metric.id} value={metric.id}>
                            <div className="flex items-center gap-2">
                              <span>{metric.name}</span>
                              <Badge variant="muted" className="text-xs">{metric.category}</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex-shrink-0 flex gap-3 pt-4 border-t mt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => saveMappingsMutation.mutate()}
                disabled={mappedCount === 0 || saveMappingsMutation.isPending}
                className="flex-1 gradient-brand"
              >
                {saveMappingsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <LinkIcon className="w-4 h-4 mr-2" />
                )}
                Save {mappedCount} Mappings
              </Button>
            </div>
          </div>
        )}

        {/* CREATING STEP */}
        {step === 'creating' && (
          <div className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Creating metrics and linking to Vision Planner...</p>
            <p className="text-sm text-muted-foreground mt-2">
              {createdCount} of {selectedMetrics.size} created
            </p>
          </div>
        )}

        {/* DONE STEP */}
        {step === 'done' && (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {isAlignedMode ? "Mappings Saved!" : "Scorecard Created!"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {isAlignedMode 
                ? `${mappedCount} metrics are now linked to your Vision Planner goals`
                : `${createdCount} metrics are now tracking progress toward your Vision Planner goals`
              }
            </p>
            <Button onClick={handleClose} className="gradient-brand">
              View Scorecard
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
