/**
 * QuickInterventionModal - Streamlined intervention creation with context awareness
 * 
 * Features:
 * - Quick mode with minimal required fields (title + metric)
 * - AI-assisted intervention type suggestion
 * - Advanced mode toggle for additional options
 * - Auto-populates baseline from latest metric_results
 * - Origin type/ID auto-filled based on launch context
 * - Supports all entry points: Scorecard, Issues, Meeting Signals, Recommendations
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { X, Loader2, ChevronDown, ChevronUp, Zap, Target, Info, ListTodo } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  INTERVENTION_TYPE_OPTIONS,
  EXPECTED_DIRECTION_OPTIONS,
  ORIGIN_TYPE_OPTIONS,
  type InterventionType,
  type ExpectedDirection,
  type InterventionOriginType,
} from "@/lib/interventions/types";
import { logInterventionEventAsync } from "@/lib/interventions/eventLogger";
import { validateBaseline, type BaselineQualityFlag } from "@/lib/interventions/baselineValidation";
import { format } from "date-fns";
import { InterventionTypeSuggestion } from "./InterventionTypeSuggestion";

// Origin context passed when opening modal
export interface InterventionOriginContext {
  originType: InterventionOriginType;
  originId?: string;
  // Pre-fill data
  suggestedTitle?: string;
  suggestedDescription?: string;
  preSelectedMetricId?: string;
  preSelectedIssueId?: string;
  // Detection source metadata (for assisted detection engine)
  detectionSource?: {
    detection_type: string;
    detection_id: string;
    confidence: number;
    context: Record<string, unknown>;
    detected_at: string;
  };
}

interface QuickInterventionModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  originContext?: InterventionOriginContext;
  /** Callback after successful creation */
  onSuccess?: (interventionId: string) => void;
}

interface MetricOption {
  id: string;
  name: string;
  latestValue: number | null;
  latestPeriod: string | null;
  latestSource: string | null;
  definitionVersion: number | null;
  historicalCount: number;
}

interface IssueOption {
  id: string;
  title: string;
}

