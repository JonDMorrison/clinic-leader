import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getLatestCompletedWeek } from "@/lib/weekBoundaries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Users,
  Clock,
  CalendarX,
  UserX,
  Lightbulb,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const INSIGHT_META: Record<string, { icon: typeof Activity; label: string }> = {
  cancellation_rate_trend: { icon: CalendarX, label: "Cancellations" },
  no_show_rate_trend: { icon: UserX, label: "No-Shows" },
  revenue_collected_trend: { icon: DollarSign, label: "Revenue" },
  new_patient_volume: { icon: Users, label: "New Patients" },
  collection_gap: { icon: DollarSign, label: "Collections" },
  provider_utilization: { icon: Clock, label: "Utilization" },
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  positive: "bg-success/15 text-success border-success/30",
  info: "bg-muted text-muted-foreground border-border",
};

function formatPrimary(key: string, value: number | null): string {
  if (value == null) return "—";
  if (key === "revenue_collected_trend") return `$${value.toLocaleString()}`;
  if (key === "new_patient_volume") return String(value);
  if (key.includes("rate") || key === "collection_gap" || key === "provider_utilization")
    return `${value}%`;
  return String(value);
}

function WowDelta({ primary, secondary }: { primary: number | null; secondary: number | null }) {
  if (primary == null || secondary == null) return null;
  const delta = primary - secondary;
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const color =
    delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {delta > 0 ? "+" : ""}
      {delta}
    </span>
  );
}

export function ClinicPulse() {
  const { data: currentUser } = useCurrentUser();
  const [explaining, setExplaining] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  const { data: insights, isLoading } = useQuery({
    queryKey: ["clinic-pulse", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      const { weekStart } = getLatestCompletedWeek();
      const { data, error } = await supabase
        .from("clinic_insights")
        .select("*")
        .eq("organization_id", currentUser.team_id)
        .eq("period_start", weekStart);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!currentUser?.team_id,
    staleTime: 5 * 60 * 1000,
  });

  const handleExplain = async (insight: NonNullable<typeof insights>[number]) => {
    const key = insight.insight_key;

    // Toggle off if already showing
    if (explanations[key]) {
      setExplanations((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    setExplaining(key);
    try {
      const { data, error } = await supabase.functions.invoke("explain-clinic-insight", {
        body: {
          clinic_guid: insight.clinic_guid,
          insight_key: key,
          period_start: insight.period_start,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      } else {
        setExplanations((prev) => ({ ...prev, [key]: data.explanation }));
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate explanation");
    } finally {
      setExplaining(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-brand" />
            Clinic Pulse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights || insights.length === 0) return null;

  // Order insights consistently
  const orderedKeys = Object.keys(INSIGHT_META);
  const sorted = orderedKeys
    .map((key) => insights.find((i) => i.insight_key === key))
    .filter(Boolean) as typeof insights;

  const periodLabel = sorted[0]
    ? `${sorted[0].period_start} → ${sorted[0].period_end ?? ""}`
    : "";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-brand" />
            Clinic Pulse
          </CardTitle>
          {periodLabel && (
            <span className="text-xs text-muted-foreground font-mono">{periodLabel}</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((insight) => {
            const meta = INSIGHT_META[insight.insight_key] ?? {
              icon: Activity,
              label: insight.insight_key,
            };
            const Icon = meta.icon;

            return (
              <div
                key={insight.insight_key}
                className="rounded-lg border bg-card p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">{insight.title}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${SEVERITY_STYLES[insight.severity] ?? SEVERITY_STYLES.info}`}
                  >
                    {insight.severity}
                  </Badge>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-bold tabular-nums">
                    {formatPrimary(insight.insight_key, insight.value_primary)}
                  </span>
                  <WowDelta
                    primary={insight.value_primary}
                    secondary={insight.value_secondary}
                  />
                </div>

                {insight.summary && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{insight.summary}</p>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 px-2"
                  disabled={explaining === insight.insight_key}
                  onClick={() => handleExplain(insight)}
                >
                  <Lightbulb className="w-3 h-3" />
                  {explaining === insight.insight_key
                    ? "Thinking…"
                    : explanations[insight.insight_key]
                      ? "Hide"
                      : "Explain"}
                </Button>

                {explanations[insight.insight_key] && (
                  <div className="mt-1 text-xs text-muted-foreground prose prose-xs prose-neutral dark:prose-invert max-w-none">
                    <ReactMarkdown>{explanations[insight.insight_key]}</ReactMarkdown>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
