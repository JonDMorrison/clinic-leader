/**
 * BaselineWarningBanner - Displays warning for iffy/bad baselines with override option
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, XCircle, Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { BaselineQualityFlag } from "@/lib/interventions/baselineValidation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BaselineWarningBannerProps {
  linkId: string;
  interventionId: string;
  metricName: string;
  flag: BaselineQualityFlag;
  reasons?: string[];
  existingJustification?: string | null;
  canOverride?: boolean;
}

export function BaselineWarningBanner({
  linkId,
  interventionId,
  metricName,
  flag,
  reasons = [],
  existingJustification,
  canOverride = true,
}: BaselineWarningBannerProps) {
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [justification, setJustification] = useState(existingJustification || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const overrideMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("intervention_metric_links")
        .update({
          baseline_quality_flag: "good",
          baseline_override_justification: justification.trim(),
        })
        .eq("id", linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intervention-metrics", interventionId] });
      toast({
        title: "Baseline override applied",
        description: "Quality flag updated with your justification.",
      });
      setOverrideDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Override failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Don't show banner for good baselines
  if (flag === "good") return null;

  const isIffy = flag === "iffy";
  const Icon = isIffy ? AlertTriangle : XCircle;
  const title = isIffy ? "Uncertain Baseline" : "Unreliable Baseline";
  const variant = isIffy ? "default" : "destructive";

  return (
    <>
      <Alert variant={variant} className="mb-4">
        <Icon className="h-4 w-4" />
        <AlertTitle>{title} for {metricName}</AlertTitle>
        <AlertDescription className="mt-2">
          <ul className="list-disc list-inside text-sm space-y-1">
            {reasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>

          {existingJustification ? (
            <div className="mt-3 p-2 bg-muted rounded text-sm">
              <p className="font-medium flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Override Justification:
              </p>
              <p className="mt-1 text-muted-foreground">{existingJustification}</p>
            </div>
          ) : canOverride ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setOverrideDialogOpen(true)}
            >
              <Shield className="mr-1.5 h-3.5 w-3.5" />
              Override with Justification
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>

      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Baseline Quality</DialogTitle>
            <DialogDescription>
              Provide a justification for why this baseline should be considered reliable despite the automated quality check.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Current Issues:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </div>

            <Textarea
              placeholder="Explain why you believe this baseline is reliable..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => overrideMutation.mutate()}
              disabled={justification.trim().length < 10 || overrideMutation.isPending}
            >
              {overrideMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
