/**
 * InterventionEducationPanel - Education component explaining what interventions are
 * and how they fit into the EOS execution workflow
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Lightbulb, 
  ArrowRight, 
  TrendingUp, 
  AlertCircle, 
  Beaker, 
  CheckCircle2,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InterventionEducationPanelProps {
  variant?: "full" | "compact" | "inline";
  showExample?: boolean;
  className?: string;
}

export function InterventionEducationPanel({ 
  variant = "full",
  showExample = true,
  className,
}: InterventionEducationPanelProps) {
  const [expanded, setExpanded] = useState(variant === "full");

  // Inline variant - minimal helper text with expandable content
  if (variant === "inline") {
    return (
      <div className={cn("text-sm", className)}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-primary hover:underline"
        >
          <Lightbulb className="h-3.5 w-3.5" />
          What is an intervention?
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {expanded && (
          <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
            <p className="text-muted-foreground">
              <strong>Interventions</strong> are intentional changes your team makes to improve performance.
              When a metric shows something is off track, an intervention captures the solution you decided to try.
            </p>
            <p className="text-xs text-muted-foreground">
              <em>Tip:</em> Name interventions after the change you're testing, not the problem.
              <br />
              Example: "Referral Reactivation Campaign" instead of "Fix low referrals"
            </p>
          </div>
        )}
      </div>
    );
  }

  // Compact variant - collapsible panel
  if (variant === "compact") {
    return (
      <Card className={cn("border-primary/20 bg-primary/5", className)}>
        <CardHeader className="py-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Learn How Interventions Work
            </span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CardTitle>
        </CardHeader>
        {expanded && (
          <CardContent className="pt-0 pb-4">
            <EducationContent showExample={showExample} compact />
          </CardContent>
        )}
      </Card>
    );
  }

  // Full variant - complete education panel
  return (
    <Card className={cn("border-primary/20", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          What Are Interventions?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <EducationContent showExample={showExample} />
      </CardContent>
    </Card>
  );
}

interface EducationContentProps {
  showExample?: boolean;
  compact?: boolean;
}

function EducationContent({ showExample = true, compact = false }: EducationContentProps) {
  return (
    <div className={cn("space-y-6", compact && "space-y-4")}>
      {/* Section 1 - Definition */}
      <div>
        <h4 className={cn("font-semibold mb-2 flex items-center gap-2", compact && "text-sm")}>
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Plain Language Definition
        </h4>
        <p className={cn("text-muted-foreground", compact && "text-sm")}>
          <strong>Interventions</strong> are intentional changes your team makes to improve performance.
          If a metric shows something is off track, an intervention captures the solution you decided to try.
        </p>
      </div>

      {/* Section 2 - How Interventions Fit */}
      <div>
        <h4 className={cn("font-semibold mb-3 flex items-center gap-2", compact && "text-sm")}>
          <ArrowRight className="h-4 w-4 text-primary" />
          How Interventions Fit Your Workflow
        </h4>
        <div className="flex items-center justify-center gap-1 flex-wrap">
          <WorkflowStep icon={BarChart3} label="Scorecard" color="blue" />
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <WorkflowStep icon={AlertCircle} label="Issues" color="amber" />
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <WorkflowStep icon={Beaker} label="Interventions" color="purple" active />
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <WorkflowStep icon={CheckCircle2} label="Outcomes" color="green" />
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <WorkflowStep icon={Brain} label="Learning" color="indigo" />
        </div>
      </div>

      {/* Section 3 - Why This Matters */}
      <div>
        <h4 className={cn("font-semibold mb-2 flex items-center gap-2", compact && "text-sm")}>
          <TrendingUp className="h-4 w-4 text-green-500" />
          Why This Matters
        </h4>
        <ul className={cn("space-y-1.5 text-muted-foreground", compact && "text-sm")}>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            <span>Move from <strong>reacting</strong> to problems → <strong>learning</strong> from them</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            <span>Measure <strong>effectiveness</strong> of your decisions, not just activity</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            <span>Build <strong>organizational intelligence</strong> over time</span>
          </li>
        </ul>
      </div>

      {/* Section 4 - Example */}
      {showExample && (
        <div className="rounded-lg bg-muted/50 p-4 border">
          <h4 className={cn("font-semibold mb-3 flex items-center gap-2", compact && "text-sm")}>
            <Beaker className="h-4 w-4 text-purple-500" />
            Example Workflow
          </h4>
          <div className={cn("space-y-2 text-muted-foreground", compact && "text-sm")}>
            <div className="flex items-start gap-2">
              <span className="bg-blue-500 text-white text-xs font-medium px-2 py-0.5 rounded shrink-0">1</span>
              <span><strong>Metric drops:</strong> New patient referrals down 15% this month</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-amber-500 text-white text-xs font-medium px-2 py-0.5 rounded shrink-0">2</span>
              <span><strong>Issue created:</strong> "Low referral volume from primary care partners"</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-purple-500 text-white text-xs font-medium px-2 py-0.5 rounded shrink-0">3</span>
              <span><strong>Intervention launched:</strong> "Quarterly Referrer Appreciation Events"</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-green-500 text-white text-xs font-medium px-2 py-0.5 rounded shrink-0">4</span>
              <span><strong>Outcome measured:</strong> +22% referrals after 60 days</span>
            </div>
          </div>
        </div>
      )}

      {/* Tip */}
      <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <strong className="text-amber-700 dark:text-amber-300">💡 Tip:</strong> Name interventions after the change you're testing, not the problem.
        <br />
        <span className="text-amber-600 dark:text-amber-400">
          ✓ "Referral Reactivation Campaign" &nbsp;✗ "Fix low referrals"
        </span>
      </div>
    </div>
  );
}

interface WorkflowStepProps {
  icon: React.ElementType;
  label: string;
  color: "blue" | "amber" | "purple" | "green" | "indigo";
  active?: boolean;
}

function WorkflowStep({ icon: Icon, label, color, active }: WorkflowStepProps) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
    green: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
    indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
  };

  return (
    <div 
      className={cn(
        "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
        colorClasses[color],
        active && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

// Standalone text for outcome mindset
export function OutcomeMindsetBanner({ className }: { className?: string }) {
  return (
    <div className={cn(
      "text-sm text-muted-foreground bg-muted/50 border rounded-lg p-4 flex items-start gap-3",
      className
    )}>
      <Brain className="h-5 w-5 text-primary shrink-0 mt-0.5" />
      <div>
        <p className="font-medium text-foreground mb-1">Interventions are experiments</p>
        <p>Success and failure both create learning. What matters is measuring the outcome and applying insights to future decisions.</p>
      </div>
    </div>
  );
}
