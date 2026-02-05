/**
 * SmartInterventionSuggestionBanner
 * 
 * Shows a suggestion when the detection engine identifies patterns
 * that indicate an intervention is being implemented.
 * 
 * Actions: Confirm, Edit, Dismiss
 * Never auto-creates - always requires user confirmation.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sparkles,
  X,
  Check,
  Edit,
  ChevronDown,
  ChevronUp,
  ListTodo,
  TrendingUp,
  Settings,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { 
  DetectedIntervention, 
  DetectionSignalType 
} from "@/lib/interventions/assistedInterventionDetection";

interface SmartInterventionSuggestionBannerProps {
  detection: DetectedIntervention;
  onConfirm: (detection: DetectedIntervention) => void;
  onEdit: (detection: DetectedIntervention) => void;
  onDismiss: (detectionId: string) => void;
  isProcessing?: boolean;
}

const SIGNAL_TYPE_CONFIG: Record<DetectionSignalType, {
  icon: typeof ListTodo;
  label: string;
  color: string;
  description: string;
}> = {
  todo_cluster: {
    icon: ListTodo,
    label: "To-Do Cluster",
    color: "text-blue-600",
    description: "Multiple action items targeting the same metric",
  },
  metric_slope_change: {
    icon: TrendingUp,
    label: "Trend Change",
    color: "text-green-600",
    description: "Significant metric trend shift after activity",
  },
  emr_config_change: {
    icon: Settings,
    label: "Config Change",
    color: "text-purple-600",
    description: "EMR configuration or workflow update",
  },
};

export function SmartInterventionSuggestionBanner({
  detection,
  onConfirm,
  onEdit,
  onDismiss,
  isProcessing = false,
}: SmartInterventionSuggestionBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const config = SIGNAL_TYPE_CONFIG[detection.signalType];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 overflow-hidden">
        <CardContent className="py-3 px-4">
          <div className="flex items-start justify-between gap-3">
            {/* Icon and Content */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">
                    It looks like you're implementing a change
                  </p>
                  <Badge variant="secondary" className="gap-1">
                    <Icon className={cn("h-3 w-3", config.color)} />
                    {config.label}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {detection.confidence}% confidence
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {detection.suggestedTitle}
                  {detection.metricName && (
                    <span className="text-foreground font-medium">
                      {" "}— targeting {detection.metricName}
                    </span>
                  )}
                </p>

                {/* Expandable Details */}
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pt-2 space-y-2"
                    >
                      <p className="text-xs text-muted-foreground">
                        {detection.suggestedDescription}
                      </p>
                      
                      {/* Context Details */}
                      <div className="p-2 rounded-lg bg-background/50 border text-xs">
                        <DetectionContextDetails detection={detection} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Expand Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Less details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      View details
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDismiss(detection.id)}
                      disabled={isProcessing}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Dismiss this suggestion</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(detection)}
                disabled={isProcessing}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>

              <Button
                size="sm"
                onClick={() => onConfirm(detection)}
                disabled={isProcessing}
              >
                <Check className="h-4 w-4 mr-1" />
                Track as Intervention
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Detection Context Details Component
 */
function DetectionContextDetails({ detection }: { detection: DetectedIntervention }) {
  const { detectionContext } = detection;

  switch (detection.signalType) {
    case "todo_cluster":
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <ListTodo className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">
              {detectionContext.todoCount} related to-dos
            </span>
            <span className="text-muted-foreground">
              over {detectionContext.clusterSpanDays} days
            </span>
          </div>
          {detectionContext.todoTitles && (
            <div className="flex flex-wrap gap-1 mt-1">
              {detectionContext.todoTitles.slice(0, 4).map((title, i) => (
                <Badge key={i} variant="outline" className="text-[10px] max-w-[180px] truncate">
                  {title}
                </Badge>
              ))}
              {(detectionContext.todoTitles.length || 0) > 4 && (
                <Badge variant="outline" className="text-[10px]">
                  +{(detectionContext.todoTitles.length || 0) - 4} more
                </Badge>
              )}
            </div>
          )}
        </div>
      );

    case "metric_slope_change":
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">
              {detectionContext.slopeChangePct}% trend change detected
            </span>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span>
              Before: {detectionContext.preActivitySlope?.toFixed(2) || "—"}
            </span>
            <span>→</span>
            <span>
              After: {detectionContext.postActivitySlope?.toFixed(2) || "—"}
            </span>
          </div>
          {detectionContext.activityDate && (
            <p className="text-muted-foreground">
              Change detected after {detectionContext.activityTrigger} activity on{" "}
              {new Date(detectionContext.activityDate).toLocaleDateString()}
            </p>
          )}
        </div>
      );

    case "emr_config_change":
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Settings className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">
              {formatConfigType(detectionContext.configType || "")}
            </span>
          </div>
          {detectionContext.changeDescription && (
            <p className="text-muted-foreground">
              {detectionContext.changeDescription}
            </p>
          )}
          {detectionContext.changedAt && (
            <p className="text-muted-foreground">
              Detected on {new Date(detectionContext.changedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      );

    default:
      return null;
  }
}

function formatConfigType(type: string): string {
  return type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
