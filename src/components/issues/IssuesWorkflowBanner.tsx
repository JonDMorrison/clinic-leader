/**
 * IssuesWorkflowBanner - Educational banner explaining the IDS → Intervention workflow
 */

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  MessageSquare, 
  CheckCircle2, 
  Zap,
  ArrowRight,
  X,
  Lightbulb,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "issues-workflow-banner-dismissed";

interface IssuesWorkflowBannerProps {
  className?: string;
}

export function IssuesWorkflowBanner({ className }: IssuesWorkflowBannerProps) {
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={className}
      >
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">How Issues Work (IDS)</h3>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  <strong>IDS</strong> = Identify, Discuss, Solve. When you solve an issue, 
                  create an <strong>Intervention</strong> to track whether your solution actually works.
                </p>

                {/* Workflow Steps */}
                <div className="flex items-center gap-1 flex-wrap">
                  <WorkflowStep 
                    icon={Search} 
                    label="Identify" 
                    description="Find the root cause"
                    color="blue"
                  />
                  <ArrowRight className="h-3 w-3 text-muted-foreground hidden sm:block" />
                  <WorkflowStep 
                    icon={MessageSquare} 
                    label="Discuss" 
                    description="Explore solutions"
                    color="amber"
                  />
                  <ArrowRight className="h-3 w-3 text-muted-foreground hidden sm:block" />
                  <WorkflowStep 
                    icon={CheckCircle2} 
                    label="Solve" 
                    description="Decide on action"
                    color="green"
                  />
                  <ArrowRight className="h-3 w-3 text-muted-foreground hidden sm:block" />
                  <WorkflowStep 
                    icon={Zap} 
                    label="Intervention" 
                    description="Track the outcome"
                    color="purple"
                    highlighted
                  />
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleDismiss}
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

interface WorkflowStepProps {
  icon: React.ElementType;
  label: string;
  description: string;
  color: "blue" | "amber" | "green" | "purple";
  highlighted?: boolean;
}

function WorkflowStep({ icon: Icon, label, description, color, highlighted }: WorkflowStepProps) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    green: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  };

  return (
    <div 
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium
        ${colorClasses[color]}
        ${highlighted ? "ring-2 ring-purple-400 ring-offset-1 ring-offset-background" : ""}
      `}
      title={description}
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </div>
  );
}
