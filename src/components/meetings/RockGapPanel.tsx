import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AlertTriangle, ExternalLink, Link as LinkIcon, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MetricStatus, MetricStatusResult, formatMetricValue, getStatusDisplay } from "@/lib/scorecard/metricStatus";

export interface RockGapData {
  rock: {
    id: string;
    title: string;
    owner_id: string | null;
    owner_name: string | null;
    confidence: number | null;
    status: string;
    quarter: string;
  };
  offTrackCount: number;
  needsDataCount: number;
  needsTargetCount: number;
  needsOwnerCount: number;
  onTrackCount: number;
  totalLinkedMetrics: number;
  linkedMetrics: {
    id: string;
    name: string;
    target: number | null;
    direction: string | null;
    unit: string;
    owner: string | null;
    value: number | null;
    status: MetricStatus;
    statusResult: MetricStatusResult;
    delta: number | null;
  }[];
  periodKey: string;
  periodLabel: string;
}

interface RockGapPanelProps {
  gapData: RockGapData;
  children?: React.ReactNode;
}

export function RockGapPanel({ gapData, children }: RockGapPanelProps) {
  const navigate = useNavigate();

  const hasIssues = gapData.offTrackCount > 0 || gapData.needsDataCount > 0;
  const badgeVariant = gapData.offTrackCount > 0 ? "destructive" : hasIssues ? "outline" : "default";

  const buildBadgeText = () => {
    if (gapData.totalLinkedMetrics === 0) return "No KPIs linked";
    const parts = [];
    if (gapData.offTrackCount > 0) parts.push(`${gapData.offTrackCount} off-track`);
    if (gapData.needsDataCount > 0) parts.push(`${gapData.needsDataCount} needs data`);
    if (parts.length === 0) return `${gapData.onTrackCount}/${gapData.totalLinkedMetrics} on track`;
    return parts.join(', ');
  };

  const getStatusBadge = (status: MetricStatus) => {
    const display = getStatusDisplay(status);
    return (
      <Badge variant={display.variant} className="text-xs">
        {display.label}
      </Badge>
    );
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <Badge
            variant={gapData.totalLinkedMetrics === 0 ? "outline" : badgeVariant}
            className="cursor-pointer gap-1 hover:opacity-80 transition-opacity text-xs"
          >
            {gapData.offTrackCount > 0 && <AlertTriangle className="w-3 h-3" />}
            {gapData.totalLinkedMetrics === 0 && <LinkIcon className="w-3 h-3" />}
            {buildBadgeText()}
          </Badge>
        )}
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {gapData.offTrackCount > 0 ? (
              <AlertTriangle className="text-destructive" />
            ) : (
              <Database className="text-muted-foreground" />
            )}
            Reality Gap
          </SheetTitle>
          <SheetDescription>
            Status for {gapData.periodLabel}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Rock info */}
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="font-medium text-sm">Rock: {gapData.rock.title}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>Owner: {gapData.rock.owner_name || "Unassigned"}</span>
              {gapData.rock.confidence && (
                <span>• Confidence: {gapData.rock.confidence}/5</span>
              )}
            </div>
          </div>

          {gapData.totalLinkedMetrics === 0 ? (
            <div className="p-6 text-center border border-dashed rounded-lg">
              <Database className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No KPIs are linked to this Rock yet.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Link KPIs to track progress toward this priority.
              </p>
            </div>
          ) : (
            <>
              {/* Summary row */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-lg border border-destructive/30 bg-destructive/5">
                  <p className="text-lg font-bold text-destructive">{gapData.offTrackCount}</p>
                  <p className="text-[10px] text-muted-foreground">Off Track</p>
                </div>
                <div className="p-2 rounded-lg border border-muted-foreground/30 bg-muted/50">
                  <p className="text-lg font-bold">{gapData.needsDataCount}</p>
                  <p className="text-[10px] text-muted-foreground">Needs Data</p>
                </div>
                <div className="p-2 rounded-lg border border-warning/30 bg-warning/5">
                  <p className="text-lg font-bold text-warning">{gapData.needsTargetCount}</p>
                  <p className="text-[10px] text-muted-foreground">Needs Target</p>
                </div>
                <div className="p-2 rounded-lg border border-success/30 bg-success/5">
                  <p className="text-lg font-bold text-success">{gapData.onTrackCount}</p>
                  <p className="text-[10px] text-muted-foreground">On Track</p>
                </div>
              </div>

              {/* Metrics table */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {gapData.linkedMetrics.map((metric) => (
                  <div
                    key={metric.id}
                    className={`p-3 rounded-lg border ${
                      metric.status === 'off_track'
                        ? 'border-destructive/30 bg-destructive/5'
                        : metric.status === 'needs_data' || metric.status === 'needs_target' || metric.status === 'needs_owner'
                        ? 'border-warning/30 bg-warning/5'
                        : 'border-success/30 bg-success/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{metric.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className={metric.status === 'off_track' ? 'text-destructive font-medium' : 'text-foreground'}>
                            Value: {formatMetricValue(metric.value, metric.unit)}
                          </span>
                          <span className="text-muted-foreground">
                            Target: {formatMetricValue(metric.target, metric.unit)}
                          </span>
                        </div>
                        {metric.delta !== null && metric.status === 'off_track' && (
                          <p className="text-xs text-destructive mt-1">
                            {metric.direction === 'higher_is_better' ? 'Under' : 'Over'} by {formatMetricValue(Math.abs(metric.delta), metric.unit)}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {getStatusBadge(metric.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Footer actions */}
          <div className="pt-4 border-t">
            <Button
              className="w-full"
              variant="ghost"
              onClick={() => navigate(`/scorecard/off-track?month=${gapData.periodKey}`)}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View in Off-Track Control Center
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function buildRockGapBadgeText(gapData: RockGapData): string {
  if (gapData.totalLinkedMetrics === 0) return "No KPIs linked";
  const parts = [];
  if (gapData.offTrackCount > 0) parts.push(`${gapData.offTrackCount} off-track`);
  if (gapData.needsDataCount > 0) parts.push(`${gapData.needsDataCount} needs data`);
  if (parts.length === 0) return `${gapData.onTrackCount}/${gapData.totalLinkedMetrics} on track`;
  return parts.join(', ');
}
