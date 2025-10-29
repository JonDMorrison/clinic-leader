import { useState, useEffect } from "react";
import { Stepper } from "@/components/ui/Stepper";
import { Button } from "@/components/ui/button";
import { AccountHolder } from "./steps/AccountHolder";
import { CompanyBasics } from "./steps/CompanyBasics";
import { OperationalSetup } from "./steps/OperationalSetup";
import { EosSetup } from "./steps/EosSetup";
import { Branding } from "./steps/Branding";
import { Review } from "./steps/Review";
import { OnboardingData } from "@/lib/onboarding/validators";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";

const STEPS = [
  { id: 0, label: "Account", completed: false },
  { id: 1, label: "Company", completed: false },
  { id: 2, label: "Operations", completed: false },
  { id: 3, label: "EOS", completed: false },
  { id: 4, label: "Branding", completed: false },
  { id: 5, label: "Review", completed: false },
];

interface CompanyWizardProps {
  userId: string;
  userEmail: string;
  organizationId: string;
}

export const CompanyWizard = ({
  userId,
  userEmail,
  organizationId,
}: CompanyWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<Partial<OnboardingData>>({ email: userEmail });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load existing session data
  useEffect(() => {
    const loadSession = async () => {
      const { data: session } = await supabase
        .from("onboarding_sessions")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("started_by", userId)
        .single();

      if (session) {
        setData({ ...data, ...(session.data as any) });
        setCurrentStep(session.step);
      }
    };
    loadSession();
  }, []);

  const saveDraft = async () => {
    setSaving(true);
    try {
      await supabase.functions.invoke("onboarding-save-draft", {
        body: { step: currentStep, data },
      });
      toast({
        title: "Progress saved",
        description: "You can continue later from where you left off.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Could not save your progress. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    // Validate current step
    setErrors({});
    
    // Auto-save on step change
    await saveDraft();

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final submission
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const { data: result } = await supabase.functions.invoke(
        "onboarding-complete",
        { body: { data } }
      );
      
      toast({
        title: "Setup complete! 🎉",
        description: "Welcome to your new workspace.",
      });
      
      navigate(result.redirect || "/dashboard");
    } catch (error) {
      toast({
        title: "Setup failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <AccountHolder data={data} onChange={setData} errors={errors} />
        );
      case 1:
        return (
          <CompanyBasics data={data} onChange={setData} errors={errors} />
        );
      case 2:
        return (
          <OperationalSetup data={data} onChange={setData} errors={errors} />
        );
      case 3:
        return <EosSetup data={data} onChange={setData} errors={errors} />;
      case 4:
        return <Branding data={data} onChange={setData} errors={errors} />;
      case 5:
        return <Review data={data} onEdit={setCurrentStep} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Company Profile Setup</h1>
          <p className="text-muted-foreground">
            Let's get your organization set up in just a few steps.
          </p>
        </div>

        <Stepper
          steps={STEPS.map((step, idx) => ({
            ...step,
            completed: idx < currentStep,
          }))}
          currentStep={currentStep}
        />

        <div className="bg-card/50 backdrop-blur-sm border rounded-2xl p-8 shadow-lg mt-8">
          {renderStep()}

          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0 || saving}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="flex gap-3">
              {currentStep < STEPS.length - 1 && (
                <Button
                  variant="outline"
                  onClick={saveDraft}
                  disabled={saving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save & Exit"}
                </Button>
              )}

              <Button onClick={handleNext} disabled={saving}>
                {currentStep === STEPS.length - 1
                  ? saving
                    ? "Finishing..."
                    : "Finish Setup 🚀"
                  : "Next"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
