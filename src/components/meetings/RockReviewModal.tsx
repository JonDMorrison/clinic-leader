import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Target, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { metricStatus, normalizeDirection, formatMetricValue, getStatusDisplay } from "@/lib/scorecard/metricStatus";
import { periodKeyToStart } from "@/lib/scorecard/periodHelper";

interface RockReviewModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  periodKey: string;
}

export function RockReviewModal({ open, onClose, organizationId, periodKey }: RockReviewModalProps) {
  const { data: rocks, isLoading } = useQuery({
    queryKey: ["rock-review-modal", organizationId, periodKey],
    queryFn: async () => {
      const { data: rocksData } = await supabase
        .from("rocks")
        .select("id, title, owner_id, confidence, status, quarter, users(full_name)")
        .eq("organization_id", organizationId)
        .neq("status", "done")
        .order("level");

      if (!rocksData?.length) return [];

      const rockIds = rocksData.map(r => r.id);

      // Fetch linked metrics
      const { data: links } = await supabase
        .from("rock_metric_links")
        .select("rock_id, metric_id")
        .eq("organization_id", organizationId)
        .in("rock_id", rockIds);

      const linksByRock: Record<string, string[]> = {};
      for (const link of links || []) {
        if (!linksByRock[link.rock_id]) linksByRock[link.rock_id] = [];
        linksByRock[link.rock_id].push(link.metric_id);
      }

      const allMetricIds = [...new Set((links || []).map(l => l.metric_id))];

      const { data: metrics } = allMetricIds.length > 0
        ? await supabase.from("metrics").select("id, name, target, direction, unit, owner").eq("organization_id", organizationId).in("id", allMetricIds)
        : { data: [] };

      const periodStart = periodKeyToStart(periodKey);
      const { data: results } = allMetricIds.length > 0
        ? await supabase.from("metric_results").select("metric_id, value").in("metric_id", allMetricIds).eq("period_type", "monthly").eq("period_start", periodStart)
        : { data: [] };

      const resultsByMetric = (results || []).reduce((acc, r) => { acc[r.metric_id] = r; return acc; }, {} as Record<string, any>);
      const metricsById = (metrics || []).reduce((acc, m) => { acc[m.id] = m; return acc; }, {} as Record<string, any>);

      return rocksData.map(rock => {
        const linkedMetricIds = linksByRock[rock.id] || [];
        const linkedMetrics = linkedMetricIds.map(mid => {
          const m = metricsById[mid];
          if (!m) return null;
          const result = resultsByMetric[mid] ?? null;
          const status = metricStatus(m, result, periodKey);
          return { id: m.id, name: m.name, target: m.target, unit: m.unit, value: result?.value ?? null, status };
        }).filter(Boolean);

        return {
          ...rock,
          owner_name: (rock.users as any)?.full_name || null,
          linkedMetrics,
          offTrackCount: linkedMetrics.filter(m => m!.status.status === 'off_track').length,
        };
      });
    },
    enabled: open && !!organizationId && !!periodKey,
  });

  const getStatusBadge = (status: string) => {
    if (status === "done") return { variant: "success" as const, label: "Done" };
    if (status === "off_track") return { variant: "destructive" as const, label: "Off Track" };
    return { variant: "secondary" as const, label: "On Track" };
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rock Review — {periodKey}</DialogTitle>
          <DialogDescription>Quarterly rocks with linked metric status.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading rocks…</div>
        ) : !rocks?.length ? (
          <div className="py-8 text-center text-muted-foreground">No active rocks found.</div>
        ) : (
          <div className="space-y-3">
            {rocks.map(rock => {
              const badge = getStatusBadge(rock.status);
              return (
                <div key={rock.id} className="p-3 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Target className="w-5 h-5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{rock.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {rock.owner_name || "Unassigned"} • {rock.quarter}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {rock.confidence != null && (
                        <span className="text-xs text-muted-foreground">{rock.confidence}%</span>
                      )}
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      {rock.offTrackCount > 0 && (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {rock.offTrackCount} off track
                        </Badge>
                      )}
                    </div>
                  </div>
                  {rock.linkedMetrics.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                      {rock.linkedMetrics.map((m: any) => {
                        const display = getStatusDisplay(m.status.status);
                        return (
                          <div key={m.id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/30">
                            <span className="truncate">{m.name}</span>
                            <span className="flex items-center gap-2">
                              <span className="font-mono">{formatMetricValue(m.value, m.unit)}</span>
                              <Badge variant={display.variant === "muted" ? "secondary" : display.variant} className="text-[10px]">
                                {display.label}
                              </Badge>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
