/**
 * InterventionSignalsPanel - Meeting panel showing intervention status signals
 * 
 * Displays:
 * - At-Risk Interventions
 * - Overdue Interventions  
 * - Recently Successful Interventions
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Zap,
  TrendingUp,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useInterventionMeetingSignals } from "@/hooks/useInterventionMeetingSignals";
import type { InterventionSignal } from "@/lib/interventions/meetingSignals";

interface InterventionSignalsPanelProps {
  organizationId: string;
  collapsed?: boolean;
}

function SignalRow({ signal, variant }: { signal: InterventionSignal; variant: "overdue" | "at_risk" | "success" }) {
  const variantStyles = {
    overdue: "border-l-destructive bg-destructive/5",
    at_risk: "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10",
    success: "border-l-green-500 bg-green-50 dark:bg-green-900/10",
  };

  const variantIcons = {
    overdue: <Clock className="h-4 w-4 text-destructive" />,
    at_risk: <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />,
    success: <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />,
  };

  return (
    <Link to={`/interventions/${signal.id}`}>
      <div className={`border-l-4 rounded-r-lg p-3 hover:bg-accent/50 transition-colors ${variantStyles[variant]}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {variantIcons[variant]}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{signal.title}</p>
              <div className="flex items-center gap-2 mt-1">
                {signal.primaryMetricName && (
                  <Badge variant="outline" className="text-[10px]">
                    {signal.primaryMetricName}
                  </Badge>
                )}
                {signal.progress.days_remaining !== 0 && variant !== "success" && (
                  <span className="text-xs text-muted-foreground">
                    {signal.progress.days_remaining < 0 
                      ? `${Math.abs(signal.progress.days_remaining)}d overdue`
                      : `${signal.progress.days_remaining}d remaining`
                    }
                  </span>
                )}
                {variant === "success" && signal.deltaPercent !== undefined && (
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-0.5">
                    <TrendingUp className="h-3 w-3" />
                    +{signal.deltaPercent.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
      </div>
    </Link>
  );
}

export function InterventionSignalsPanel({ 
  organizationId, 
  collapsed: initialCollapsed = false 
}: InterventionSignalsPanelProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  
  const { data: signals, isLoading } = useInterventionMeetingSignals({
    organizationId,
    enabled: true,
  });

  const hasSignals = signals && (
    signals.overdue_interventions.length > 0 ||
    signals.at_risk_interventions.length > 0 ||
    signals.newly_successful_interventions.length > 0
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!signals || !hasSignals) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Intervention Signals
            <Badge variant="outline">
              {signals.overdue_interventions.length + signals.at_risk_interventions.length + signals.newly_successful_interventions.length}
            </Badge>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 p-0"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      
      {!collapsed && (
        <CardContent className="space-y-4">
          {/* Overdue Section */}
          {signals.overdue_interventions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-destructive uppercase tracking-wide">
                Overdue ({signals.overdue_interventions.length})
              </p>
              {signals.overdue_interventions.map((signal) => (
                <SignalRow key={signal.id} signal={signal} variant="overdue" />
              ))}
            </div>
          )}

          {/* At-Risk Section */}
          {signals.at_risk_interventions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">
                At Risk ({signals.at_risk_interventions.length})
              </p>
              {signals.at_risk_interventions.map((signal) => (
                <SignalRow key={signal.id} signal={signal} variant="at_risk" />
              ))}
            </div>
          )}

          {/* Recently Successful Section */}
          {signals.newly_successful_interventions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
                Recently Successful ({signals.newly_successful_interventions.length})
              </p>
              {signals.newly_successful_interventions.map((signal) => (
                <SignalRow key={signal.id} signal={signal} variant="success" />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
