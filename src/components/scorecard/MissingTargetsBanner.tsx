/**
 * Banner shown when metrics are missing targets
 * Provides CTA to configure targets for proper on-track/off-track calculation
 */

import { AlertTriangle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface MetricWithoutTarget {
  id: string;
  name: string;
  category: string | null;
}

interface MissingTargetsBannerProps {
  metricsWithoutTargets: MetricWithoutTarget[];
  onConfigureTarget?: (metricId: string) => void;
}

export function MissingTargetsBanner({
  metricsWithoutTargets,
  onConfigureTarget,
}: MissingTargetsBannerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (metricsWithoutTargets.length === 0) {
    return null;
  }

  return (
    <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">
        {metricsWithoutTargets.length} metric{metricsWithoutTargets.length !== 1 ? "s" : ""} missing targets
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span className="text-amber-700 dark:text-amber-300 text-sm">
          Set targets to enable on-track/off-track status calculation.
        </span>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="ml-4">
              <Settings className="w-4 h-4 mr-2" />
              Configure Targets
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Metrics Missing Targets</DialogTitle>
              <DialogDescription>
                Click on a metric to set its target value. Targets are required to calculate on-track/off-track status.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {metricsWithoutTargets.map((metric) => (
                <div
                  key={metric.id}
                  className="flex items-center justify-between p-2 rounded border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    onConfigureTarget?.(metric.id);
                    setDialogOpen(false);
                  }}
                >
                  <div>
                    <p className="font-medium text-sm">{metric.name}</p>
                    {metric.category && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {metric.category}
                      </Badge>
                    )}
                  </div>
                  <Settings className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </AlertDescription>
    </Alert>
  );
}
