/**
 * PlaybookCard - Display a single playbook with actions
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Archive,
  Clock,
  TrendingUp,
  AlertTriangle,
  ListChecks,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Playbook, PlaybookStep, RiskFlag } from "@/lib/interventions/playbookGenerator";

interface PlaybookCardProps {
  playbook: Playbook;
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
  onArchive?: (id: string) => void;
  onUse?: (playbook: Playbook) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
  showActions?: boolean;
  compact?: boolean;
}

const STATUS_CONFIG = {
  draft: { label: "Draft", variant: "outline" as const, icon: BookOpen },
  pending_approval: { label: "Pending Approval", variant: "secondary" as const, icon: Clock },
  approved: { label: "Approved", variant: "default" as const, icon: CheckCircle2 },
  archived: { label: "Archived", variant: "outline" as const, icon: Archive },
};

export function PlaybookCard({
  playbook,
  onApprove,
  onReject,
  onArchive,
  onUse,
  isApproving,
  isRejecting,
  showActions = true,
  compact = false,
}: PlaybookCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const statusConfig = STATUS_CONFIG[playbook.status];
  const StatusIcon = statusConfig.icon;
  const successPct = Math.round(playbook.successRate * 100);

  const handleReject = () => {
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    if (rejectReason.trim() && onReject) {
      onReject(playbook.id, rejectReason);
      setShowRejectInput(false);
      setRejectReason("");
    }
  };

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-medium text-sm truncate">{playbook.title}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {playbook.summary}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {successPct}% success
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {playbook.sampleSize} cases
                </span>
              </div>
            </div>
            {onUse && playbook.status === "approved" && (
              <Button size="sm" variant="outline" onClick={() => onUse(playbook)}>
                Use
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">{playbook.title}</CardTitle>
              {playbook.isAnonymized && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="text-[10px]">
                        Cross-Org
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      Derived from anonymized cross-organization patterns
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{playbook.summary}</p>
          </div>
          <Badge variant={statusConfig.variant} className="shrink-0">
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <StatBox
            icon={TrendingUp}
            label="Success Rate"
            value={`${successPct}%`}
            color={successPct >= 70 ? "text-green-600" : successPct >= 50 ? "text-primary" : "text-warning"}
          />
          <StatBox
            icon={Users}
            label="Sample Size"
            value={playbook.sampleSize.toString()}
          />
          <StatBox
            icon={Clock}
            label="Avg. Time to Impact"
            value={playbook.avgTimeToImpactDays ? `${playbook.avgTimeToImpactDays}d` : "—"}
          />
        </div>

        {/* Expected Impact */}
        {playbook.expectedMetricMovement && (
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Expected Impact</span>
              <span className={cn(
                "font-medium",
                playbook.expectedMetricMovement.direction === "up" 
                  ? "text-green-600" 
                  : "text-red-600"
              )}>
                {playbook.expectedMetricMovement.direction === "up" ? "+" : ""}
                {playbook.expectedMetricMovement.expectedDeltaPercent.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {playbook.expectedMetricMovement.metricName}
            </p>
            <div className="mt-2">
              <Progress 
                value={playbook.expectedMetricMovement.confidence} 
                className="h-1" 
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {playbook.expectedMetricMovement.confidence.toFixed(0)}% confidence
              </p>
            </div>
          </div>
        )}

        {/* Expandable Details */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <ListChecks className="h-3.5 w-3.5" />
                {playbook.implementationSteps.length} Implementation Steps
              </span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            {/* Implementation Steps */}
            <div className="space-y-2">
              {playbook.implementationSteps.map((step, index) => (
                <StepRow key={index} step={step} />
              ))}
              {playbook.implementationSteps.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  No implementation steps defined
                </p>
              )}
            </div>

            {/* Risk Flags */}
            {playbook.riskFlags.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Risk Flags
                </p>
                {playbook.riskFlags.map((flag, index) => (
                  <RiskFlagRow key={index} flag={flag} />
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2 pt-2 border-t">
            {playbook.status === "pending_approval" && (
              <>
                {onApprove && (
                  <Button
                    size="sm"
                    onClick={() => onApprove(playbook.id)}
                    disabled={isApproving}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    {isApproving ? "Approving..." : "Approve"}
                  </Button>
                )}
                {onReject && (
                  <div className="flex items-center gap-2">
                    {showRejectInput && (
                      <input
                        type="text"
                        placeholder="Reason..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="text-sm px-2 py-1 border rounded"
                      />
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleReject}
                      disabled={isRejecting || (showRejectInput && !rejectReason.trim())}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      {isRejecting ? "Rejecting..." : "Reject"}
                    </Button>
                  </div>
                )}
              </>
            )}
            {playbook.status === "approved" && onUse && (
              <Button size="sm" onClick={() => onUse(playbook)}>
                Use Playbook
              </Button>
            )}
            {playbook.status === "approved" && onArchive && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onArchive(playbook.id)}
              >
                <Archive className="h-3.5 w-3.5 mr-1" />
                Archive
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="text-center">
      <Icon className={cn("h-4 w-4 mx-auto mb-1", color || "text-muted-foreground")} />
      <p className={cn("text-lg font-semibold", color)}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function StepRow({ step }: { step: PlaybookStep }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-medium shrink-0">
        {step.order}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{step.title}</p>
        {step.description && (
          <p className="text-xs text-muted-foreground">{step.description}</p>
        )}
      </div>
      {step.estimatedDays && (
        <span className="text-xs text-muted-foreground shrink-0">
          ~{step.estimatedDays}d
        </span>
      )}
    </div>
  );
}

function RiskFlagRow({ flag }: { flag: RiskFlag }) {
  const severityConfig = {
    low: { color: "text-muted-foreground", bg: "bg-muted" },
    medium: { color: "text-warning", bg: "bg-warning/10" },
    high: { color: "text-destructive", bg: "bg-destructive/10" },
  };
  const config = severityConfig[flag.severity];

  return (
    <div className={cn("flex items-start gap-2 p-2 rounded text-xs", config.bg)}>
      <AlertTriangle className={cn("h-3 w-3 shrink-0 mt-0.5", config.color)} />
      <p className={config.color}>{flag.description}</p>
    </div>
  );
}
