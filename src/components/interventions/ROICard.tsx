import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  Clock, 
  Pencil,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { useState } from "react";
import { EditROIModal } from "./EditROIModal";

interface ROICardProps {
  intervention: {
    id: string;
    estimated_hours?: number | null;
    estimated_cost?: number | null;
    actual_hours?: number | null;
    actual_cost?: number | null;
    roi_notes?: string | null;
  };
  canEdit: boolean;
  onUpdate?: () => void;
}

export function ROICard({ intervention, canEdit, onUpdate }: ROICardProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);

  const hasEstimates = intervention.estimated_hours != null || intervention.estimated_cost != null;
  const hasActuals = intervention.actual_hours != null || intervention.actual_cost != null;
  const hasAnyData = hasEstimates || hasActuals || intervention.roi_notes;

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatHours = (value: number | null | undefined) => {
    if (value == null) return "—";
    return `${value.toLocaleString()} hrs`;
  };

  const getVariance = (estimated: number | null | undefined, actual: number | null | undefined) => {
    if (estimated == null || actual == null) return null;
    const variance = ((actual - estimated) / estimated) * 100;
    return variance;
  };

  const hoursVariance = getVariance(intervention.estimated_hours, intervention.actual_hours);
  const costVariance = getVariance(intervention.estimated_cost, intervention.actual_cost);

  const getVarianceIcon = (variance: number | null) => {
    if (variance == null) return null;
    if (variance > 10) return <TrendingUp className="w-3 h-3 text-destructive" />;
    if (variance < -10) return <TrendingDown className="w-3 h-3 text-success" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  const getVarianceBadge = (variance: number | null, label: string) => {
    if (variance == null) return null;
    const isOver = variance > 0;
    return (
      <Badge 
        variant={Math.abs(variance) > 10 ? (isOver ? "destructive" : "default") : "secondary"}
        className="text-xs"
      >
        {isOver ? "+" : ""}{variance.toFixed(0)}% {label}
      </Badge>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              ROI Tracking
            </CardTitle>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setEditModalOpen(true)}
              >
                <Pencil className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!hasAnyData ? (
            <div className="text-sm text-muted-foreground">
              <p>No ROI data recorded yet.</p>
              {canEdit && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 mt-1"
                  onClick={() => setEditModalOpen(true)}
                >
                  Add estimates
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Hours Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Estimated Hours</span>
                  </div>
                  <p className="font-medium">{formatHours(intervention.estimated_hours)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Actual Hours</span>
                    {getVarianceIcon(hoursVariance)}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{formatHours(intervention.actual_hours)}</p>
                    {getVarianceBadge(hoursVariance, "vs est")}
                  </div>
                </div>
              </div>

              {/* Cost Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Estimated Cost</span>
                  </div>
                  <p className="font-medium">{formatCurrency(intervention.estimated_cost)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Actual Cost</span>
                    {getVarianceIcon(costVariance)}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{formatCurrency(intervention.actual_cost)}</p>
                    {getVarianceBadge(costVariance, "vs est")}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {intervention.roi_notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{intervention.roi_notes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <EditROIModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        intervention={intervention}
        onUpdate={onUpdate}
      />
    </>
  );
}
