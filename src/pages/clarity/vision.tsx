import { useState } from "react";
import { ClarityShell } from "@/components/clarity/ClarityShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";

const STEPS = [
  { id: 'core_values', title: 'Core Values', description: 'What principles guide your decisions?' },
  { id: 'core_focus', title: 'Core Focus', description: 'Your purpose and niche' },
  { id: 'ten_year_target', title: '10-Year Target', description: 'Where will you be in 10 years?' },
  { id: 'ideal_client', title: 'Ideal Client', description: 'Who do you serve best?' },
  { id: 'differentiators', title: 'Differentiators', description: 'What makes you unique?' },
  { id: 'proven_process', title: 'Proven Process', description: 'Your repeatable system' },
  { id: 'promise', title: 'Promise/Guarantee', description: 'What can clients count on?' },
  { id: 'three_year_picture', title: '3-Year Picture', description: 'Metrics and vision for 3 years' },
  { id: 'culture', title: 'Culture Statement', description: 'How it feels to work here' },
  { id: 'summary', title: 'Summary', description: 'Review and save your vision' }
];

export default function VisionStudio() {
  const { data: user } = useCurrentUser();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Implement save logic
      toast({
        title: "Saved",
        description: "Your vision has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const miniMapSections = STEPS.map((s, idx) => ({
    id: s.id,
    label: s.title,
    complete: idx < currentStep,
    href: `/clarity/vision#${s.id}`
  }));

  return (
    <ClarityShell
      organizationId={user?.team_id || ''}
      autosaveStatus="saved"
      miniMapSections={miniMapSections}
    >
      <div className="space-y-6">
        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Step {currentStep + 1} of {STEPS.length}
            </h2>
            <span className="text-sm font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{step.title}</CardTitle>
            <CardDescription>{step.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step.id === 'core_values' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Core Values (3-5 values)
                  </label>
                  <Input placeholder="e.g., Compassion, Excellence, Growth" />
                  <p className="text-xs text-muted-foreground mt-2">
                    These principles guide every decision your team makes
                  </p>
                </div>
              </div>
            )}

            {step.id === 'core_focus' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Purpose</label>
                  <Input placeholder="Why your clinic exists" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Niche</label>
                  <Input placeholder="What you specialize in" />
                </div>
              </div>
            )}

            {step.id === 'ten_year_target' && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  10-Year Target
                </label>
                <Textarea 
                  placeholder="Describe where you'll be in 10 years. Be specific and inspiring."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Example: "Most trusted rehab network in BC with 10 locations and 200 team members"
                </p>
              </div>
            )}

            {step.id === 'ideal_client' && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Ideal Client Profile
                </label>
                <Textarea 
                  placeholder="Describe your perfect client. Who do you serve best?"
                  rows={4}
                />
              </div>
            )}

            {step.id === 'differentiators' && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Top 3 Differentiators
                </label>
                <Input placeholder="1. Same-week start times" className="mb-2" />
                <Input placeholder="2. Integrated care approach" className="mb-2" />
                <Input placeholder="3. Measurable results guarantee" />
              </div>
            )}

            {step.id === 'proven_process' && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Proven Process (3-5 steps)
                </label>
                <Input placeholder="1. Assess" className="mb-2" />
                <Input placeholder="2. Treat" className="mb-2" />
                <Input placeholder="3. Strengthen" className="mb-2" />
                <Input placeholder="4. Sustain" />
              </div>
            )}

            {step.id === 'promise' && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Promise/Guarantee
                </label>
                <Textarea 
                  placeholder="What can clients count on from you?"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Example: "Clear treatment plan within first visit"
                </p>
              </div>
            )}

            {step.id === 'three_year_picture' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Revenue</label>
                    <Input type="number" placeholder="2000000" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Profit %</label>
                    <Input type="number" placeholder="18" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Headcount</label>
                    <Input type="number" placeholder="28" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Descriptors</label>
                  <Input placeholder="Teaching clinic, Data-driven, Award-winning" />
                </div>
              </div>
            )}

            {step.id === 'culture' && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Culture Statement
                </label>
                <Textarea 
                  placeholder="How does it feel to work here? What's the atmosphere?"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Example: "We grow people and outcomes together"
                </p>
              </div>
            )}

            {step.id === 'summary' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Review your vision and save when ready. You can always come back to edit.
                </p>
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm">
                    🎉 <strong>Great work!</strong> Your vision is taking shape. 
                    Click Save to lock it in, then move to Traction to set your goals.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            
            {currentStep < STEPS.length - 1 ? (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving}>
                Complete Vision
              </Button>
            )}
          </div>
        </div>
      </div>
    </ClarityShell>
  );
}
