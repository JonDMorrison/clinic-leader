import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClarityShell } from "@/components/clarity/ClarityShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useClarityAutosave, AutosaveStatus } from "@/hooks/useClarityAutosave";
import { supabase } from "@/integrations/supabase/client";
import { Stepper } from "@/components/ui/Stepper";
import { CoreValuesEditor } from "@/components/clarity/vision/CoreValuesEditor";
import { CoreFocusEditor } from "@/components/clarity/vision/CoreFocusEditor";
import { TenYearTargetEditor } from "@/components/clarity/vision/TenYearTargetEditor";
import { IdealClientEditor } from "@/components/clarity/vision/IdealClientEditor";
import { DifferentiatorsEditor } from "@/components/clarity/vision/DifferentiatorsEditor";
import { ProvenProcessEditor } from "@/components/clarity/vision/ProvenProcessEditor";
import { PromiseEditor } from "@/components/clarity/vision/PromiseEditor";
import { ThreeYearPictureEditor } from "@/components/clarity/vision/ThreeYearPictureEditor";
import { CultureEditor } from "@/components/clarity/vision/CultureEditor";
import { SummaryStep } from "@/components/clarity/vision/SummaryStep";

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
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("saved");

  const [visionData, setVisionData] = useState({
    vision: {
      core_values: ["", "", ""],
      core_focus: { purpose: "", niche: "" },
      ten_year_target: "",
      ideal_client: "",
      differentiators: ["", "", ""],
      proven_process: ["", "", ""],
      promise: "",
      three_year_picture: { revenue: 0, profit: 0, headcount: 0, descriptors: "" },
      culture: "",
    },
    traction: {},
    metrics: {},
  });

  // Load existing VTO data on mount
  useEffect(() => {
    async function loadVTOData() {
      if (!user?.team_id) return;

      try {
        const { data, error } = await supabase
          .from('clarity_vto')
          .select('*')
          .eq('organization_id', user.team_id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw error;
        }

        if (data) {
          const loadedVision = data.vision as typeof visionData.vision;
          const loadedTraction = data.traction as typeof visionData.traction;
          const loadedMetrics = data.metrics as typeof visionData.metrics;
          
          setVisionData({
            vision: loadedVision || visionData.vision,
            traction: loadedTraction || {},
            metrics: loadedMetrics || {},
          });
        }
      } catch (error) {
        console.error('Error loading VTO data:', error);
        toast({
          title: "Error",
          description: "Failed to load your saved progress.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadVTOData();
  }, [user?.team_id]);

  useClarityAutosave({
    organizationId: user?.team_id || "",
    vtoData: visionData,
    onStatusChange: setAutosaveStatus,
  });

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
    if (!user?.team_id) {
      toast({
        title: "Error",
        description: "Organization ID is missing.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      const { error } = await supabase.functions.invoke("clarity-save", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          organization_id: user.team_id,
          vision: visionData.vision,
          traction: visionData.traction,
          action: 'complete_vision'
        },
      });

      if (error) throw error;

      toast({
        title: "Vision Complete!",
        description: "Your vision has been saved. Moving to Traction...",
      });

      // Navigate to traction page after successful save
      setTimeout(() => {
        navigate("/clarity/traction");
      }, 1500);
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const stepperSteps = STEPS.map((s, idx) => ({
    id: idx,
    label: s.title,
    completed: idx < currentStep,
  }));

  const miniMapSections = STEPS.map((s, idx) => ({
    id: s.id,
    label: s.title,
    complete: idx < currentStep,
    href: `/clarity/vision#${s.id}`,
  }));

  if (loading) {
    return (
      <ClarityShell
        organizationId={user?.team_id || ""}
        autosaveStatus={autosaveStatus}
        miniMapSections={miniMapSections}
      >
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading your progress...</p>
        </div>
      </ClarityShell>
    );
  }

  return (
    <ClarityShell
      organizationId={user?.team_id || ""}
      autosaveStatus={autosaveStatus}
      miniMapSections={miniMapSections}
    >
      <div className="space-y-6">
        <Stepper steps={stepperSteps} currentStep={currentStep} />

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{step.title}</CardTitle>
            <CardDescription>{step.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step.id === "core_values" && (
              <CoreValuesEditor
                values={visionData.vision.core_values}
                onChange={(values) =>
                  setVisionData({
                    ...visionData,
                    vision: { ...visionData.vision, core_values: values },
                  })
                }
                organizationId={user?.team_id || ""}
              />
            )}

            {step.id === "core_focus" && (
              <CoreFocusEditor
                purpose={visionData.vision.core_focus.purpose}
                niche={visionData.vision.core_focus.niche}
                onChange={(data) =>
                  setVisionData({
                    ...visionData,
                    vision: { ...visionData.vision, core_focus: data },
                  })
                }
                organizationId={user?.team_id || ""}
              />
            )}

            {step.id === "ten_year_target" && (
              <TenYearTargetEditor
                value={visionData.vision.ten_year_target}
                onChange={(value) =>
                  setVisionData({
                    ...visionData,
                    vision: { ...visionData.vision, ten_year_target: value },
                  })
                }
                organizationId={user?.team_id || ""}
              />
            )}

            {step.id === "ideal_client" && (
              <IdealClientEditor
                value={visionData.vision.ideal_client}
                onChange={(value) =>
                  setVisionData({
                    ...visionData,
                    vision: { ...visionData.vision, ideal_client: value },
                  })
                }
                organizationId={user?.team_id || ""}
              />
            )}

            {step.id === "differentiators" && (
              <DifferentiatorsEditor
                values={visionData.vision.differentiators}
                onChange={(values) =>
                  setVisionData({
                    ...visionData,
                    vision: { ...visionData.vision, differentiators: values },
                  })
                }
                organizationId={user?.team_id || ""}
              />
            )}

            {step.id === "proven_process" && (
              <ProvenProcessEditor
                steps={visionData.vision.proven_process}
                onChange={(steps) =>
                  setVisionData({
                    ...visionData,
                    vision: { ...visionData.vision, proven_process: steps },
                  })
                }
                organizationId={user?.team_id || ""}
              />
            )}

            {step.id === "promise" && (
              <PromiseEditor
                value={visionData.vision.promise}
                onChange={(value) =>
                  setVisionData({
                    ...visionData,
                    vision: { ...visionData.vision, promise: value },
                  })
                }
                organizationId={user?.team_id || ""}
              />
            )}

            {step.id === "three_year_picture" && (
              <ThreeYearPictureEditor
                revenue={visionData.vision.three_year_picture.revenue}
                profit={visionData.vision.three_year_picture.profit}
                headcount={visionData.vision.three_year_picture.headcount}
                descriptors={visionData.vision.three_year_picture.descriptors}
                onChange={(data) =>
                  setVisionData({
                    ...visionData,
                    vision: { ...visionData.vision, three_year_picture: data },
                  })
                }
              />
            )}

            {step.id === "culture" && (
              <CultureEditor
                value={visionData.vision.culture}
                onChange={(value) =>
                  setVisionData({
                    ...visionData,
                    vision: { ...visionData.vision, culture: value },
                  })
                }
                organizationId={user?.team_id || ""}
              />
            )}

            {step.id === "summary" && <SummaryStep />}
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
