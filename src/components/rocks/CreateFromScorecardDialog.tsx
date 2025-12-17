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
import { 
  Sparkles, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Mountain, 
  Loader2, 
  Check, 
  Link as LinkIcon,
  AlertCircle,
  FileWarning,
  ServerCrash,
  WifiOff,
  BarChart3,
  User
} from "lucide-react";

interface SuggestedRock {
  title: string;
  description: string;
  owner_id: string | null;
  owner_name: string | null;
  linked_metric_ids: string[];
  quarter: string;
  rationale: string;
  status: 'not_started';
  priority: 'high' | 'medium' | 'low';
}

interface MetricSummary {
  id: string;
  name: string;
  category: string;
  status: 'on_track' | 'at_risk' | 'off_track';
  trend: 'improving' | 'stable' | 'declining';
}

interface CreateFromScorecardDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'intro' | 'loading' | 'review' | 'creating' | 'done' | 'error';

const ERROR_UI: Record<string, { title: string; body: string; icon: React.ReactNode }> = {
  NO_METRICS: {
    title: "No scorecard found",
    body: "We could not find any metrics in your scorecard. Please set up your scorecard first, then we'll help you create Rocks from it.",
    icon: <FileWarning className="h-10 w-10 text-amber-500" />,
  },
  NO_DATA: {
    title: "No metric data yet",
    body: "Your scorecard metrics don't have any data imported yet. Please import your monthly report first, then we can analyze performance and suggest Rocks.",
    icon: <BarChart3 className="h-10 w-10 text-amber-500" />,
  },
  METRICS_QUERY_FAILED: {
    title: "Problem loading your scorecard",
    body: "We had a problem loading your scorecard. This is on us, not you. Please try again, and if it continues, contact support.",
    icon: <ServerCrash className="h-10 w-10 text-destructive" />,
  },
  AI_OR_UNKNOWN_ERROR: {
    title: "Could not generate suggestions",
    body: "We ran into a problem generating rock suggestions. Please try again.",
    icon: <AlertCircle className="h-10 w-10 text-destructive" />,
  },
  NETWORK_OR_UNKNOWN: {
    title: "Connection problem",
    body: "We could not reach the server. Please check your connection and try again.",
    icon: <WifiOff className="h-10 w-10 text-destructive" />,
  },
};

