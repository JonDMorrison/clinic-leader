import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { MetricDefinition } from "@/pages/ScorecardSetup";

interface MetricDefinitionsStepProps {
  metrics: MetricDefinition[];
  onMetricsChange: (metrics: MetricDefinition[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const UNITS = ["count", "%", "dollars", "hours", "days", "points"];
const CATEGORIES = ["Operations", "Finance", "Marketing", "Clinical", "Other"];

export const MetricDefinitionsStep = ({
  metrics,
  onMetricsChange,
  onNext,
  onBack,
}: MetricDefinitionsStepProps) => {
  const addMetric = () => {
    onMetricsChange([
      ...metrics,
      {
        name: "",
        target: null,
        unit: "count",
        direction: "up",
        owner: "",
        category: "Operations",
        syncSource: "manual",
      },
    ]);
  };

  const updateMetric = (index: number, field: keyof MetricDefinition, value: any) => {
    const updated = [...metrics];
    updated[index] = { ...updated[index], [field]: value };
    onMetricsChange(updated);
  };

  const removeMetric = (index: number) => {
    onMetricsChange(metrics.filter((_, i) => i !== index));
  };

  const canProceed = metrics.length > 0 && metrics.every(m => m.name && m.category);

  return (
    <div className="space-y-6">
      <Card className="glass border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Define Your Metrics</CardTitle>
          <p className="text-muted-foreground">
            Add the key performance indicators you want to track
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {metrics.map((metric, index) => (
            <Card key={index} className="p-6 border-border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Metric Name *</Label>
                  <Input
                    placeholder="e.g., New Patients"
                    value={metric.name}
                    onChange={(e) => updateMetric(index, "name", e.target.value)}
                  />
                </div>

                <div>
                  <Label>Target</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 50"
                    value={metric.target || ""}
                    onChange={(e) => updateMetric(index, "target", e.target.value ? Number(e.target.value) : null)}
                  />
                </div>

                <div>
                  <Label>Unit *</Label>
                  <Select
                    value={metric.unit}
                    onValueChange={(value) => updateMetric(index, "unit", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Direction *</Label>
                  <Select
                    value={metric.direction}
                    onValueChange={(value: "up" | "down") => updateMetric(index, "direction", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="up">Up = Better</SelectItem>
                      <SelectItem value="down">Down = Better</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Owner</Label>
                  <Input
                    placeholder="e.g., Front Desk Manager"
                    value={metric.owner}
                    onChange={(e) => updateMetric(index, "owner", e.target.value)}
                  />
                </div>

                <div>
                  <Label>Category *</Label>
                  <Select
                    value={metric.category}
                    onValueChange={(value) => updateMetric(index, "category", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Sync Source</Label>
                  <Select
                    value={metric.syncSource}
                    onValueChange={(value: "manual" | "jane") => updateMetric(index, "syncSource", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="jane">Jane API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMetric(index)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          <Button
            variant="outline"
            onClick={addMetric}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another Metric
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Continue
        </Button>
      </div>
    </div>
  );
};
