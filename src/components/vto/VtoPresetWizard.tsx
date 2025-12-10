import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { VTO_PRESETS, VTOPreset } from "@/lib/vto/presets";
import { Loader2, Check, Sparkles, ArrowLeft, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface VtoPresetWizardProps {
  vtoId: string;
  onClose: () => void;
}

type WizardStep = 'choose' | 'preview' | 'applying';

export const VtoPresetWizard = ({ vtoId, onClose }: VtoPresetWizardProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>('choose');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [autoLink, setAutoLink] = useState(true);
  const [keepCurrentDraft, setKeepCurrentDraft] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [appliedVersionId, setAppliedVersionId] = useState<string | null>(null);

  const preset = selectedPreset ? VTO_PRESETS[selectedPreset] : null;

  const handleApply = async () => {
    if (!preset || !selectedPreset) return;

    setStep('applying');
    setIsApplying(true);

    try {
      const { data, error } = await supabase.functions.invoke('vto-apply-preset', {
        body: {
          vtoId,
          presetKey: selectedPreset,
          presetData: preset,
          autoLink,
          keepCurrentDraft,
        },
      });

      if (error) throw error;

      setAppliedVersionId(data.versionId);
      
      toast({
        title: "Success!",
        description: `${preset.label} preset loaded into new draft${data.linksCreated > 0 ? ` with ${data.linksCreated} auto-links` : ''}`,
      });

      // Don't close immediately, show success state
    } catch (error: any) {
      console.error('Error applying preset:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to apply preset",
        variant: "destructive",
      });
      setStep('preview');
      setIsApplying(false);
    }
  };

  const handleUndo = async () => {
    if (!appliedVersionId) return;

    try {
      const { error } = await supabase.functions.invoke('vto-undo-preset', {
        body: { vtoVersionId: appliedVersionId },
      });

      if (error) throw error;

      toast({
        title: "Undone",
        description: "Preset has been removed",
      });

      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to undo preset",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Load V/TO Preset
          </DialogTitle>
        </DialogHeader>

        {step === 'choose' && (
          <div className="space-y-6">
            <div className="grid gap-4">
              {Object.entries(VTO_PRESETS).map(([key, preset]) => (
                <div
                  key={key}
                  className={`cursor-pointer transition-all ${
                    selectedPreset === key
                      ? 'ring-2 ring-primary glass'
                      : 'hover:glass'
                  }`}
                  onClick={() => setSelectedPreset(key)}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{preset.label}</CardTitle>
                        {selectedPreset === key && (
                          <Badge variant="default" className="gap-1">
                            <Check className="w-3 h-3" />
                            Selected
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{preset.description}</p>
                    </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Core Values:</span>{' '}
                        {preset.vision.core_values.length}
                      </div>
                      <div>
                        <span className="font-medium">1-Year Goals:</span>{' '}
                        {preset.traction.one_year_plan.goals.length}
                      </div>
                      <div>
                        <span className="font-medium">Quarterly Rocks:</span>{' '}
                        {preset.traction.quarterly_rocks.length}
                      </div>
                    </div>
                  </CardContent>
                  </Card>
                </div>
              ))}
            </div>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-link">Auto-link KPIs/Rocks/Docs</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically connect goals to existing items where obvious
                    </p>
                  </div>
                  <Switch
                    id="auto-link"
                    checked={autoLink}
                    onCheckedChange={setAutoLink}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="keep-draft">Keep current draft as backup</Label>
                    <p className="text-sm text-muted-foreground">
                      Archive existing draft instead of replacing it
                    </p>
                  </div>
                  <Switch
                    id="keep-draft"
                    checked={keepCurrentDraft}
                    onCheckedChange={setKeepCurrentDraft}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep('preview')}
                disabled={!selectedPreset}
                className="gap-2"
              >
                Preview
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && preset && (
          <div className="space-y-6">
            <Tabs defaultValue="vision">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="vision">Vision</TabsTrigger>
                <TabsTrigger value="traction">Traction</TabsTrigger>
              </TabsList>

              <TabsContent value="vision" className="space-y-4 mt-4">
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-sm">Core Values</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {preset.vision.core_values.map((value, i) => (
                        <Badge key={i} variant="secondary">{value}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-sm">Core Focus</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Purpose:</span>{' '}
                      {preset.vision.core_focus.purpose}
                    </div>
                    <div>
                      <span className="font-medium">Niche:</span>{' '}
                      {preset.vision.core_focus.niche}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-sm">10-Year Target</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{preset.vision.ten_year_target}</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="traction" className="space-y-4 mt-4">
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-sm">1-Year Goals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      {preset.traction.one_year_plan.goals.map((goal, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-muted-foreground">•</span>
                          {goal}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-sm">Quarterly Rocks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      {preset.traction.quarterly_rocks.map((rock, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-muted-foreground">•</span>
                          {rock.title}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep('choose')} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleApply} className="gap-2">
                  <Check className="w-4 h-4" />
                  Apply Preset
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'applying' && (
          <div className="space-y-6 py-8">
            {isApplying ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-medium">Applying preset...</p>
                  <p className="text-sm text-muted-foreground">
                    Creating draft version and linking items
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Preset applied successfully!</p>
                  <p className="text-sm text-muted-foreground">
                    Your new draft version is ready to edit
                  </p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={handleUndo}
                  >
                    Undo
                  </Button>
                  <Button
                    onClick={() => {
                      navigate('/vto/vision');
                      onClose();
                    }}
                  >
                    Open Draft
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
