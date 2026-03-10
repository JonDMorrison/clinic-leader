import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Zap,
  Database,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { LEGACY_METRIC_MAPPINGS, extractMetricsFromPayload } from "@/lib/legacy/legacyMetricMapping";

interface SyncWithDataDialogProps {
  open: boolean;
  onClose: () => void;
  metricId: string;
  metricName: string;
  currentImportKey: string | null;
  currentSyncSource: string;
}

interface DataSourceCandidate {
  import_key: string;
  name: string;
  source: "jane_pipe" | "legacy_workbook" | "manual";
  latest_value: number | null;
  latest_period: string | null;
  match_score: number; // 0-100, higher is better match
  match_reason: string;
  is_current: boolean;
}

function computeMatchScore(
  metricName: string,
  candidateName: string,
  candidateKey: string,
  currentImportKey: string | null
): { score: number; reason: string } {
  const mLower = metricName.toLowerCase().trim();
  const cLower = candidateName.toLowerCase().trim();

  // Exact current match
  if (currentImportKey && candidateKey === currentImportKey) {
    return { score: 100, reason: "Currently linked" };
  }

  // Exact name match
  if (mLower === cLower) {
    return { score: 95, reason: "Exact name match" };
  }

  // Name contains the other
  if (mLower.includes(cLower) || cLower.includes(mLower)) {
    return { score: 80, reason: "Name overlap" };
  }

  // Word-level overlap
  const mWords = new Set(mLower.split(/\s+/).filter(w => w.length > 2));
  const cWords = new Set(cLower.split(/\s+/).filter(w => w.length > 2));
  const overlap = [...mWords].filter(w => cWords.has(w)).length;
  const totalWords = Math.max(mWords.size, cWords.size);
  if (overlap > 0 && totalWords > 0) {
    const wordScore = Math.round((overlap / totalWords) * 70);
    return { score: Math.max(wordScore, 40), reason: `${overlap} keyword${overlap > 1 ? "s" : ""} in common` };
  }

  return { score: 10, reason: "Available" };
}

