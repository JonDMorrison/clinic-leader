/**
 * InterventionEducationPanel - Premium education component explaining interventions
 * Redesigned with Linear/Stripe-inspired design patterns
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Brain,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  TrendingUp,
  Target,
  Zap,
} from "lucide-react";

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
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-2"
          >
            <p className="text-muted-foreground">
              <strong>Interventions</strong> are intentional changes your team makes to improve performance.
              When a metric shows something is off track, an intervention captures the solution you decided to try.
            </p>
            <p className="text-xs text-muted-foreground">
              <em>Tip:</em> Name interventions after the change you're testing, not the problem.
              <br />
              Example: "Referral Reactivation Campaign" instead of "Fix low referrals"
            </p>
          </motion.div>
        )}
      </div>
    );
  }

  // Compact variant - collapsible panel
  if (variant === "compact") {
    return (
      <div className={cn("border border-border/60 rounded-2xl bg-card shadow-sm", className)}>
        <button 
          className="w-full py-4 px-5 cursor-pointer flex items-center justify-between"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-sm font-medium flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-primary" />
            </div>
            Learn How Interventions Work
          </span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {expanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-5 pb-5"
          >
            <EducationContent showExample={showExample} compact />
          </motion.div>
        )}
      </div>
    );
  }

  // Full variant - complete education panel
  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "border border-border/60 rounded-2xl bg-card shadow-[0_4px_24px_-4px_hsl(var(--foreground)/0.06)]",
        "max-w-[880px] mx-auto",
        className
      )}
    >
      <div className="px-9 py-8">
        <EducationContent showExample={showExample} />
      </div>
    </motion.div>
  );
}

interface EducationContentProps {
  showExample?: boolean;
  compact?: boolean;
}

function EducationContent({ showExample = true, compact = false }: EducationContentProps) {
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);
  
  return (
    <div className={cn("space-y-7", compact && "space-y-5")}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <h2 className={cn(
            "font-semibold text-foreground",
            compact ? "text-xl" : "text-[28px] leading-tight"
          )}>
            What Are Interventions?
          </h2>
        </div>
        <div className="w-12 h-1 bg-primary/60 rounded-full ml-[52px] mt-2" />
      </motion.div>

      {/* Definition Section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-2">
          What Interventions Mean
        </p>
        <p className={cn(
          "text-muted-foreground leading-relaxed max-w-[640px]",
          compact ? "text-sm" : "text-[15px]"
        )}>
          <strong className="text-foreground">Interventions</strong> are intentional changes your team makes to improve performance.
          If a metric shows something is off track, an intervention captures the solution you decided to try.
        </p>
      </motion.div>

      {/* Workflow Visualization */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-4">
          How Interventions Fit Your Workflow
        </p>
        <WorkflowStepper 
          hoveredStep={hoveredStep} 
          onHover={setHoveredStep} 
          compact={compact}
        />
      </motion.div>

      {/* Why This Matters - Mini Cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
          Why This Matters
        </p>
        <div className={cn(
          "grid gap-3",
          compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3"
        )}>
          <ValueCard
            icon={TrendingUp}
            iconColor="text-primary"
            bgColor="bg-primary/5"
            title="From reacting to learning"
            description="Move from reacting to problems → learning from them"
          />
          <ValueCard
            icon={Target}
            iconColor="text-success"
            bgColor="bg-success/5"
            title="Measure effectiveness"
            description="Track the effectiveness of your decisions, not just activity"
          />
          <ValueCard
            icon={Brain}
            iconColor="text-accent-foreground"
            bgColor="bg-accent/30"
            title="Build intelligence"
            description="Accumulate organizational intelligence over time"
          />
        </div>
      </motion.div>

      {/* Example Workflow - Story Card */}
      {showExample && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
            Example Workflow
          </p>
          <ExampleStoryCard compact={compact} />
        </motion.div>
      )}

      {/* Tip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className={cn(
          "flex items-start gap-3 p-4 rounded-xl",
          "bg-warning/5 border border-warning/20"
        )}
      >
        <div className="w-6 h-6 rounded-lg bg-warning/10 flex items-center justify-center shrink-0 mt-0.5">
          <Lightbulb className="w-3.5 h-3.5 text-warning" />
        </div>
        <div className="text-sm">
          <p className="font-medium text-foreground mb-0.5">Naming tip</p>
          <p className="text-muted-foreground">
            Name interventions after the change you're testing, not the problem.
            <br />
            <span className="text-success">✓ "Referral Reactivation Campaign"</span>
            {" "}
            <span className="text-destructive">✗ "Fix low referrals"</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// Workflow Stepper Component
interface WorkflowStepperProps {
  hoveredStep: string | null;
  onHover: (step: string | null) => void;
  compact?: boolean;
}

const workflowSteps = [
  { 
    id: "scorecard", 
    label: "Scorecard", 
    icon: BarChart3, 
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-500/20",
    tooltip: "Track key metrics to detect performance changes"
  },
  { 
    id: "issues", 
    label: "Issues", 
    icon: AlertCircle, 
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-500/20",
    tooltip: "Surface and discuss problems that need solving"
  },
  { 
    id: "interventions", 
    label: "Interventions", 
    icon: Zap, 
    color: "bg-primary/15 text-primary",
    borderColor: "border-primary/40",
    tooltip: "Create intentional experiments to solve issues",
    primary: true
  },
  { 
    id: "outcomes", 
    label: "Outcomes", 
    icon: CheckCircle2, 
    color: "bg-success/10 text-success",
    borderColor: "border-success/20",
    tooltip: "Measure the results of your interventions"
  },
  { 
    id: "learning", 
    label: "Learning", 
    icon: Brain, 
    color: "bg-muted text-muted-foreground",
    borderColor: "border-border",
    tooltip: "Apply insights to future decisions"
  },
];

function WorkflowStepper({ hoveredStep, onHover, compact }: WorkflowStepperProps) {
  const isInterventionHovered = hoveredStep === "interventions";
  
  return (
    <TooltipProvider delayDuration={200}>
      {/* Desktop: Horizontal */}
      <div className={cn(
        "hidden sm:flex items-center justify-center gap-0",
        compact && "scale-90 origin-left"
      )}>
        {workflowSteps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  onMouseEnter={() => onHover(step.id)}
                  onMouseLeave={() => onHover(null)}
                  animate={{
                    scale: step.primary && !hoveredStep ? 1.05 : hoveredStep === step.id ? 1.08 : 1,
                    y: hoveredStep === step.id ? -2 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 cursor-pointer",
                    "transition-all duration-200"
                  )}
                >
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center border-2 transition-all duration-200",
                    step.color,
                    step.borderColor,
                    step.primary && "shadow-[0_0_20px_-4px_hsl(var(--primary)/0.3)]",
                    hoveredStep === step.id && "shadow-lg"
                  )}>
                    <step.icon className="w-6 h-6" />
                  </div>
                  <span className={cn(
                    "text-xs font-medium transition-colors",
                    step.primary ? "text-primary" : "text-muted-foreground",
                    hoveredStep === step.id && "text-foreground"
                  )}>
                    {step.label}
                  </span>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px] text-center">
                {step.tooltip}
              </TooltipContent>
            </Tooltip>
            
            {/* Connector Line */}
            {index < workflowSteps.length - 1 && (
              <div className="relative w-8 h-[2px] mx-1">
                <motion.div 
                  className="absolute inset-0 bg-border rounded-full"
                  animate={{
                    backgroundColor: isInterventionHovered && (index === 1 || index === 2) 
                      ? "hsl(var(--primary))" 
                      : "hsl(var(--border))"
                  }}
                  transition={{ duration: 0.3 }}
                />
                {/* Break visual at interventions node */}
                {index === 2 && (
                  <div className="absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-card rounded-full border-2 border-primary -top-[3px]" />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: Vertical Timeline */}
      <div className="sm:hidden flex flex-col gap-0 pl-2">
        {workflowSteps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-3">
            {/* Timeline line + node */}
            <div className="flex flex-col items-center">
              <motion.div
                animate={{
                  scale: step.primary ? 1.1 : 1,
                }}
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center border-2 shrink-0",
                  step.color,
                  step.borderColor,
                  step.primary && "shadow-[0_0_16px_-4px_hsl(var(--primary)/0.3)]"
                )}
              >
                <step.icon className="w-4 h-4" />
              </motion.div>
              {index < workflowSteps.length - 1 && (
                <div className="w-[2px] h-6 bg-border" />
              )}
            </div>
            {/* Label */}
            <div className="pt-2.5">
              <span className={cn(
                "text-sm font-medium",
                step.primary ? "text-primary" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}

// Value Card Component
interface ValueCardProps {
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  title: string;
  description: string;
}

function ValueCard({ icon: Icon, iconColor, bgColor, title, description }: ValueCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl",
        bgColor,
        "border border-border/40"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
        bgColor
      )}>
        <Icon className={cn("w-4 h-4", iconColor)} />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </motion.div>
  );
}

