import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown, Edit, Check, X, Trash2 } from "lucide-react";
import { MetricDefinition } from "@/pages/ScorecardSetup";

interface ReviewStepProps {
  metrics: MetricDefinition[];
  onMetricsChange: (metrics: MetricDefinition[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const CATEGORIES = [
  "Patient Volume",
  "Revenue",
  "Clinical",
  "Marketing",
  "Operations",
  "Finance",
  "Other"
];

const UNITS = ["count", "percent", "dollars", "hours", "ratio"];

export const ReviewStep = ({ metrics, onMetricsChange, onNext, onBack }: ReviewStepProps) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<MetricDefinition | null>(null);

  const handleEditClick = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...metrics[index] });
  };

  const handleSave = () => {
    if (editingIndex === null || !editForm) return;
    const updated = [...metrics];
    updated[editingIndex] = editForm;
    onMetricsChange(updated);
    setEditingIndex(null);
    setEditForm(null);
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const handleRemove = (index: number) => {
    const updated = metrics.filter((_, i) => i !== index);
    onMetricsChange(updated);
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditForm(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Review Your Metrics</CardTitle>
          <p className="text-muted-foreground">
            Here's what you'll be tracking. Click the edit icon to make changes.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {metrics.map((metric, index) => (
            <Card key={index} className="p-6 border-border">
              {editingIndex === index && editForm ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="name">Metric Name</Label>
                      <Input
                        id="name"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={editForm.category}
                        onValueChange={(value) => setEditForm({ ...editForm, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="direction">Direction</Label>
                      <Select
                        value={editForm.direction}
                        onValueChange={(value: "up" | "down") => setEditForm({ ...editForm, direction: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="up">Up is Good</SelectItem>
                          <SelectItem value="down">Down is Good</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="target">Target</Label>
                      <Input
                        id="target"
                        type="number"
                        value={editForm.target || ""}
                        onChange={(e) => setEditForm({ ...editForm, target: e.target.value ? Number(e.target.value) : undefined })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="unit">Unit</Label>
                      <Select
                        value={editForm.unit}
                        onValueChange={(value) => setEditForm({ ...editForm, unit: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="owner">Owner</Label>
                      <Input
                        id="owner"
                        value={editForm.owner || ""}
                        onChange={(e) => setEditForm({ ...editForm, owner: e.target.value || undefined })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="syncSource">Data Source</Label>
                      <Select
                        value={editForm.syncSource}
                        onValueChange={(value: "manual" | "jane") => setEditForm({ ...editForm, syncSource: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual Entry</SelectItem>
                          <SelectItem value="jane">Jane API</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCancel}>
                      <X className="w-4 h-4 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                      <Check className="w-4 h-4 mr-1" /> Save
                    </Button>
                  </div>
                </div>
              ) : (
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
                  
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(index)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleRemove(index)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
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
