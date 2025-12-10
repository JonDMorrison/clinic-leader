import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Edit } from "lucide-react";
import { MetricDefinition } from "@/pages/ScorecardSetup";

interface ReviewStepProps {
  metrics: MetricDefinition[];
  onMetricsChange: (metrics: MetricDefinition[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export const ReviewStep = ({ metrics, onNext, onBack }: ReviewStepProps) => {
  return (
    <div className="space-y-6">
      <Card className="glass border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Review Your Metrics</CardTitle>
          <p className="text-muted-foreground">
            Here's what you'll be tracking. You can always edit these later.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {metrics.map((metric, index) => (
            <Card key={index} className="p-6 border-border">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-foreground">
                      {metric.name}
                    </h3>
                    {metric.direction === "up" ? (
                      <ArrowUp className="w-5 h-5 text-green-500" />
                    ) : (
                      <ArrowDown className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{metric.category}</Badge>
                    {metric.target && (
                      <Badge variant="outline">
                        Target: {metric.target} {metric.unit}
                      </Badge>
                    )}
                    {metric.owner && (
                      <Badge variant="outline">Owner: {metric.owner}</Badge>
                    )}
                    <Badge variant={metric.syncSource === "jane" ? "default" : "secondary"}>
                      {metric.syncSource === "jane" ? "Jane API" : "Manual"}
                    </Badge>
                  </div>
                </div>
                
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  );
};
