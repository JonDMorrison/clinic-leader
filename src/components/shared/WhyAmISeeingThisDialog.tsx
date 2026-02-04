/**
 * WhyAmISeeingThisDialog - Explainability dialog for EOS enforcement prompts
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  HelpCircle, 
  BarChart3, 
  AlertCircle, 
  Beaker, 
  Users,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

interface WhyAmISeeingThisDialogProps {
  open: boolean;
  onClose: () => void;
  context?: "issue-resolution" | "meeting-commitment" | "intervention-prompt" | "general";
}

export function WhyAmISeeingThisDialog({ 
  open, 
  onClose,
  context = "general" 
}: WhyAmISeeingThisDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Why Am I Seeing This?
          </DialogTitle>
          <DialogDescription>
            Understanding the EOS execution loop
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* EOS Loop Visualization */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 gap-2 flex-wrap">
            <LoopStep 
              icon={BarChart3} 
              label="Scorecard" 
              description="Track numbers"
              active={context === "general"}
            />
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            <LoopStep 
              icon={AlertCircle} 
              label="Issues" 
              description="Surface problems"
              active={context === "issue-resolution"}
            />
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            <LoopStep 
              icon={Beaker} 
              label="Interventions" 
              description="Test solutions"
              active={context === "intervention-prompt"}
            />
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            <LoopStep 
              icon={Users} 
              label="Meetings" 
              description="Review results"
              active={context === "meeting-commitment"}
            />
          </div>

          {/* Context-specific explanation */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">The Problem We're Solving</h4>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Resolved issues without execution creates drift.</strong>{" "}
              When teams mark issues as "solved" without creating interventions, they lose the 
              ability to measure whether decisions actually worked.
            </p>

            <h4 className="font-medium text-sm pt-2">Why Interventions Matter</h4>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Interventions are how we measure whether a decision worked.</strong>{" "}
              By linking solutions to metrics, you can objectively evaluate impact and learn 
              which types of changes drive real improvement.
            </p>

            {context === "issue-resolution" && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm">
                  <strong>This prompt appears</strong> because you're resolving an issue. 
                  Creating an intervention ensures your solution is tracked and measured.
                </p>
              </div>
            )}

            {context === "meeting-commitment" && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm">
                  <strong>This prompt appears</strong> because your meeting has open 
                  intervention signals. Acknowledging them ensures accountability.
                </p>
              </div>
            )}
          </div>

          {/* Key benefit */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/30">
            <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
            <p className="text-sm">
              Teams using this workflow see <strong>3x higher execution rates</strong> and 
              can objectively prove which initiatives drove results.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Got it</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface LoopStepProps {
  icon: React.ElementType;
  label: string;
  description: string;
  active?: boolean;
}

function LoopStep({ icon: Icon, label, description, active }: LoopStepProps) {
  return (
    <div className={`text-center ${active ? "text-primary" : "text-muted-foreground"}`}>
      <Icon className={`w-5 h-5 mx-auto mb-1 ${active ? "text-primary" : ""}`} />
      <p className={`text-xs font-medium ${active ? "text-primary" : ""}`}>{label}</p>
      <p className="text-[10px] hidden sm:block">{description}</p>
    </div>
  );
}

/**
 * Simple link trigger for opening the dialog
 */
interface WhyAmISeeingThisLinkProps {
  onClick: () => void;
  className?: string;
}

export function WhyAmISeeingThisLink({ onClick, className = "" }: WhyAmISeeingThisLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 inline-flex items-center gap-1 ${className}`}
    >
      <HelpCircle className="w-3 h-3" />
      Why am I seeing this?
    </button>
  );
}