export const CreateFromScorecardDialog = ({ open, onClose, onSuccess }: CreateFromScorecardDialogProps) => {
  const { data: currentUser } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState<Step>('intro');
  const [suggestedRocks, setSuggestedRocks] = useState<SuggestedRock[]>([]);
  const [selectedRocks, setSelectedRocks] = useState<Set<number>>(new Set());
  const [metrics, setMetrics] = useState<MetricSummary[]>([]);
  const [quarter, setQuarter] = useState<string>('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState(0);

  const resetState = () => {
    setStep('intro');
    setSuggestedRocks([]);
    setSelectedRocks(new Set());
    setMetrics([]);
    setQuarter('');
    setApiError(null);
    setErrorCode(null);
    setCreatedCount(0);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleGenerate = async () => {
    setStep('loading');
    setApiError(null);
    setErrorCode(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        'ai-generate-rocks-from-scorecard',
        { body: { organization_id: currentUser?.team_id } }
      );

      // Handle invoke errors - but check if it's a structured business error first
      if (invokeError) {
        console.error('Function invoke error:', invokeError);
        
        // Try to parse structured error from context (400 responses)
        try {
          const errorBody = typeof invokeError.context === 'object' 
            ? invokeError.context 
            : JSON.parse(invokeError.message || '{}');
          
          if (errorBody?.error?.code) {
            setErrorCode(errorBody.error.code);
            setApiError(errorBody.error.message || 'An error occurred.');
            setStep('error');
            return;
          }
        } catch {
          // Not a structured error, fall through to generic handling
        }
        
        setErrorCode('NETWORK_OR_UNKNOWN');
        setApiError('We could not reach the server. Please check your connection and try again.');
        setStep('error');
        return;
      }

      if (data?.error) {
        const { code, message } = data.error;
        console.error('API error:', code, message);
        setErrorCode(code || 'AI_OR_UNKNOWN_ERROR');
        setApiError(message || 'An unexpected error occurred.');
        setStep('error');
        return;
      }

      if (!data?.data) {
        console.error('No data in response:', data);
        setErrorCode('AI_OR_UNKNOWN_ERROR');
        setApiError('We ran into a problem generating rock suggestions. Please try again.');
        setStep('error');
        return;
      }

      const responseData = data.data;
      setSuggestedRocks(responseData.suggestedRocks || []);
      setMetrics(responseData.metrics || []);
      setQuarter(responseData.quarter || '');
      setSelectedRocks(new Set((responseData.suggestedRocks || []).map((_: any, i: number) => i)));
      setStep('review');

    } catch (err: any) {
      console.error('Unexpected error:', err);
      setErrorCode('NETWORK_OR_UNKNOWN');
      setApiError('We could not reach the server. Please check your connection and try again.');
      setStep('error');
    }
  };

  const createRocksMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.team_id) {
        throw new Error('Missing required data');
      }

      const rocksToCreate = suggestedRocks.filter((_, i) => selectedRocks.has(i));
      let created = 0;

      for (const rock of rocksToCreate) {
        // Create the rock
        const { data: newRock, error: rockError } = await supabase
          .from('rocks')
          .insert({
            organization_id: currentUser.team_id,
            title: rock.title,
            note: rock.description,
            owner_id: rock.owner_id,
            quarter: rock.quarter,
            status: 'on_track',
            level: 'company',
          })
          .select()
          .single();

        if (rockError) {
          console.error('Error creating rock:', rockError);
          continue;
        }

        // Create rock-metric links
        if (newRock && rock.linked_metric_ids?.length > 0) {
          for (const metricId of rock.linked_metric_ids) {
            await supabase
              .from('rock_metric_links')
              .insert({
                rock_id: newRock.id,
                metric_id: metricId,
                organization_id: currentUser.team_id,
              });
          }
        }

        created++;
        setCreatedCount(created);
      }

      return created;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ 
        queryKey: ['rocks'],
        refetchType: 'all'
      });
      toast({
        title: "Rocks Created!",
        description: `Created ${count} rocks linked to your scorecard metrics`,
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

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      handleClose();
    }
  };

  const toggleRock = (index: number) => {
    const newSelected = new Set(selectedRocks);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRocks(newSelected);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'off_track': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'at_risk': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'on_track': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'declining': return <TrendingDown className="h-3 w-3 text-destructive" />;
      default: return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive';
      case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getMetricName = (metricId: string) => {
    const metric = metrics.find(m => m.id === metricId);
    return metric?.name || metricId;
  };

  const getErrorUI = () => {
    return ERROR_UI[errorCode || 'AI_OR_UNKNOWN_ERROR'] || ERROR_UI.AI_OR_UNKNOWN_ERROR;
  };

  // Count metrics by status for summary
  const metricStats = {
    off_track: metrics.filter(m => m.status === 'off_track').length,
    at_risk: metrics.filter(m => m.status === 'at_risk').length,
    declining: metrics.filter(m => m.trend === 'declining').length,
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Create Rocks from Scorecard
          </DialogTitle>
          <DialogDescription>
            AI analyzes your scorecard metrics and suggests 90-day priorities to improve performance
          </DialogDescription>
        </DialogHeader>

        {/* INTRO STEP */}
        {step === 'intro' && (
          <div className="py-8 space-y-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mountain className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Let AI build your Quarterly Rocks</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                We'll analyze your scorecard metrics, identify off-track KPIs and declining trends, 
                then suggest actionable 90-day priorities (Rocks) to improve your clinic's performance.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} className="gradient-brand">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Suggestions
              </Button>
            </div>
          </div>
        )}

        {/* LOADING STEP */}
        {step === 'loading' && (
          <div className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Analyzing your scorecard and drafting Rock suggestions...</p>
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
            {/* Metrics Summary */}
            <div className="flex-shrink-0 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Scorecard Analysis:</p>
              <div className="flex flex-wrap gap-2">
                {metricStats.off_track > 0 && (
                  <Badge variant="outline" className={getStatusColor('off_track')}>
                    <Target className="h-3 w-3 mr-1" />
                    {metricStats.off_track} Off Track
                  </Badge>
                )}
                {metricStats.at_risk > 0 && (
                  <Badge variant="outline" className={getStatusColor('at_risk')}>
                    <Target className="h-3 w-3 mr-1" />
                    {metricStats.at_risk} At Risk
                  </Badge>
                )}
                {metricStats.declining > 0 && (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {metricStats.declining} Declining
                  </Badge>
                )}
                <Badge variant="outline">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  {metrics.length} Total Metrics
                </Badge>
              </div>
            </div>

            {/* Intro text */}
            <p className="flex-shrink-0 text-sm text-muted-foreground py-3">
              Select which Rocks you want to create for {quarter}. You can adjust them later.
            </p>

            {/* Rocks header */}
            <div className="flex-shrink-0 flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Suggested Rocks ({suggestedRocks.length})</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selectedRocks.size === suggestedRocks.length) {
                    setSelectedRocks(new Set());
                  } else {
                    setSelectedRocks(new Set(suggestedRocks.map((_, i) => i)));
                  }
                }}
              >
                {selectedRocks.size === suggestedRocks.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {/* ScrollArea */}
            <ScrollArea className="h-[300px] pr-2">
              <div className="space-y-3 pb-2">
                {suggestedRocks.map((rock, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors overflow-hidden ${
                      selectedRocks.has(index)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                    onClick={() => toggleRock(index)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedRocks.has(index)}
                        onCheckedChange={() => toggleRock(index)}
                        className="mt-1 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium truncate max-w-[280px]">{rock.title}</span>
                          <Badge variant="outline" className={`text-xs flex-shrink-0 ${getPriorityColor(rock.priority)}`}>
                            {rock.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{rock.description}</p>
                        <p className="text-xs text-muted-foreground mb-2 italic">{rock.rationale}</p>
                        
                        <div className="flex flex-wrap gap-2">
                          {rock.owner_name && (
                            <Badge variant="outline" className="text-xs">
                              <User className="h-3 w-3 mr-1" />
                              {rock.owner_name}
                            </Badge>
                          )}
                          {rock.linked_metric_ids?.slice(0, 2).map((metricId, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              <LinkIcon className="h-3 w-3 mr-1 text-primary" />
                              {getMetricName(metricId)}
                            </Badge>
                          ))}
                          {rock.linked_metric_ids?.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{rock.linked_metric_ids.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex-shrink-0 flex gap-3 pt-4 border-t mt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setStep('creating');
                  createRocksMutation.mutate();
                }}
                disabled={selectedRocks.size === 0}
                className="flex-1 gradient-brand"
              >
                <Mountain className="w-4 h-4 mr-2" />
                Create {selectedRocks.size} Rock{selectedRocks.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}

        {/* CREATING STEP */}
        {step === 'creating' && (
          <div className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Creating your Rocks...</p>
            <p className="text-sm text-muted-foreground mt-2">
              {createdCount} of {selectedRocks.size} created
            </p>
          </div>
        )}

        {/* DONE STEP */}
        {step === 'done' && (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Rocks Created!</h3>
              <p className="text-muted-foreground">
                Successfully created {createdCount} rocks for {quarter}
              </p>
            </div>
            <Button onClick={handleClose} className="mt-4">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
