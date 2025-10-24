import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const getStatus = (percentage: number) => {
    if (percentage >= 80)
      return {
        label: "Excellent",
        variant: "success" as const,
        gradient: "from-success to-success/80",
      };
    if (percentage >= 60)
      return {
        label: "Good",
        variant: "warning" as const,
        gradient: "from-warning to-warning/80",
      };
    if (percentage >= 40)
      return {
        label: "Needs Attention",
        variant: "warning" as const,
        gradient: "from-warning to-danger",
      };
    return {
      label: "Critical",
      variant: "danger" as const,
      gradient: "from-danger to-danger/80",
    };
  };

  const status = currentScore ? getStatus(currentScore.percentage) : null;
  const percentage = currentScore?.percentage || 0;

  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

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
            {/* Circular Progress Ring */}
            <div className="relative">
              <svg width="140" height="140" className="transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="70"
                  cy="70"
                  r="54"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted/20"
                />
                {/* Progress circle */}
                <motion.circle
                  cx="70"
                  cy="70"
                  r="54"
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className={`bg-gradient-to-br ${status?.gradient}`}
                  style={{
                    stroke: `hsl(var(--${
                      percentage >= 80
                        ? "success"
                        : percentage >= 60
                        ? "warning"
                        : "danger"
                    }))`,
                    filter: "drop-shadow(0 0 8px currentColor)",
                  }}
                  initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </svg>

              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-4xl font-bold text-foreground">
                  <AnimatedCounter value={percentage} />%
                </div>
                {status && (
                  <Badge variant={status.variant} className="mt-1">
                    {status.label}
                  </Badge>
                )}
              </div>
            </div>

            {/* Bottom section: Sparkline + Trend */}
            <div className="flex items-center gap-4">
              {/* Mini sparkline */}
              {scoreHistory.length > 1 && (
                <svg width="100" height="32" className="opacity-60">
                  <polyline
                    points={sparklinePoints}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    className="text-brand"
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
