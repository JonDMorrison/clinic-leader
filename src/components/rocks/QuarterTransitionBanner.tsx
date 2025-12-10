import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";
import { X, PartyPopper, AlertCircle, ArrowRight } from "lucide-react";
import { getCurrentQuarter } from "@/lib/rocks/templates";

interface QuarterTransitionBannerProps {
  completedCount: number;
  incompleteCount: number;
  onPlanQuarter: () => void;
  onHandleIncomplete: () => void;
  onDismiss: () => void;
}

export function QuarterTransitionBanner({
  completedCount,
  incompleteCount,
  onPlanQuarter,
  onHandleIncomplete,
  onDismiss,
}: QuarterTransitionBannerProps) {
  const currentQuarter = getCurrentQuarter();

  return (
    <Card className="border-primary/50 bg-gradient-to-r from-primary/10 via-primary/5 to-background">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Quarter Complete!</h3>
              <Badge variant="muted" className="ml-2">
                {currentQuarter}
              </Badge>
            </div>

            {/* Summary */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">
                  {completedCount} {completedCount === 1 ? 'rock' : 'rocks'} completed
                </span>
              </div>
              {incompleteCount > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-muted-foreground">
                    {incompleteCount} {incompleteCount === 1 ? 'rock' : 'rocks'} incomplete
                  </span>
                </div>
              )}
            </div>

            {/* Call to Action */}
            <p className="text-sm text-muted-foreground">
              {incompleteCount > 0
                ? "Review incomplete rocks before planning the next quarter."
                : "Great work! Ready to plan your next quarter?"}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              {incompleteCount > 0 && (
                <Button variant="outline" size="sm" onClick={onHandleIncomplete}>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Review Incomplete
                </Button>
              )}
              <Button size="sm" onClick={onPlanQuarter}>
                Plan Next Quarter
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Dismiss */}
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