function sourceIcon(source: string) {
  switch (source) {
    case "jane_pipe":
      return <Zap className="w-3.5 h-3.5 text-blue-500" />;
    case "legacy_workbook":
      return <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />;
    default:
      return <Database className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

function sourceLabel(source: string) {
  switch (source) {
    case "jane_pipe":
      return "Jane";
    case "legacy_workbook":
      return "Workbook";
    default:
      return "Manual";
  }
}

export function SyncWithDataDialog({
  open,
  onClose,
  metricId,
  metricName,
  currentImportKey,
  currentSyncSource,
}: SyncWithDataDialogProps) {
  const [search, setSearch] = useState("");
  const { data: currentUser } = useCurrentUser();
  const orgId = currentUser?.team_id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch available data sources from metric_results AND legacy_monthly_reports
  const { data: candidates, isLoading } = useQuery({
    queryKey: ["sync-data-candidates", orgId, metricId],
    queryFn: async () => {
      if (!orgId) return [];

      const groupMap = new Map<string, DataSourceCandidate>();

      // 1) Pull from metric_results (already-bridged data)
      const { data: results } = await supabase
        .from("metric_results")
        .select("metric_id, value, period_start, source, metrics!inner(name, import_key, organization_id)")
        .eq("metrics.organization_id", orgId)
        .not("value", "is", null)
        .order("period_start", { ascending: false })
        .limit(500);

      if (results) {
        for (const r of results) {
          const m = r.metrics as any;
          if (!m?.import_key) continue;
          const key = `${m.import_key}::${r.source}`;
          if (!groupMap.has(key)) {
            const { score, reason } = computeMatchScore(metricName, m.name, m.import_key, currentImportKey);
            groupMap.set(key, {
              import_key: m.import_key,
              name: m.name,
              source: r.source as any,
              latest_value: r.value,
              latest_period: r.period_start,
              match_score: score,
              match_reason: reason,
              is_current: m.import_key === currentImportKey,
            });
          }
        }
      }

      // 2) Pull from legacy_monthly_reports — extract real values via LEGACY_METRIC_MAPPINGS
      const { data: latestReport } = await supabase
        .from("legacy_monthly_reports" as any)
        .select("payload, report_month")
        .eq("organization_id", orgId)
        .order("report_month", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestReport?.payload) {
        try {
          const extracted = extractMetricsFromPayload(latestReport.payload as any);
          for (const item of extracted) {
            const key = `${item.metric_key}::legacy_workbook`;
            if (!groupMap.has(key) && item.value !== null) {
              const { score, reason } = computeMatchScore(metricName, item.display_name, item.metric_key, currentImportKey);
              groupMap.set(key, {
                import_key: item.metric_key,
                name: item.display_name,
                source: "legacy_workbook",
                latest_value: item.value,
                latest_period: latestReport.report_month ?? null,
                match_score: score,
                match_reason: reason,
                is_current: item.metric_key === currentImportKey,
              });
            }
          }
        } catch {
          // Extraction failed, continue with other sources
        }
      }

      // 3) Add Jane supported metrics that may not have results yet
      const janeKeys = [
        { key: "jane_total_visits", name: "Total Visits" },
        { key: "jane_new_patient_visits", name: "New Patient Visits" },
        { key: "jane_no_shows", name: "No Shows" },
        { key: "jane_cancellation_rate", name: "Cancellation Rate %" },
        { key: "jane_show_rate", name: "Show Rate %" },
        { key: "jane_total_invoiced", name: "Total Invoiced" },
        { key: "jane_total_collected", name: "Total Collected Revenue" },
        { key: "jane_avg_revenue_per_visit", name: "Average Revenue Per Visit" },
      ];

      for (const jk of janeKeys) {
        const existingKey = `${jk.key}::jane_pipe`;
        if (!groupMap.has(existingKey)) {
          const { score, reason } = computeMatchScore(metricName, jk.name, jk.key, currentImportKey);
          groupMap.set(existingKey, {
            import_key: jk.key,
            name: jk.name,
            source: "jane_pipe",
            latest_value: null,
            latest_period: null,
            match_score: score,
            match_reason: reason,
            is_current: jk.key === currentImportKey,
          });
        }
      }

      // 4) Add any remaining LEGACY_METRIC_MAPPINGS that weren't found (no data yet)
      for (const mapping of LEGACY_METRIC_MAPPINGS) {
        const key = `${mapping.metric_key}::legacy_workbook`;
        if (!groupMap.has(key)) {
          const { score, reason } = computeMatchScore(metricName, mapping.display_name, mapping.metric_key, currentImportKey);
          groupMap.set(key, {
            import_key: mapping.metric_key,
            name: mapping.display_name,
            source: "legacy_workbook",
            latest_value: null,
            latest_period: null,
            match_score: score,
            match_reason: reason,
            is_current: mapping.metric_key === currentImportKey,
          });
        }
      }

      return Array.from(groupMap.values()).sort((a, b) => b.match_score - a.match_score);
    },
    enabled: open && !!orgId,
  });

  const filtered = useMemo(() => {
    if (!candidates) return [];
    if (!search.trim()) return candidates;
    const q = search.toLowerCase();
    return candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.import_key.toLowerCase().includes(q) ||
        c.source.toLowerCase().includes(q)
    );
  }, [candidates, search]);

  const linkMutation = useMutation({
    mutationFn: async (candidate: DataSourceCandidate) => {
      const syncSource = candidate.source === "jane_pipe" ? "jane" :
        candidate.source === "legacy_workbook" ? "manual" : "manual";

      const { error } = await supabase
        .from("metrics")
        .update({
          import_key: candidate.import_key,
          sync_source: syncSource,
        })
        .eq("id", metricId);

      if (error) throw error;
    },
    onSuccess: (_, candidate) => {
      queryClient.invalidateQueries({ queryKey: ["scorecard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["sync-data-candidates"] });
      toast({
        title: "Data source linked",
        description: `"${metricName}" is now synced with "${candidate.name}" from ${sourceLabel(candidate.source)}.`,
      });
      onClose();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to link data source",
        description: "Please try again.",
      });
    },
  });

  const suggestedMatch = filtered.find((c) => c.match_score >= 70 && !c.is_current);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Sync With Data
          </DialogTitle>
          <DialogDescription>
            Link <span className="font-medium text-foreground">"{metricName}"</span> to an ingested data source.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search data sources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Suggested match banner */}
        {suggestedMatch && !search && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
            <Zap className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Suggested match</p>
              <p className="text-xs text-muted-foreground truncate">
                {suggestedMatch.name} ({sourceLabel(suggestedMatch.source)}) — {suggestedMatch.match_reason}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => linkMutation.mutate(suggestedMatch)}
              disabled={linkMutation.isPending}
            >
              {linkMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  Link
                  <ArrowRight className="w-3 h-3 ml-1" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* Candidates list */}
        <ScrollArea className="max-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No data sources found.
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((c) => (
                <button
                  key={`${c.import_key}::${c.source}`}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-accent/50 ${
                    c.is_current ? "bg-primary/5 border border-primary/20" : ""
                  }`}
                  onClick={() => !c.is_current && linkMutation.mutate(c)}
                  disabled={c.is_current || linkMutation.isPending}
                >
                  {sourceIcon(c.source)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{c.name}</span>
                      {c.is_current && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] h-4">
                        {sourceLabel(c.source)}
                      </Badge>
                      {c.latest_value !== null && (
                        <span className="text-[10px] text-muted-foreground">
                          Latest: {typeof c.latest_value === "number" ? c.latest_value.toLocaleString() : c.latest_value}
                          {c.latest_period ? ` (${c.latest_period.slice(0, 7)})` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  {c.match_score >= 40 && !c.is_current && (
                    <Badge
                      variant="secondary"
                      className={`text-[10px] shrink-0 ${
                        c.match_score >= 80
                          ? "bg-green-100 text-green-700 border-green-200"
                          : c.match_score >= 60
                          ? "bg-amber-100 text-amber-700 border-amber-200"
                          : ""
                      }`}
                    >
                      {c.match_reason}
                    </Badge>
                  )}
                  {c.is_current && (
                    <span className="text-[10px] text-primary font-medium">Current</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
