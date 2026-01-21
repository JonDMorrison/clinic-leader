import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RadialGauge, getStatusFromValue } from "@/components/ui/RadialGauge";

interface PerformanceScoreProps {
  currentScore: {
    percentage: number;
    onTarget: number;
    total: number;
    week: string;
  } | undefined;
  scoreHistory: number[];
  trend: number;
}

export const PerformanceScore = ({
  currentScore,
  scoreHistory,
  trend,
}: PerformanceScoreProps) => {
  const percentage = currentScore?.percentage || 0;
  const status = getStatusFromValue(percentage);

  const TrendIcon =
    trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor =
    trend > 0 ? "text-success" : trend < 0 ? "text-danger" : "text-muted-foreground";

  const sparklinePoints = useMemo(() => {
    if (scoreHistory.length === 0) return "";
    const width = 100;
    const height = 32;
    const max = Math.max(...scoreHistory, 100);
    const min = Math.min(...scoreHistory, 0);
    const range = max - min || 1;

    return scoreHistory
      .map((value, i) => {
        const x = (i / (scoreHistory.length - 1 || 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
      })
      .join(" ");
  }, [scoreHistory]);

  if (!currentScore) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
        <Target className="w-12 h-12 text-muted-foreground opacity-50" />
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground max-w-xs">
            Set KPI targets on your scorecard to see your team's performance score
          </p>
          <Link to="/scorecard">
            <Button variant="outline" className="hover-scale">
              <Target className="w-4 h-4 mr-2" />
              Set KPI Targets
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center gap-4 py-4">
            {/* Radial Progress Gauge */}
            <RadialGauge
              value={percentage}
              status={status}
              size={160}
              strokeWidth={14}
            />

            {/* Bottom section: Sparkline + Trend */}
            <div className="flex items-center gap-4">
              {/* Mini sparkline */}
              {scoreHistory.length > 1 && (
                <svg width="100" height="32" className="opacity-50">
                  <polyline
                    points={sparklinePoints}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    className="text-muted-foreground"
                  />
                </svg>
              )}

              {/* Trend indicator */}
              {trend !== 0 && (
                <div className={`flex items-center gap-1 ${trendColor}`}>
                  <TrendIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {Math.abs(trend)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">Team Performance Score</p>
            <p className="text-sm text-muted-foreground">
              Week of {new Date(currentScore.week).toLocaleDateString()}
            </p>
            <p className="text-sm">
              ✅ {currentScore.onTarget} of {currentScore.total} KPIs on target (
              {currentScore.percentage}%)
            </p>
            {scoreHistory.length > 1 && (
              <p className="text-xs text-muted-foreground">
                Performance over {scoreHistory.length} weeks
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};