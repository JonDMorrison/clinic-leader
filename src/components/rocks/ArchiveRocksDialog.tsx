import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Archive, Calendar, AlertCircle, ChevronDown, CheckCircle2, CircleDot, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentQuarter, getPreviousQuarter } from "@/lib/rocks/templates";

interface Rock {
  id: string;
  title: string;
  owner_id?: string;
  status: string;
  quarter: string;
  confidence?: number;
  due_date?: string;
  users?: { full_name: string };
}

interface ArchiveRocksDialogProps {
  open: boolean;
  onClose: () => void;
  incompleteRocks: Rock[];
  onSuccess: () => void;
}

type DispositionType = 'archived' | 'rolled_forward' | 'converted_to_issue';
type OutcomeStatus = 'achieved' | 'partial' | 'missed';

interface RockOutcomeData {
  disposition: DispositionType;
  outcome_status: OutcomeStatus;
  completion_percent: number;
  outcome_summary: string;
  blockers: string;
  lessons_learned: string;
}

export function ArchiveRocksDialog({
  open,
  onClose,
  incompleteRocks,
  onSuccess,
}: ArchiveRocksDialogProps) {
  const [outcomeData, setOutcomeData] = useState<Record<string, RockOutcomeData>>({});
  const [expandedRocks, setExpandedRocks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const nextQuarter = getCurrentQuarter();
  const closedQuarter = getPreviousQuarter();

  // Initialize outcome data for each rock
  useEffect(() => {
    if (open) {
      const initial: Record<string, RockOutcomeData> = {};
      incompleteRocks.forEach(rock => {
        initial[rock.id] = {
          disposition: 'archived',
          outcome_status: 'achieved',
          completion_percent: 100,
          outcome_summary: '',
          blockers: '',
          lessons_learned: '',
        };
      });
      setOutcomeData(initial);
      setExpandedRocks(new Set(incompleteRocks.map(r => r.id)));
      setValidationErrors({});
    }
  }, [open, incompleteRocks]);

  const updateOutcome = (rockId: string, field: keyof RockOutcomeData, value: any) => {
    setOutcomeData(prev => {
      const current = prev[rockId] || {
        disposition: 'archived',
        outcome_status: 'achieved',
        completion_percent: 100,
        outcome_summary: '',
        blockers: '',
        lessons_learned: '',
      };
      
      const updated = { ...current, [field]: value };
      
      // Auto-set defaults based on disposition
      if (field === 'disposition') {
        if (value === 'archived') {
          updated.outcome_status = 'achieved';
          updated.completion_percent = 100;
        } else if (value === 'rolled_forward') {
          updated.outcome_status = 'partial';
          updated.completion_percent = 50;
        } else if (value === 'converted_to_issue') {
          updated.outcome_status = 'missed';
          updated.completion_percent = 0;
        }
      }
      
      return { ...prev, [rockId]: updated };
    });
    
    // Clear validation errors for this rock
    setValidationErrors(prev => ({ ...prev, [rockId]: [] }));
  };

  const validateRock = (rockId: string, data: RockOutcomeData): string[] => {
    const errors: string[] = [];
    
    if (!data.outcome_status) {
      errors.push('Outcome status is required');
    }
    
    if (data.outcome_status === 'partial' && (data.completion_percent === undefined || data.completion_percent === null)) {
      errors.push('Completion % is required for partial outcomes');
    }
    
    if (data.outcome_status === 'missed' && !data.blockers?.trim()) {
      errors.push('Blocker description is required for missed outcomes');
    }
    
    return errors;
  };

  const handleApply = async () => {
    // Validate all rocks
    const allErrors: Record<string, string[]> = {};
    let hasErrors = false;
    
    for (const rock of incompleteRocks) {
      const data = outcomeData[rock.id];
      if (!data) continue;
      
      const errors = validateRock(rock.id, data);
      if (errors.length > 0) {
        allErrors[rock.id] = errors;
        hasErrors = true;
      }
    }
    
    if (hasErrors) {
      setValidationErrors(allErrors);
      toast.error('Please fix validation errors before proceeding');
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: userProfile } = await supabase
        .from('users')
        .select('id, team_id')
        .eq('email', userData.user.email)
        .single();

      if (!userProfile) throw new Error('User profile not found');

      for (const rock of incompleteRocks) {
        const data = outcomeData[rock.id];
        if (!data) continue;

        // Fetch linked metric IDs before any changes
        const { data: links } = await supabase
          .from('rock_metric_links')
          .select('metric_id')
          .eq('rock_id', rock.id);
        
        const linkedMetricIds = (links || []).map(l => l.metric_id);

        // Prepare outcome record (snapshot before changes)
        const outcomeRecord = {
          organization_id: userProfile.team_id,
          rock_id: rock.id,
          closed_quarter: closedQuarter,
          disposition: data.disposition,
          outcome_status: data.outcome_status,
          completion_percent: data.completion_percent,
          outcome_summary: data.outcome_summary?.trim() || null,
          lessons_learned: data.lessons_learned?.trim() || null,
          blockers: data.blockers?.trim() || null,
          closed_by: userProfile.id,
          // Snapshot fields
          rock_title: rock.title,
          rock_owner_id: rock.owner_id || null,
          rock_confidence: rock.confidence || null,
          rock_status_at_close: rock.status,
          rock_due_date: rock.due_date || null,
          linked_metric_ids: linkedMetricIds,
          created_issue_id: null as string | null,
        };

        // Handle disposition
        if (data.disposition === 'converted_to_issue') {
          // Create issue first
          const { data: newIssue, error: issueError } = await supabase
            .from('issues')
            .insert({
              title: `[From Rock] ${rock.title}`,
              status: 'open',
              priority: 2,
              owner_id: rock.owner_id,
              organization_id: userProfile.team_id,
              context: `Converted from incomplete rock: ${rock.title}\n\nBlocker: ${data.blockers || 'Not specified'}`,
            })
            .select('id')
            .single();
          
          if (issueError) throw issueError;
          outcomeRecord.created_issue_id = newIssue.id;
        }

        // Insert outcome record (before modifying rock)
        const { error: outcomeError } = await supabase
          .from('rock_outcomes')
          .insert(outcomeRecord);
        
        if (outcomeError) throw outcomeError;

        // Now apply disposition to rock
        if (data.disposition === 'archived' || data.disposition === 'converted_to_issue') {
          await supabase
            .from('rocks')
            .update({ 
              status: 'done', 
              note: data.disposition === 'archived' 
                ? 'Archived from previous quarter' 
                : 'Converted to issue' 
            })
            .eq('id', rock.id);
        } else if (data.disposition === 'rolled_forward') {
          await supabase
            .from('rocks')
            .update({ quarter: nextQuarter, note: 'Rolled forward from previous quarter' })
            .eq('id', rock.id);
        }
      }

      const archiveCount = Object.values(outcomeData).filter(d => d.disposition === 'archived').length;
      const rollCount = Object.values(outcomeData).filter(d => d.disposition === 'rolled_forward').length;
      const issueCount = Object.values(outcomeData).filter(d => d.disposition === 'converted_to_issue').length;

      toast.success(
        `Processed ${incompleteRocks.length} rocks: ${archiveCount} archived, ${rollCount} rolled forward, ${issueCount} converted to issues`
      );

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error processing rocks:', error);
      toast.error('Failed to process rocks');
    } finally {
      setLoading(false);
    }
  };

  const getOutcomeIcon = (status: OutcomeStatus) => {
    switch (status) {
      case 'achieved': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'partial': return <CircleDot className="h-4 w-4 text-amber-500" />;
      case 'missed': return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" />
            Handle Incomplete Rocks — {closedQuarter}
          </DialogTitle>
          <DialogDescription>
            Review each rock's outcome before archiving, rolling forward, or converting to an issue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {incompleteRocks.map((rock) => {
            const data = outcomeData[rock.id];
            const errors = validationErrors[rock.id] || [];
            const isExpanded = expandedRocks.has(rock.id);
            
            if (!data) return null;

            return (
              <Collapsible 
                key={rock.id} 
                open={isExpanded}
                onOpenChange={(open) => {
                  setExpandedRocks(prev => {
                    const next = new Set(prev);
                    if (open) next.add(rock.id);
                    else next.delete(rock.id);
                    return next;
                  });
                }}
              >
                <div className="rounded-lg border p-4 space-y-3">
                  <CollapsibleTrigger className="flex items-start justify-between gap-3 w-full text-left">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{rock.title}</h4>
                        {data.outcome_status && getOutcomeIcon(data.outcome_status)}
                      </div>
                      {rock.users && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Owner: {rock.users.full_name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="flex-shrink-0 capitalize">
                        {data.disposition.replace('_', ' ')}
                      </Badge>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-4 pt-3 border-t">
                    {/* Validation errors */}
                    {errors.length > 0 && (
                      <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                        {errors.map((err, i) => <div key={i}>• {err}</div>)}
                      </div>
                    )}

                    {/* Disposition */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">What happened to this rock?</Label>
                      <RadioGroup
                        value={data.disposition}
                        onValueChange={(value) => updateOutcome(rock.id, 'disposition', value as DispositionType)}
                        className="flex flex-wrap gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="archived" id={`${rock.id}-archive`} />
                          <Label htmlFor={`${rock.id}-archive`} className="flex items-center gap-1 cursor-pointer text-sm">
                            <Archive className="h-3 w-3" /> Archive
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="rolled_forward" id={`${rock.id}-roll`} />
                          <Label htmlFor={`${rock.id}-roll`} className="flex items-center gap-1 cursor-pointer text-sm">
                            <Calendar className="h-3 w-3" /> Roll to {nextQuarter}
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="converted_to_issue" id={`${rock.id}-issue`} />
                          <Label htmlFor={`${rock.id}-issue`} className="flex items-center gap-1 cursor-pointer text-sm">
                            <AlertCircle className="h-3 w-3" /> Convert to Issue
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Outcome Status */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Outcome *</Label>
                      <RadioGroup
                        value={data.outcome_status}
                        onValueChange={(value) => updateOutcome(rock.id, 'outcome_status', value as OutcomeStatus)}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="achieved" id={`${rock.id}-achieved`} />
                          <Label htmlFor={`${rock.id}-achieved`} className="flex items-center gap-1 cursor-pointer text-sm">
                            <CheckCircle2 className="h-3 w-3 text-green-500" /> Achieved
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="partial" id={`${rock.id}-partial`} />
                          <Label htmlFor={`${rock.id}-partial`} className="flex items-center gap-1 cursor-pointer text-sm">
                            <CircleDot className="h-3 w-3 text-amber-500" /> Partial
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="missed" id={`${rock.id}-missed`} />
                          <Label htmlFor={`${rock.id}-missed`} className="flex items-center gap-1 cursor-pointer text-sm">
                            <XCircle className="h-3 w-3 text-red-500" /> Missed
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Completion Percent */}
                    {(data.outcome_status === 'partial' || data.outcome_status === 'achieved') && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs font-medium text-muted-foreground">
                            Completion {data.outcome_status === 'partial' ? '*' : ''}
                          </Label>
                          <span className="text-sm font-medium">{data.completion_percent}%</span>
                        </div>
                        <Slider
                          value={[data.completion_percent]}
                          onValueChange={([value]) => updateOutcome(rock.id, 'completion_percent', value)}
                          min={0}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </div>
                    )}

                    {/* Blocker (required for missed) */}
                    {data.outcome_status === 'missed' && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">What blocked this? *</Label>
                        <Input
                          value={data.blockers}
                          onChange={(e) => updateOutcome(rock.id, 'blockers', e.target.value)}
                          placeholder="Brief description of the blocker..."
                          className="text-sm"
                        />
                      </div>
                    )}

                    {/* Optional fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Summary (optional)</Label>
                        <Textarea
                          value={data.outcome_summary}
                          onChange={(e) => updateOutcome(rock.id, 'outcome_summary', e.target.value)}
                          placeholder="Brief summary of outcome..."
                          rows={2}
                          className="text-sm resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Lesson learned (optional)</Label>
                        <Textarea
                          value={data.lessons_learned}
                          onChange={(e) => updateOutcome(rock.id, 'lessons_learned', e.target.value)}
                          placeholder="What did we learn?"
                          rows={2}
                          className="text-sm resize-none"
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={loading}>
              {loading ? 'Processing...' : `Close ${incompleteRocks.length} Rocks`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}