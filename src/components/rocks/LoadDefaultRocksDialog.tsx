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
import { Input } from "@/components/ui/input";
import { Target, Users, CheckCircle2, ListTodo } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { loadDefaultRocks, previewDefaultRocks } from "@/lib/rocks/loader";
import { getBundleOptions, getCurrentQuarter } from "@/lib/rocks/templates";
import { PreviewRockStep } from "./PreviewRockStep";
import { QuickAssignRockOwners } from "./QuickAssignRockOwners";

interface LoadDefaultRocksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export function LoadDefaultRocksDialog({ open, onOpenChange, organizationId }: LoadDefaultRocksDialogProps) {
  const [step, setStep] = useState(1);
  const [includeBundles, setIncludeBundles] = useState<string[]>([]);
  const [ownerStrategy, setOwnerStrategy] = useState<"auto" | "me" | "manual">("auto");
  const [quarter, setQuarter] = useState(getCurrentQuarter());
  const [ownerMap, setOwnerMap] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<any>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  
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

  const bundleOptions = getBundleOptions("clinic_eos_default");

  const loadMutation = useMutation({
    mutationFn: async () => {
      return loadDefaultRocks({
        organizationId,
        templateKey: "clinic_eos_default",
        includeBundles,
        ownerStrategy,
        ownerMap,
        quarter,
        createdBy: currentUser?.id
      });
    },
    onSuccess: (result) => {
      if (result.success) {
        setBatchId(result.batchId || null);
        toast({
          title: "Rocks Loaded",
          description: `Created ${result.createdCount} Rocks for ${quarter}${result.skippedTitles.length > 0 ? `, skipped ${result.skippedTitles.length} existing` : ""}.`,
        });
        queryClient.invalidateQueries({ queryKey: ["rocks"] });
        setStep(4);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load Rocks",
          variant: "destructive",
        });
      }
    },
  });

  const handleNext = async () => {
    if (step === 1) {
      // Load preview
      const previewData = await previewDefaultRocks({
        organizationId,
        templateKey: "clinic_eos_default",
        includeBundles,
        ownerStrategy,
        quarter
      });
      setPreview(previewData);
      setStep(2);
    } else if (step === 2 && ownerStrategy === "manual") {
      setStep(3);
    } else if (step === 2 || step === 3) {
      loadMutation.mutate();
    }
  };

  const handleClose = () => {
    setStep(1);
    setIncludeBundles([]);
    setOwnerStrategy("auto");
    setQuarter(getCurrentQuarter());
    setOwnerMap({});
    setPreview(null);
    setBatchId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Load Default Rocks (EOS)
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Configure your Rock defaults"}
            {step === 2 && "Preview what will be created"}
            {step === 3 && "Assign owners per level"}
            {step === 4 && "Next steps"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Quarter</Label>
              <Input
                value={quarter}
                onChange={(e) => setQuarter(e.target.value)}
                placeholder="Q1 2025"
              />
              <p className="text-xs text-muted-foreground">
                Due dates will be set to the end of this quarter
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Optional Bundles</Label>
              <p className="text-sm text-muted-foreground">
                Add specialized Rocks beyond the core set
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
                      {bundle.label} <span className="text-muted-foreground">({bundle.count} Rocks)</span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Owner Assignment</Label>
              <RadioGroup value={ownerStrategy} onValueChange={(v: any) => setOwnerStrategy(v)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="auto" id="auto" />
                  <Label htmlFor="auto" className="cursor-pointer">
                    Auto-assign by role <span className="text-muted-foreground">(recommended)</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="me" id="me" />
                  <Label htmlFor="me" className="cursor-pointer">
                    Assign all to me
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id="manual" />
                  <Label htmlFor="manual" className="cursor-pointer">
                    Pick per level (Company/Team/Individual)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}

        {step === 2 && preview && (
          <PreviewRockStep preview={preview} quarter={quarter} />
        )}

        {step === 3 && (
          <QuickAssignRockOwners
            organizationId={organizationId}
            owners={ownerMap}
            onOwnersChange={setOwnerMap}
          />
        )}

        {step === 4 && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Rocks loaded successfully for {quarter}!</span>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Your Rocks are ready. Assign To-Dos from each Rock as you make progress.
              </p>
              
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    handleClose();
                    window.location.href = "/scorecard";
                  }}
                >
                  <ListTodo className="h-4 w-4 mr-2" />
                  Go to Scorecard
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    handleClose();
                    window.location.href = "/l10";
                  }}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Open Meeting Agenda
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step < 4 && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleNext} disabled={loadMutation.isPending}>
                {step === 1 && "Preview"}
                {step === 2 && ownerStrategy === "manual" && "Assign Owners"}
                {((step === 2 && ownerStrategy !== "manual") || step === 3) && "Load Rocks"}
                {loadMutation.isPending && "..."}
              </Button>
            </>
          )}
          {step === 4 && (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
