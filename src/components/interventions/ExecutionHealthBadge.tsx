/**
 * ExecutionHealthBadge - Visual indicator of intervention execution health
 */

import { Badge } from "@/components/ui/badge";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Activity, CheckCircle2, Clock, Users } from "lucide-react";
import { 
  getHealthScoreLabel, 
  getHealthScoreVariant,
  type ExecutionHealthMetrics 
} from "@/lib/interventions/executionHealthScore";

interface ExecutionHealthBadgeProps {
  score: number;
  metrics?: ExecutionHealthMetrics;
  showDetails?: boolean;
}

export function ExecutionHealthBadge({ 
  score, 
  metrics, 
  showDetails = false 
}: ExecutionHealthBadgeProps) {
  const variant = getHealthScoreVariant(score);
  const label = getHealthScoreLabel(score);

  const badge = (
    <Badge 
      variant={variant}
      className="gap-1"
    >
      <Activity className="h-3 w-3" />
      {score}%
    </Badge>
  );

  if (!showDetails && !metrics) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent className="w-64 p-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Execution Health</span>
              <span className="text-sm">{label}</span>
            </div>
            
            <Progress value={score} className="h-2" />

            {metrics && (
              <div className="space-y-2 pt-2 border-t text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3" />
                    On-time completion
                  </span>
                  <span className="font-medium">{metrics.todoCompletionRate}%</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Rollover rate
                  </span>
                  <span className="font-medium">{metrics.todoRolloverRate}%</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3 w-3" />
                    Unassigned rate
                  </span>
                  <span className="font-medium">{metrics.assignmentChurnRate}%</span>
                </div>

                <div className="pt-2 border-t text-muted-foreground">
                  {metrics.totalTodos} total • {metrics.completedTodos} completed • {metrics.overdueTodos} overdue
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
