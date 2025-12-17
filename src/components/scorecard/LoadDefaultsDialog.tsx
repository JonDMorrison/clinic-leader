import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Users, FileText, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { loadDefaultKPIs, previewDefaultKPIs } from "@/lib/kpis/loader";
import { getBundleOptions } from "@/lib/kpis/templates";
import { PreviewStep } from "./PreviewStep";
import { QuickAssignOwners } from "./QuickAssignOwners";
import { StayAlignedModal } from "./StayAlignedModal";

interface LoadDefaultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export function LoadDefaultsDialog({ open, onOpenChange, organizationId }: LoadDefaultsDialogProps) {
  const [step, setStep] = useState(1);
  const [includeBundles, setIncludeBundles] = useState<string[]>([]);
  const [includeTargets, setIncludeTargets] = useState(false);
  const [ownerMode, setOwnerMode] = useState<"auto" | "self" | "custom">("auto");
  const [customOwners, setCustomOwners] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<any>(null);
  const [showAlignedModal, setShowAlignedModal] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("email", user.email)
        .single();
      
      return data;
    },
  });

  // Fetch org settings to check alignment mode
  const { data: orgSettings } = useQuery({
    queryKey: ['org-settings', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from('teams')
        .select('scorecard_mode')
        .eq('id', organizationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId && open,
  });

  const isAlignedMode = orgSettings?.scorecard_mode === 'aligned';

  const bundleOptions = getBundleOptions("clinic_standard");

  const loadMutation = useMutation({
    mutationFn: async () => {
      return loadDefaultKPIs({
        organizationId,
        templateKey: "clinic_standard",
        includeBundles,
        includeTargets,
        autoOwners: ownerMode === "auto",
        ownerUserId: ownerMode === "self" ? currentUser?.id : undefined,
        createdBy: currentUser?.id
      });
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "KPIs Loaded",
          description: `Created ${result.createdCount} KPIs${result.skippedNames.length > 0 ? `, ${result.skippedNames.length} already exist` : ""}.`,
        });
        queryClient.invalidateQueries({ queryKey: ["scorecard-metrics"] });
        setStep(4);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load KPIs",
          variant: "destructive",
        });
      }
    },
  });

  const executeLoad = () => {
    loadMutation.mutate();
  };

  const handleNext = async () => {
    if (step === 1) {
      // Load preview
      const previewData = await previewDefaultKPIs({
        organizationId,
        templateKey: "clinic_standard",
        includeBundles,
        includeTargets,
        autoOwners: ownerMode === "auto"
      });
      setPreview(previewData);
      setStep(2);
    } else if (step === 2 && ownerMode === "custom") {
      setStep(3);
    } else if (step === 2 || step === 3) {
      // Check if in aligned mode before creating metrics
      if (isAlignedMode) {
        setShowAlignedModal(true);
      } else {
        executeLoad();
      }
    }
  };

  const handleAlignedProceed = () => {
    setShowAlignedModal(false);
    executeLoad();
  };

  const handleClose = () => {
    setStep(1);
    setIncludeBundles([]);
    setIncludeTargets(false);
    setOwnerMode("auto");
    setCustomOwners({});
    setPreview(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Load Default KPIs
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Configure your KPI defaults"}
            {step === 2 && "Preview what will be created"}
            {step === 3 && "Assign owners per group"}
            {step === 4 && "Next steps"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Optional Bundles</Label>
              <p className="text-sm text-muted-foreground">
                Add specialized KPIs beyond the core set
              </p>
              <div className="space-y-2">
                {bundleOptions.map(bundle => (
                  <div key={bundle.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={bundle.value}
                      checked={includeBundles.includes(bundle.value)}
                      onCheckedChange={(checked) => {
                        setIncludeBundles(prev =>
                          checked
                            ? [...prev, bundle.value]
                            : prev.filter(b => b !== bundle.value)
                        );
                      }}
                    />
                    <Label htmlFor={bundle.value} className="cursor-pointer">
                      {bundle.label} <span className="text-muted-foreground">({bundle.count} KPIs)</span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Owner Assignment</Label>
              <RadioGroup value={ownerMode} onValueChange={(v: any) => setOwnerMode(v)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="auto" id="auto" />
                  <Label htmlFor="auto" className="cursor-pointer">
                    Auto-assign by role <span className="text-muted-foreground">(recommended)</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="self" id="self" />
                  <Label htmlFor="self" className="cursor-pointer">
                    Assign all to me
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="cursor-pointer">
                    Pick per group
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="targets"
                checked={includeTargets}
                onCheckedChange={(checked) => setIncludeTargets(checked as boolean)}
              />
              <Label htmlFor="targets" className="cursor-pointer">
                Include sample targets <span className="text-muted-foreground">(you can adjust later)</span>
              </Label>
            </div>
          </div>
        )}

        {step === 2 && preview && (
          <PreviewStep preview={preview} includeTargets={includeTargets} />
        )}

        {step === 3 && (
          <QuickAssignOwners
            groups={Object.keys(preview?.groups || {})}
            organizationId={organizationId}
            owners={customOwners}
            onOwnersChange={setCustomOwners}
          />
        )}

        {step === 4 && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">KPIs loaded successfully!</span>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Next steps to get the most from your scorecard:</p>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  handleClose();
                  window.location.href = "/settings";
                }}
              >
                <Users className="h-4 w-4 mr-2" />
                Invite your team
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          {step < 4 && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={loadMutation.isPending || !organizationId}
              >
                {step === 1 && "Preview"}
                {step === 2 && ownerMode === "custom" && "Assign Owners"}
                {(step === 2 && ownerMode !== "custom") || step === 3 ? "Load KPIs" : ""}
                {loadMutation.isPending && "..."}
              </Button>
            </>
          )}
          {step === 4 && (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Alignment intercept modal */}
      <StayAlignedModal
        open={showAlignedModal}
        onClose={() => setShowAlignedModal(false)}
        onProceed={handleAlignedProceed}
        organizationId={organizationId}
      />
    </Dialog>
  );
}
