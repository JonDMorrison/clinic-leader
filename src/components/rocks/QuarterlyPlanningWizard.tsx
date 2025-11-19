import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, ChevronRight, ChevronLeft, Sparkles, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RockSuggestionCard } from "./RockSuggestionCard";
import { getCurrentQuarter, getEndOfQuarter } from "@/lib/rocks/templates";

interface OneYearGoal {
  title: string;
  owner_id?: string;
  target_date?: string;
  status?: string;
}

interface RockSuggestion {
  title: string;
  owner_id?: string;
  approved: boolean;
}

interface QuarterlyPlanningWizardProps {
  open: boolean;
  onClose: () => void;
  vtoVersionId: string;
  oneYearGoals: OneYearGoal[];
  users: Array<{ id: string; full_name: string }>;
  onSuccess: () => void;
}

export function QuarterlyPlanningWizard({
  open,
  onClose,
  vtoVersionId,
  oneYearGoals,
  users,
  onSuccess,
}: QuarterlyPlanningWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<number, RockSuggestion[]>>({});
  const [generating, setGenerating] = useState(false);
  const currentQuarter = getCurrentQuarter();

  // Generate AI suggestions for a specific goal
  const generateSuggestions = async (goalIndex: number, goal: OneYearGoal) => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('clarity-ai', {
        body: {
          intent: 'suggest_rocks',
          context: {
            goal: goal.title,
            quarter: currentQuarter,
            oneYearGoals: oneYearGoals.map(g => g.title),
          },
          field: 'quarterly_rocks',
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(prev => ({
          ...prev,
          [goalIndex]: data.suggestions.map((s: any) => ({
            title: typeof s === 'string' ? s : s.title || s.text || '',
            owner_id: goal.owner_id,
            approved: false,
          })),
        }));
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast.error('Failed to generate AI suggestions');
    } finally {
      setGenerating(false);
    }
  };

  // Load suggestions for current goal
  useEffect(() => {
    if (open && currentStep < oneYearGoals.length) {
      const goal = oneYearGoals[currentStep];
      if (!suggestions[currentStep]) {
        generateSuggestions(currentStep, goal);
      }
    }
  }, [open, currentStep, oneYearGoals]);

  // Handle rock approval toggle
  const toggleRockApproval = (goalIndex: number, rockIndex: number) => {
    setSuggestions(prev => ({
      ...prev,
      [goalIndex]: prev[goalIndex]?.map((rock, i) =>
        i === rockIndex ? { ...rock, approved: !rock.approved } : rock
      ) || [],
    }));
  };

  // Update rock details
  const updateRock = (goalIndex: number, rockIndex: number, updates: Partial<RockSuggestion>) => {
    setSuggestions(prev => ({
      ...prev,
      [goalIndex]: prev[goalIndex]?.map((rock, i) =>
        i === rockIndex ? { ...rock, ...updates } : rock
      ) || [],
    }));
  };

  // Handle wizard navigation
  const handleNext = () => {
    if (currentStep < oneYearGoals.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Create approved rocks
  const handleFinish = async () => {
    setLoading(true);
    try {
      const approvedRocks = Object.entries(suggestions).flatMap(([goalIndex, rocks]) =>
        rocks
          .filter(rock => rock.approved)
          .map(rock => ({
            title: rock.title,
            owner_id: rock.owner_id,
            quarter: currentQuarter,
            due: getEndOfQuarter(currentQuarter).toISOString(),
            status: 'on_track' as const,
            vto_link: {
              vto_version_id: vtoVersionId,
              goal_key: `one_year_plan.goals[${goalIndex}]`,
              weight: 0.8,
            },
          }))
      );

      if (approvedRocks.length === 0) {
        toast.error('Please approve at least one rock');
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke('vto-plan-quarter', {
        body: {
          rocks: approvedRocks,
          quarter: currentQuarter,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      toast.success(`Created ${approvedRocks.length} rocks for ${currentQuarter}`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating rocks:', error);
      toast.error('Failed to create rocks');
    } finally {
      setLoading(false);
    }
  };

  const currentGoal = oneYearGoals[currentStep];
  const currentSuggestions = suggestions[currentStep] || [];
  const approvedCount = currentSuggestions.filter(r => r.approved).length;
  const totalApproved = Object.values(suggestions).reduce(
    (sum, rocks) => sum + rocks.filter(r => r.approved).length,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Plan {currentQuarter} Rocks
          </DialogTitle>
          <DialogDescription>
            Create quarterly rocks from your 1-year goals with AI-powered suggestions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                Goal {currentStep + 1} of {oneYearGoals.length}
              </span>
              <span>{totalApproved} rocks approved</span>
            </div>
            <Progress value={((currentStep + 1) / oneYearGoals.length) * 100} />
          </div>

          {/* Current Goal */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <h3 className="font-semibold mb-1">1-Year Goal</h3>
            <p className="text-sm text-muted-foreground">{currentGoal?.title}</p>
          </div>

          {/* AI Suggestions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Suggested Quarterly Rocks</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateSuggestions(currentStep, currentGoal)}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Regenerate
                  </>
                )}
              </Button>
            </div>

            {generating && currentSuggestions.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Generating AI suggestions...
              </div>
            ) : (
              <div className="space-y-2">
                {currentSuggestions.map((rock, index) => (
                  <RockSuggestionCard
                    key={index}
                    rock={rock}
                    users={users}
                    onToggleApprove={() => toggleRockApproval(currentStep, index)}
                    onUpdate={(updates) => updateRock(currentStep, index, updates)}
                  />
                ))}
              </div>
            )}

            {currentSuggestions.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {approvedCount} of {currentSuggestions.length} rocks approved for this goal
              </p>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleBack} disabled={currentStep === 0 || loading}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {currentStep < oneYearGoals.length - 1 ? (
              <Button onClick={handleNext} disabled={loading}>
                Next Goal
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={loading || totalApproved === 0}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Create {totalApproved} Rocks
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
