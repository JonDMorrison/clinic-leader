import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Stepper } from "@/components/ui/Stepper";
import { IntroStep } from "@/components/scorecard/setup/IntroStep";
import { MetricDefinitionsStep } from "@/components/scorecard/setup/MetricDefinitionsStep";
import { ReviewStep } from "@/components/scorecard/setup/ReviewStep";
import { DemoDataStep } from "@/components/scorecard/setup/DemoDataStep";
import { ConfirmationStep } from "@/components/scorecard/setup/ConfirmationStep";

export interface MetricDefinition {
  name: string;
  target: number | null;
  unit: string;
  direction: "up" | "down";
  owner: string;
  category: string;
  syncSource: "manual" | "jane";
}

const ScorecardSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [includeDemoData, setIncludeDemoData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = [
    { id: 0, label: "Intro", completed: currentStep > 0 },
    { id: 1, label: "Metrics", completed: currentStep > 1 },
    { id: 2, label: "Review", completed: currentStep > 2 },
    { id: 3, label: "Demo Data", completed: currentStep > 3 },
    { id: 4, label: "Confirm", completed: currentStep > 4 },
  ];

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userData } = await supabase
        .from("users")
        .select("team_id")
        .eq("id", user.id)
        .single();

      if (!userData?.team_id) throw new Error("No organization found");

      // Insert metrics
      const { data: insertedMetrics, error: metricsError } = await supabase
        .from("metrics")
        .insert(
          metrics.map((metric) => ({
            organization_id: userData.team_id,
            name: metric.name,
            target: metric.target,
            unit: metric.unit,
            direction: metric.direction,
            owner: metric.owner,
            category: metric.category,
            sync_source: metric.syncSource,
          }))
        )
        .select();

      if (metricsError) throw metricsError;

      // Seed weekly rows for next 4 weeks
      if (insertedMetrics) {
        const weeklyRows = [];
        const today = new Date();
        
        for (let i = 0; i < 4; i++) {
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() + (i * 7));
          weekStart.setHours(0, 0, 0, 0);
          const weekStartStr = weekStart.toISOString().split('T')[0];
          const periodKey = weekStartStr.slice(0, 7) + '-W' + String(i + 1).padStart(2, '0');
          
          for (const metric of insertedMetrics) {
            weeklyRows.push({
              metric_id: metric.id,
              week_start: weekStartStr,
              period_start: weekStartStr,
              period_type: 'weekly',
              period_key: periodKey,
              value: includeDemoData ? Math.floor(Math.random() * 100) : null,
            });
          }
        }

        const { error: resultsError } = await supabase
          .from("metric_results")
          .insert(weeklyRows);

        if (resultsError) throw resultsError;
      }

      toast({
        title: "Success!",
        description: "Your Scorecard is ready!",
      });

      navigate("/scorecard");
    } catch (error) {
      console.error("Error setting up scorecard:", error);
      toast({
        title: "Error",
        description: "Failed to set up scorecard. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Stepper steps={steps} currentStep={currentStep} />

        <div className="mt-8">
          {currentStep === 0 && <IntroStep onNext={handleNext} />}
          
          {currentStep === 1 && (
            <MetricDefinitionsStep
              metrics={metrics}
              onMetricsChange={setMetrics}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 2 && (
            <ReviewStep
              metrics={metrics}
              onMetricsChange={setMetrics}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 3 && (
            <DemoDataStep
              includeDemoData={includeDemoData}
              onToggle={setIncludeDemoData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          
          {currentStep === 4 && (
            <ConfirmationStep
              onSubmit={handleSubmit}
              onBack={handleBack}
              isSubmitting={isSubmitting}
              metrics={metrics}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ScorecardSetup;
