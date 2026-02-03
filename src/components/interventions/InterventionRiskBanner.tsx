/**
 * Risk Banner for Intervention Detail Page
 * Shows warning banners for at-risk or overdue interventions
 */

import { AlertTriangle, Clock, TrendingUp, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { InterventionProgress, ProgressStatus } from "@/lib/interventions/interventionStatus";
import { format } from "date-fns";

interface InterventionRiskBannerProps {
  progress: InterventionProgress;
}

export function InterventionRiskBanner({ progress }: InterventionRiskBannerProps) {
  const { status, days_remaining, horizon_end_date, has_any_outcomes, has_any_positive_delta, reason } = progress;

  if (status === "overdue") {
    return (
      <Alert className="border-red-500/50 bg-red-50 dark:bg-red-950/30">
        <Clock className="h-4 w-4 text-red-600 dark:text-red-400" />
        <AlertTitle className="text-red-800 dark:text-red-300">
          This intervention is overdue
        </AlertTitle>
        <AlertDescription className="text-red-700 dark:text-red-400">
          The expected time horizon ended on {format(horizon_end_date, "MMM d, yyyy")} 
          ({Math.abs(days_remaining)} days ago) and no outcomes have been evaluated. 
          Consider running an evaluation or marking the intervention as completed/abandoned.
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "at_risk") {
    return (
      <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/30">
        <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        <AlertTitle className="text-yellow-800 dark:text-yellow-300">
          This intervention is at risk
        </AlertTitle>
        <AlertDescription className="text-yellow-700 dark:text-yellow-400">
          Only {days_remaining} days remain until {format(horizon_end_date, "MMM d, yyyy")} 
          {!has_any_outcomes && " and no outcomes have been evaluated yet"}
          {has_any_outcomes && !has_any_positive_delta && " and no positive improvement has been detected"}
          . Consider evaluating outcomes or adjusting the intervention strategy.
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "on_track") {
    return (
      <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/30">
        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-800 dark:text-green-300">
          This intervention is on track
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-400">
          Positive improvement has been detected in linked metrics. 
          {days_remaining > 0 
            ? ` ${days_remaining} days remaining until ${format(horizon_end_date, "MMM d, yyyy")}.`
            : " The intervention has passed its expected horizon."
          }
        </AlertDescription>
      </Alert>
    );
  }

  // Don't show banner for planned, active, completed, or abandoned
  return null;
}
