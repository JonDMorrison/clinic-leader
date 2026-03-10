import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparklines, SparklinesLine } from "react-sparklines";
import { TrendingUp, TrendingDown, ExternalLink, Star, Minus, ArrowRight, Link as LinkIcon, AlertTriangle, MoreHorizontal, Database } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { calculateTrend, calculateWeekOverWeek, getCategoryColor } from "@/lib/scorecard/trendCalculator";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { VTOGoalBadge } from "@/components/vto/VTOGoalBadge";
import { LinkToVTODialog } from "@/components/vto/LinkToVTODialog";
import { LinkedRocksBadges } from "./LinkedRocksBadges";
import { SourceBadge, LastUpdatedText } from "./SourceBadge";
import { CreateIssueFromMetricModal } from "./CreateIssueFromMetricModal";
import { SyncWithDataDialog } from "./SyncWithDataDialog";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface MetricData {
  id: string;
  name: string;
  category: string;
  unit: string;
  target: number | null;
  direction: string;
  sync_source: string;
  cadence: string;
  owner_name: string | null;
  current_value: number | null;
  last_8_weeks: (number | null)[];
  is_favorite?: boolean;
  // Provenance fields
  latest_result_source: string | null;
  latest_result_updated_at: string | null;
}

interface MetricCardProps {
  metric: MetricData;
  onClick: () => void;
  janeLastSync?: string | null;
}

const getPerformanceColor = (
  actual: number | null,
  target: number | null,
  direction: string
): "green" | "amber" | "red" | "gray" => {
  if (!actual || !target) return "gray";

  const percentage = (actual / target) * 100;
  const isUp = direction === "up" || direction === ">=";

  if (isUp) {
    if (percentage >= 100) return "green";
    if (percentage >= 90) return "amber";
    return "red";
  } else {
    if (percentage <= 100) return "green";
    if (percentage <= 110) return "amber";
    return "red";
  }
};