// Example Story Card Component
function ExampleStoryCard({ compact }: { compact?: boolean }) {
  const steps = [
    { 
      number: 1, 
      color: "bg-blue-500", 
      label: "Metric drops", 
      content: "New patient referrals down 15% this month" 
    },
    { 
      number: 2, 
      color: "bg-amber-500", 
      label: "Issue created", 
      content: "Low referral volume from primary care partners" 
    },
    { 
      number: 3, 
      color: "bg-primary", 
      label: "Intervention launched", 
      content: "Quarterly Referrer Appreciation Events" 
    },
    { 
      number: 4, 
      color: "bg-success", 
      label: "Outcome measured", 
      content: "+22% referrals after 60 days" 
    },
  ];

  return (
    <div className={cn(
      "relative rounded-xl overflow-hidden",
      "bg-muted/40 border border-border/60"
    )}>
      {/* Left accent stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
      
      <div className={cn("pl-6 pr-5 py-5", compact && "py-4")}>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.08 }}
              className="flex items-start gap-3 relative"
            >
              {/* Timeline line */}
              {index < steps.length - 1 && (
                <div className="absolute left-[11px] top-7 w-[2px] h-[calc(100%+8px)] bg-border" />
              )}
              
              {/* Number badge */}
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 relative z-10",
                step.color
              )}>
                {step.number}
              </div>
              
              {/* Content */}
              <div className="pt-0.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {step.label}
                </p>
                <p className={cn(
                  "text-foreground mt-0.5",
                  compact ? "text-sm" : "text-[15px]"
                )}>
                  {step.content}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Standalone text for outcome mindset
export function OutcomeMindsetBanner({ className }: { className?: string }) {
  return (
    <div className={cn(
      "text-sm text-muted-foreground bg-muted/50 border rounded-xl p-4 flex items-start gap-3",
      className
    )}>
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Brain className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="font-medium text-foreground mb-1">Interventions are experiments</p>
        <p>Success and failure both create learning. What matters is measuring the outcome and applying insights to future decisions.</p>
      </div>
    </div>
  );
}