export function QuickInterventionModal({
  open,
  onClose,
  organizationId,
  originContext,
  onSuccess,
}: QuickInterventionModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: currentUser } = useCurrentUser();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMetricId, setSelectedMetricId] = useState<string>("");
  const [selectedIssueId, setSelectedIssueId] = useState<string>("");
  const [expectedDirection, setExpectedDirection] = useState<ExpectedDirection>("up");
  const [expectedMagnitude, setExpectedMagnitude] = useState<string>("");
  const [timeHorizon, setTimeHorizon] = useState(60);
  const [confidenceLevel, setConfidenceLevel] = useState<"low" | "medium" | "high">("medium");
  const [interventionType, setInterventionType] = useState<InterventionType>("other");
  const [ownerUserId, setOwnerUserId] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Governance type state (from AI suggestion or manual selection)
  const [governanceTypeId, setGovernanceTypeId] = useState<string | null>(null);
  const [governanceTypeSource, setGovernanceTypeSource] = useState<"ai" | "user" | null>(null);
  const [governanceTypeConfidence, setGovernanceTypeConfidence] = useState<number | null>(null);

  // Handle type selection from suggestion component
  const handleTypeSelected = useCallback((selection: {
    typeId: string | null;
    typeName: string | null;
    source: "ai" | "user" | null;
    confidence: number | null;
  }) => {
    setGovernanceTypeId(selection.typeId);
    setGovernanceTypeSource(selection.source);
    setGovernanceTypeConfidence(selection.confidence);
  }, []);

  // Derived baseline from selected metric
  const [baseline, setBaseline] = useState<{
    value: number | null;
    period: string | null;
    source: string | null;
    definitionVersion: number | null;
    historicalCount: number;
  }>({
    value: null,
    period: null,
    source: null,
    definitionVersion: null,
    historicalCount: 0,
  });

  // Fetch org metrics with latest value
  const { data: metrics = [] } = useQuery<MetricOption[]>({
    queryKey: ["metrics-for-intervention", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metrics")
        .select(`
          id, 
          name,
          version,
          metric_results(value, week_start, source)
        `)
        .eq("organization_id", organizationId)
        .order("name");

      if (error) throw error;

      return (data || []).map((m: any) => {
        // Get latest non-null result
        const sortedResults = (m.metric_results || [])
          .filter((r: any) => r.value !== null)
          .sort((a: any, b: any) => new Date(b.week_start).getTime() - new Date(a.week_start).getTime());
        
        const latest = sortedResults[0];
        return {
          id: m.id,
          name: m.name,
          latestValue: latest?.value ?? null,
          latestPeriod: latest?.week_start ?? null,
          latestSource: latest?.source ?? null,
          definitionVersion: m.version ?? null,
          historicalCount: sortedResults.length,
        };
      });
    },
    enabled: open,
  });

  // Fetch org issues (open ones)
  const { data: issues = [] } = useQuery<IssueOption[]>({
    queryKey: ["issues-for-intervention", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issues")
        .select("id, title")
        .eq("organization_id", organizationId)
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch org users
  const { data: users = [] } = useQuery({
    queryKey: ["users-for-intervention", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("team_id", organizationId)
        .order("full_name");

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Reset and prefill on open
  useEffect(() => {
    if (open) {
      // Reset form
      setShowAdvanced(false);
      setExpectedDirection("up");
      setExpectedMagnitude("");
      setTimeHorizon(60);
      setConfidenceLevel("medium");
      setInterventionType("other");
      setOwnerUserId("");
      
      // Reset governance type
      setGovernanceTypeId(null);
      setGovernanceTypeSource(null);
      setGovernanceTypeConfidence(null);

      // Apply origin context
      if (originContext) {
        setTitle(originContext.suggestedTitle || "");
        setDescription(originContext.suggestedDescription || "");
        setSelectedMetricId(originContext.preSelectedMetricId || "");
        setSelectedIssueId(originContext.preSelectedIssueId || "");
      } else {
        setTitle("");
        setDescription("");
        setSelectedMetricId("");
        setSelectedIssueId("");
      }
    }
  }, [open, originContext]);

  // Update baseline when metric selection changes
  useEffect(() => {
    if (selectedMetricId) {
      const metric = metrics.find((m) => m.id === selectedMetricId);
      if (metric) {
        setBaseline({
          value: metric.latestValue,
          period: metric.latestPeriod,
          source: metric.latestSource,
          definitionVersion: metric.definitionVersion,
          historicalCount: metric.historicalCount,
        });
      }
    } else {
      setBaseline({ value: null, period: null, source: null, definitionVersion: null, historicalCount: 0 });
    }
  }, [selectedMetricId, metrics]);

  // Confidence level to numeric
  const confidenceToNumeric = (level: "low" | "medium" | "high"): number => {
    switch (level) {
      case "low": return 2;
      case "medium": return 3;
      case "high": return 4;
      default: return 3;
    }
  };

  const handleClose = () => {
    onClose();
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create intervention
      const { data: intervention, error: intError } = await supabase
        .from("interventions")
        .insert({
          organization_id: organizationId,
          title: title.trim(),
          description: description.trim() || null,
          intervention_type: interventionType,
          status: "planned",
          owner_user_id: ownerUserId || null,
          confidence_level: confidenceToNumeric(confidenceLevel),
          expected_time_horizon_days: timeHorizon,
          created_by: user.id,
          origin_type: originContext?.originType || "manual",
          origin_id: originContext?.originId || null,
          // Governance type fields
          intervention_type_id: governanceTypeId,
          intervention_type_source: governanceTypeSource,
          intervention_type_confidence: governanceTypeConfidence,
        })
        .select("id")
        .single();

      if (intError) throw intError;

      // Compute baseline quality
      const baselineValidation = validateBaseline({
        source: baseline.source,
        historicalPointCount: baseline.historicalCount,
        baselineCapturedAt: new Date(),
        interventionCreatedAt: new Date(), // Same moment, so this will be "good" for timing
      });

      // Create metric link with baseline (required)
      const { error: linkError } = await supabase
        .from("intervention_metric_links")
        .insert({
          intervention_id: intervention.id,
          metric_id: selectedMetricId,
          expected_direction: expectedDirection,
          expected_magnitude_percent: expectedMagnitude ? parseFloat(expectedMagnitude) : null,
          baseline_value: baseline.value,
          baseline_period_start: baseline.period,
          baseline_period_type: "week",
          baseline_definition_version: baseline.definitionVersion?.toString() || null,
          baseline_source: baseline.source,
          baseline_captured_at: new Date().toISOString(),
          baseline_capture_method: "auto",
          baseline_quality_flag: baselineValidation.flag,
        });

      if (linkError) throw linkError;

      // Link to issue if provided
      if (selectedIssueId) {
        await supabase
          .from("issues")
          .update({ intervention_id: intervention.id })
          .eq("id", selectedIssueId);
      }

      return intervention;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["interventions"] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });

      // Log event with detection source if present
      logInterventionEventAsync(data.id, "create_intervention", {
        origin_type: originContext?.originType || "manual",
        origin_id: originContext?.originId,
        metric_id: selectedMetricId,
        expected_direction: expectedDirection,
        detection_source: originContext?.detectionSource || null,
      });

      toast({
        title: "Intervention created",
        description: (
          <div className="flex flex-col gap-2">
            <span>Your intervention is ready to track.</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/interventions/${data.id}?addTodos=true`)}
              className="w-fit"
            >
              <ListTodo className="h-3 w-3 mr-1" />
              Add To-Dos Now
            </Button>
          </div>
        ),
      });

      if (onSuccess) {
        onSuccess(data.id);
      } else {
        handleClose();
        navigate(`/interventions/${data.id}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create intervention",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isValid = title.trim().length >= 4 && selectedMetricId;

  // Find selected metric for display
  const selectedMetric = useMemo(
    () => metrics.find((m) => m.id === selectedMetricId),
    [selectedMetricId, metrics]
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Create Intervention
          </DialogTitle>
          <DialogDescription>
            Track an experiment to improve a metric. Capture it in under 20 seconds.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Origin Context Badge */}
          {originContext && originContext.originType !== "manual" && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="text-xs">
                From: {ORIGIN_TYPE_OPTIONS.find((o) => o.value === originContext.originType)?.label || originContext.originType}
              </Badge>
            </div>
          )}

          {/* Title - Required */}
          <div className="grid gap-2">
            <Label htmlFor="title">
              What change are you testing? <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., 'Weekly Referrer Thank-You Calls'"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Tip: Name after the change, not the problem.
            </p>
            {title.length > 0 && title.length < 4 && (
              <p className="text-xs text-destructive">Title must be at least 4 characters</p>
            )}
          </div>

          {/* AI Type Suggestion - appears after title is entered */}
          {title.trim().length >= 4 && (
            <InterventionTypeSuggestion
              title={title}
              description={description}
              onTypeSelected={handleTypeSelected}
            />
          )}

          {/* Metric Selection - Required */}
          <div className="grid gap-2">
            <Label>
              Which metric should this move? <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedMetricId} onValueChange={setSelectedMetricId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a metric..." />
              </SelectTrigger>
              <SelectContent>
                {metrics.map((metric) => (
                  <SelectItem key={metric.id} value={metric.id}>
                    {metric.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Baseline Display */}
            {selectedMetric && (
              <div className="p-3 rounded-md bg-muted/50 border text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Baseline captured</span>
                </div>
                <p className="text-muted-foreground">
                  {baseline.value !== null ? (
                    <>
                      <span className="font-medium text-foreground">{baseline.value}</span>
                      {baseline.period && (
                        <> as of {format(new Date(baseline.period), "MMM d, yyyy")}</>
                      )}
                    </>
                  ) : (
                    <span className="italic">No data yet — baseline will be set from first result</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Expected Direction - Required */}
          <div className="grid gap-2">
            <Label>Expected Direction</Label>
            <Select value={expectedDirection} onValueChange={(v) => setExpectedDirection(v as ExpectedDirection)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPECTED_DIRECTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Horizon */}
          <div className="grid gap-2">
            <Label>
              Expected Time to Results: {timeHorizon} days
            </Label>
            <Slider
              value={[timeHorizon]}
              onValueChange={([v]) => setTimeHorizon(v)}
              min={7}
              max={180}
              step={7}
              className="w-full"
            />
          </div>

          {/* Confidence Level */}
          <div className="grid gap-2">
            <Label>Confidence Level</Label>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map((level) => (
                <Button
                  key={level}
                  type="button"
                  size="sm"
                  variant={confidenceLevel === level ? "default" : "outline"}
                  onClick={() => setConfidenceLevel(level)}
                  className="flex-1 capitalize"
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>

          {/* Advanced Section Toggle */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="text-sm">Advanced Options</span>
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Additional context or goals..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Expected Magnitude */}
              <div className="grid gap-2">
                <Label htmlFor="magnitude">Expected Improvement %</Label>
                <Input
                  id="magnitude"
                  type="number"
                  placeholder="e.g., 10"
                  value={expectedMagnitude}
                  onChange={(e) => setExpectedMagnitude(e.target.value)}
                  min={0}
                  max={100}
                />
              </div>

              {/* Intervention Type */}
              <div className="grid gap-2">
                <Label>Intervention Type</Label>
                <Select value={interventionType} onValueChange={(v) => setInterventionType(v as InterventionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVENTION_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Owner */}
              <div className="grid gap-2">
                <Label>Owner</Label>
                <Select value={ownerUserId || "none"} onValueChange={(v) => setOwnerUserId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No owner</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Linked Issue */}
              <div className="grid gap-2">
                <Label>Link to Issue (optional)</Label>
                <Select value={selectedIssueId || "none"} onValueChange={(v) => setSelectedIssueId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select issue..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No linked issue</SelectItem>
                    {issues.map((issue) => (
                      <SelectItem key={issue.id} value={issue.id}>
                        {issue.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!isValid || createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Intervention
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
