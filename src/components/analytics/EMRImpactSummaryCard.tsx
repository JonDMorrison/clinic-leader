/**
 * EMR Impact Summary Card
 * Displays a single key metric with trend indicator
 */

import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EMRImpactSummaryCardProps {
  title: string;
  value: string;
  description: string;
  trend: "up" | "down" | "neutral";
  icon: LucideIcon;
  className?: string;
}

export function EMRImpactSummaryCard({
  title,
  value,
  description,
  trend,
  icon: Icon,
  className,
}: EMRImpactSummaryCardProps) {
  const trendColors = {
    up: "text-green-600 bg-green-100 dark:bg-green-900/30",
    down: "text-red-600 bg-red-100 dark:bg-red-900/30",
    neutral: "text-muted-foreground bg-muted",
  };

  return (
    <Card className={cn("", className)}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={cn("p-2 rounded-lg", trendColors[trend])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