const getColorClasses = (color: "green" | "amber" | "red" | "gray") => {
  switch (color) {
    case "green":
      return "bg-green-100 text-green-800 border-green-300";
    case "amber":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "red":
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
};

export const MetricCard = ({ metric, onClick, janeLastSync }: MetricCardProps) => {
  const userQuery = useCurrentUser();
  const currentUser = userQuery.data;
  const orgId = currentUser?.team_id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [linkToVTOOpen, setLinkToVTOOpen] = useState(false);
  const [createIssueOpen, setCreateIssueOpen] = useState(false);

  // Determine if metric is off-track
  const isOffTrack = metric.current_value !== null &&
    metric.target !== null &&
    ((metric.direction === "up" || metric.direction === ">=")
      ? metric.current_value < metric.target
      : metric.current_value > metric.target);

  // Count consecutive off-track periods
  const consecutiveOffTrack = (() => {
    if (!isOffTrack || !metric.last_8_weeks || metric.last_8_weeks.length < 2) return 0;
    let count = 0;
    const target = metric.target;
    const isHigherBetter = metric.direction === "up" || metric.direction === ">=";

    // Start from most recent and count backwards
    for (let i = metric.last_8_weeks.length - 1; i >= 0; i--) {
      const val = metric.last_8_weeks[i];
      if (val === null) break;
      const periodOffTrack = isHigherBetter ? val < target! : val > target!;
      if (periodOffTrack) {
        count++;
      } else {
        break;
      }
    }
    return count;
  })();

  const performanceColor = getPerformanceColor(
    metric.current_value,
    metric.target,
    metric.direction
  );

  const sparklineData = metric.last_8_weeks.map(v => v ?? 0);
  const hasData = metric.last_8_weeks.some(v => v !== null);

  // Calculate trend
  const targetDir = (metric.direction === "up" || metric.direction === ">=") ? "up" : "down";
  const trend = calculateTrend(metric.last_8_weeks, targetDir);

  // Calculate week-over-week
  const previousWeekValue = metric.last_8_weeks.length >= 2
    ? metric.last_8_weeks[metric.last_8_weeks.length - 2]
    : null;
  const weekOverWeek = calculateWeekOverWeek(metric.current_value, previousWeekValue);

  // Get category colors
  const categoryColors = getCategoryColor(metric.category);

  // Favorite toggle mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (isFavorite: boolean) => {
      const { error } = await supabase
        .from("metrics")
        .update({ is_favorite: isFavorite })
        .eq("id", metric.id);

      if (error) throw error;
    },
    onSuccess: (_, isFavorite) => {
      queryClient.invalidateQueries({ queryKey: ["scorecard-metrics"] });
      toast({
        title: isFavorite ? "Added to favorites" : "Removed from favorites",
        description: `${metric.name} has been ${isFavorite ? "starred" : "unstarred"}`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update favorite status",
      });
    },
  });

  const handleUpdateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/scorecard/update?metricId=${metric.id}`);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavoriteMutation.mutate(!metric.is_favorite);
  };

  return (
    <div onClick={onClick} className="cursor-pointer">
      <Card className="p-4 md:p-6 hover:border-primary/40 transition-all">
        <div className="space-y-3 md:space-y-4">
          {/* Tier 1: Title Row - Full width, prominent */}
          <div className="flex items-start gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 shrink-0 -ml-1 mt-0.5"
              onClick={handleFavoriteClick}
              disabled={toggleFavoriteMutation.isPending}
              aria-label={metric.is_favorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star
                className={`h-4 w-4 ${metric.is_favorite
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/50 hover:text-muted-foreground"
                  } ${toggleFavoriteMutation.isPending ? "opacity-50" : ""}`}
              />
            </Button>
            <h3 className="text-base md:text-lg font-semibold text-foreground leading-tight">
              {metric.name}
            </h3>
          </div>

          {/* Tier 2: Category, Owner, VTO link */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="muted" className={`text-xs ${categoryColors.badgeBg} ${categoryColors.text} border-0`}>
              {metric.category}
            </Badge>
            {metric.owner_name && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span className="text-xs text-muted-foreground">
                  {metric.owner_name}
                </span>
              </>
            )}
            <VTOGoalBadge linkType="kpi" linkId={metric.id} />
          </div>

          {/* Tier 3: Source info - Subdued */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
            <SourceBadge
              source={metric.latest_result_source}
              syncSource={metric.sync_source}
              cadence={metric.cadence}
              lastUpdated={metric.latest_result_updated_at}
              janeLastSync={janeLastSync}
              compact
            />
            <span className="text-muted-foreground/40">•</span>
            <LastUpdatedText lastUpdated={metric.latest_result_updated_at} />
          </div>

          {/* Target & Trend */}
          <div className="flex items-center justify-between gap-2">
            {metric.target ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Target:</span>
                <Badge variant="muted" className="text-xs">
                  {metric.direction === "up" || metric.direction === ">=" ? (
                    <TrendingUp className="w-3 h-3 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-1" />
                  )}
                  {metric.target} {metric.unit}
                </Badge>
              </div>
            ) : (
              <Badge variant="muted" className="text-xs text-muted-foreground/70">
                Needs Target
              </Badge>
            )}
            {trend.direction !== "insufficient-data" && (
              <Badge
                variant="muted"
                className={`text-xs border ${trend.direction === "up"
                  ? "border-green-300 bg-green-50 text-green-700"
                  : trend.direction === "down"
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-gray-300 bg-gray-50 text-gray-700"
                  }`}
              >
                <span className="mr-1">{trend.icon}</span>
                {trend.label}
              </Badge>
            )}
          </div>

          {/* Sparkline */}
          {hasData && (
            <div className="h-12">
              <Sparklines data={sparklineData} width={200} height={40}>
                <SparklinesLine
                  color={
                    performanceColor === "green" ? "#22c55e" :
                      performanceColor === "amber" ? "#f59e0b" :
                        performanceColor === "red" ? "#ef4444" : "#9ca3af"
                  }
                  style={{ strokeWidth: 2, fill: "none" }}
                />
              </Sparklines>
            </div>
          )}

          {/* Current Value with Week-over-Week */}
          <div className={`p-3 rounded-lg border ${getColorClasses(performanceColor)}`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium opacity-80">This Week</p>
                  <p className="text-lg font-bold">
                    {metric.current_value !== null
                      ? `${metric.current_value} ${metric.unit}`
                      : "No data"}
                  </p>
                </div>
                {metric.current_value !== null && metric.target && (
                  <div className="text-right">
                    <p className="text-xs opacity-80">vs Target</p>
                    <p className="text-sm font-semibold">
                      {((metric.current_value / metric.target) * 100).toFixed(0)}%
                    </p>
                  </div>
                )}
              </div>

              {/* Week-over-Week Comparison */}
              {weekOverWeek && (
                <div className="flex items-center gap-1 text-xs pt-1 border-t border-current/20">
                  {weekOverWeek.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span className="font-medium">
                    {weekOverWeek.isPositive ? "+" : ""}
                    {weekOverWeek.change.toFixed(1)} {metric.unit}
                  </span>
                  <span className="opacity-70">
                    ({weekOverWeek.isPositive ? "+" : ""}
                    {weekOverWeek.percentage.toFixed(1)}%)
                  </span>
                  <span className="opacity-60">vs last week</span>
                </div>
              )}
            </div>
          </div>

          {/* Linked Priorities Section */}
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
              <span>Linked Priorities</span>
            </div>
            <LinkedRocksBadges metric={{ id: metric.id, name: metric.name }} />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={handleUpdateClick}
            >
              <ExternalLink className="w-3 h-3 mr-2" />
              Update
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                setLinkToVTOOpen(true);
              }}
            >
              <LinkIcon className="w-3 h-3 mr-2" />
              Link V/TO
            </Button>
            {isOffTrack && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="px-2">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    setCreateIssueOpen(true);
                  }}>
                    <AlertTriangle className="w-3 h-3 mr-2" />
                    Create Issue
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </Card>

      <LinkToVTODialog
        open={linkToVTOOpen}
        onClose={() => setLinkToVTOOpen(false)}
        linkType="kpi"
        linkId={metric.id}
        itemName={metric.name}
      />

      {orgId && (
        <CreateIssueFromMetricModal
          open={createIssueOpen}
          onClose={() => setCreateIssueOpen(false)}
          organizationId={orgId}
          metric={{
            id: metric.id,
            name: metric.name,
            target: metric.target,
            direction: metric.direction,
            unit: metric.unit,
            currentValue: metric.current_value,
            status: isOffTrack ? 'off_track' : 'on_track',
            ownerName: metric.owner_name,
          }}
          periodKey={new Date().toISOString().slice(0, 7)}
          periodLabel={new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          consecutiveOffTrack={consecutiveOffTrack}
        />
      )}
    </div>
  );
};
