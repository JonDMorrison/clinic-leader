/**
 * InterventionWorkflowBanner - Header banner for the Interventions landing page
 * Provides context and links to education
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Zap, 
  ArrowRight, 
  GraduationCap,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Brain,
  X,
} from "lucide-react";
import { InterventionEducationPanel } from "./InterventionEducationPanel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WhyAmISeeingThisDialog, WhyAmISeeingThisLink } from "@/components/shared/WhyAmISeeingThisDialog";
interface InterventionWorkflowBannerProps {
  onDismiss?: () => void;
  dismissible?: boolean;
}

export function InterventionWorkflowBanner({ 
  onDismiss,
  dismissible = false,
}: InterventionWorkflowBannerProps) {
  const [educationOpen, setEducationOpen] = useState(false);
  const [whyDialogOpen, setWhyDialogOpen] = useState(false);

  return (
    <>
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {/* Header Text */}
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Track Your Team's Solutions</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Interventions capture the changes your team implements to improve results. 
                They help you measure which decisions actually move performance.
              </p>

              {/* Workflow Timeline */}
              <div className="flex items-center gap-1 flex-wrap mb-3">
                <WorkflowPill icon={AlertCircle} label="Problem Detected" color="amber" />
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <WorkflowPill icon={Zap} label="Intervention Created" color="purple" active />
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <WorkflowPill icon={CheckCircle2} label="Outcome Evaluated" color="green" />
              </div>

              {/* Learn More Button + Why Link */}
              <div className="flex items-center gap-4 flex-wrap">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEducationOpen(true)}
                  className="gap-2"
                >
                  <GraduationCap className="h-4 w-4" />
                  Learn How Interventions Work
                </Button>
                <WhyAmISeeingThisLink onClick={() => setWhyDialogOpen(true)} />
              </div>
            </div>

            {dismissible && onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={onDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Education Dialog */}
      <Dialog open={educationOpen} onOpenChange={setEducationOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Understanding Interventions
            </DialogTitle>
          </DialogHeader>
          <InterventionEducationPanel variant="full" />
        </DialogContent>
      </Dialog>

      {/* Why Am I Seeing This Dialog */}
      <WhyAmISeeingThisDialog
        open={whyDialogOpen}
        onClose={() => setWhyDialogOpen(false)}
        context="intervention-prompt"
      />
    </>
  );
}

interface WorkflowPillProps {
  icon: React.ElementType;
  label: string;
  color: "amber" | "purple" | "green";
  active?: boolean;
}

function WorkflowPill({ icon: Icon, label, color, active }: WorkflowPillProps) {
  const colorClasses = {
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
    green: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
  };

  return (
    <div 
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium
        ${colorClasses[color]}
        ${active ? "ring-2 ring-purple-400 ring-offset-1" : ""}
      `}
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </div>
  );
}
