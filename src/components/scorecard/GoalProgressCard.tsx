import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, Calendar, Award } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface Goal {
  id: string;
  goal_type: "quarterly" | "annual";
  target_value: number;
  start_date: string;
  end_date: string;
  description: string | null;
}

interface GoalProgressCardProps {
  goal: Goal;
  currentValue: number | null;
  metricUnit: string;
}

const calculateProgress = (current: number | null, target: number): number => {
  if (!current) return 0;
  return Math.min((current / target) * 100, 100);
};

const calculateTimeProgress = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  
  const totalDays = differenceInDays(end, start);
  const daysPassed = differenceInDays(now, start);
  
  return Math.min((daysPassed / totalDays) * 100, 100);
};

export const GoalProgressCard = ({ goal, currentValue, metricUnit }: GoalProgressCardProps) => {
  const progress = calculateProgress(currentValue, goal.target_value);
  const timeProgress = calculateTimeProgress(goal.start_date, goal.end_date);
  const isOnTrack = progress >= timeProgress;
  const daysRemaining = differenceInDays(new Date(goal.end_date), new Date());

  return (
    <Card className={`border-2 ${isOnTrack ? "border-green-200 bg-green-50/50" : "border-amber-200 bg-amber-50/50"}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Target className={`h-5 w-5 ${isOnTrack ? "text-green-600" : "text-amber-600"}`} />
            <CardTitle className="text-base">
              {goal.goal_type === "quarterly" ? "Quarterly" : "Annual"} Goal
            </CardTitle>
          </div>
          <Badge variant={isOnTrack ? "success" : "warning"} className="text-xs">
            {isOnTrack ? "On Track" : "Behind"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Goal Description */}
        {goal.description && (
          <p className="text-sm text-muted-foreground italic">
            "{goal.description}"
          </p>
        )}

        {/* Progress Display */}
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Current Progress</p>
              <p className="text-2xl font-bold">
                {currentValue?.toFixed(1) || 0} <span className="text-sm font-normal text-muted-foreground">/ {goal.target_value} {metricUnit}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Goal Progress</p>
              <p className="text-2xl font-bold">{progress.toFixed(0)}%</p>
            </div>
          </div>

          <Progress value={progress} className="h-3" />
        </div>

        {/* Time Remaining */}
        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{daysRemaining > 0 ? `${daysRemaining} days left` : "Goal period ended"}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {format(new Date(goal.start_date), "MMM d")} - {format(new Date(goal.end_date), "MMM d, yyyy")}
          </span>
        </div>

        {/* Pace Indicator */}
        {daysRemaining > 0 && (
          <div className={`p-2 rounded-lg ${isOnTrack ? "bg-green-100" : "bg-amber-100"}`}>
            <div className="flex items-center gap-2">
              {isOnTrack ? (
                <TrendingUp className="h-4 w-4 text-green-700" />
              ) : (
                <Award className="h-4 w-4 text-amber-700" />
              )}
              <p className="text-xs font-medium">
                {isOnTrack
                  ? `Great pace! You're ahead of schedule by ${(progress - timeProgress).toFixed(0)}%`
                  : `Need ${((goal.target_value - (currentValue || 0)) / (daysRemaining / 7)).toFixed(1)} ${metricUnit} per week to hit goal`
                }
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
