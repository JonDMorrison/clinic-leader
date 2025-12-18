import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Target, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PerformanceScoreCardProps {
  metrics: Array<{
    current_value: number | null;
    target: number | null;
    direction: string;
  }>;
}

const calculatePerformanceScore = (metrics: PerformanceScoreCardProps["metrics"]): number => {
  if (metrics.length === 0) return 0;

  const metricScores = metrics
    .filter(m => m.current_value !== null && m.target !== null)
    .map(m => {
      const percentage = (m.current_value! / m.target!) * 100;
      const isUp = m.direction === "up" || m.direction === ">=";

      // Score out of 100 for each metric
      if (isUp) {
        // For "up" metrics, 100% of target = 100 score
        return Math.min(percentage, 150); // Cap at 150% for bonus
      } else {
        // For "down" metrics, at or below target = 100 score
        if (percentage <= 100) return 100;
        // Penalty for being over target
        return Math.max(0, 100 - (percentage - 100));
      }
    });

  if (metricScores.length === 0) return 0;

  const avgScore = metricScores.reduce((sum, score) => sum + score, 0) / metricScores.length;
  return Math.round(Math.min(avgScore, 100)); // Cap at 100 for display
};

const getScoreColor = (score: number): { bg: string; text: string; border: string } => {
  if (score >= 90) return { bg: "bg-muted/30", text: "text-green-600", border: "border-border/50" };
  if (score >= 75) return { bg: "bg-muted/30", text: "text-blue-600", border: "border-border/50" };
  if (score >= 60) return { bg: "bg-muted/30", text: "text-amber-600", border: "border-border/50" };
  return { bg: "bg-muted/30", text: "text-red-500", border: "border-border/50" };
};

const getScoreLabel = (score: number): string => {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  return "Needs Attention";
};

export const PerformanceScoreCard = ({ metrics }: PerformanceScoreCardProps) => {
  const score = calculatePerformanceScore(metrics);
  const colors = getScoreColor(score);
  const label = getScoreLabel(score);

  const metricsWithData = metrics.filter(
    m => m.current_value !== null && m.target !== null
  ).length;

  const onTrack = metrics.filter(m => {
    if (!m.current_value || !m.target) return false;
    const isUp = m.direction === "up" || m.direction === ">=";
    return isUp ? m.current_value >= m.target : m.current_value <= m.target;
  }).length;

  return (
    <Card className={`glass border-2 ${colors.border} ${colors.bg}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className={`h-5 w-5 ${colors.text}`} />
            Overall Performance
          </CardTitle>
          <Badge variant="muted" className={`${colors.text} border-0`}>
            {label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Display */}
        <div className="flex items-end gap-3">
          <div className={`text-5xl font-bold ${colors.text}`}>
            {score}
          </div>
          <div className="pb-2">
            <div className="text-2xl font-semibold text-muted-foreground">/100</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={score} className="h-3" />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{onTrack} of {metricsWithData} metrics on target</span>
            <span>{metricsWithData > 0 ? Math.round((onTrack / metricsWithData) * 100) : 0}%</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">On Target</p>
              <p className="font-semibold">{onTrack}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <div>
              <p className="text-xs text-muted-foreground">Off Target</p>
              <p className="font-semibold">{metricsWithData - onTrack}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
