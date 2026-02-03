import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format } from "date-fns";
import { Edit2, Save, X, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BackfillButton } from "./BackfillButton";
import { SetGoalDialog } from "./SetGoalDialog";
import { GoalProgressCard } from "./GoalProgressCard";
import { GoalHistoryView } from "./GoalHistoryView";
import { MetricComments } from "./MetricComments";
import { MetricResultsDebugPanel } from "./MetricResultsDebugPanel";
import { BenchmarkPositionPanel } from "./BenchmarkPositionPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MetricDetailsDrawerProps {
  metricId: string | null;
  organizationId: string | undefined;
  hasJaneIntegration: boolean;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const MetricDetailsDrawer = ({
  metricId,
  organizationId,
  hasJaneIntegration,
  open,
  onClose,
  onUpdate,
}: MetricDetailsDrawerProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<any>({});
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return null;

      const { data } = await supabase
        .from("users")
        .select("id")
        .eq("email", session.session.user.email)
        .single();

      return data;
    },
  });

  const { data: metric } = useQuery({
    queryKey: ["metric-detail", metricId],
    queryFn: async () => {
      if (!metricId) return null;

      const { data, error } = await supabase
        .from("metrics")
        .select("*")
        .eq("id", metricId)
        .single();

      if (error) throw error;
      
      // Fetch owner name separately
      if (data?.owner) {
        const { data: userData } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", data.owner)
          .single();
        
        return { ...data, owner_name: userData?.full_name || null };
      }

      return { ...data, owner_name: null };
    },
    enabled: !!metricId && open,
  });

  const { data: results } = useQuery({
    queryKey: ["metric-results-detail", metricId],
    queryFn: async () => {
      if (!metricId) return [];

      const { data, error } = await supabase
        .from("metric_results")
        .select("*")
        .eq("metric_id", metricId)
        .order("week_start", { ascending: true })
        .limit(12);

      if (error) throw error;
      return data || [];
    },
    enabled: !!metricId && open,
  });

  // Fetch active goals
  const { data: activeGoals } = useQuery({
    queryKey: ["metric-goals", metricId],
    queryFn: async () => {
      if (!metricId || !organizationId) return [];

      const now = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("metric_goals")
        .select("*")
        .eq("metric_id", metricId)
        .eq("organization_id", organizationId)
        .gte("end_date", now)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!metricId && !!organizationId && open,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      if (!metricId) throw new Error("No metric ID");

      const { error } = await supabase
        .from("metrics")
        .update(updates)
        .eq("id", metricId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metric-detail", metricId] });
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      setIsEditing(false);
      onUpdate();
      toast({
        title: "Metric updated",
        description: "Changes saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const chartData = results?.map(r => ({
    week: format(new Date(r.week_start), "MMM d"),
    actual: r.value || 0,
    target: metric?.target || 0,
  })) || [];

  const handleEdit = () => {
    setEditValues({
      target: metric?.target,
      unit: metric?.unit,
      direction: metric?.direction,
      owner: metric?.owner,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(editValues);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValues({});
  };

  if (!metric) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>{metric.name}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGoalDialogOpen(true)}
              >
                <Target className="w-4 h-4 mr-2" />
                Set Goal
              </Button>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </SheetTitle>
          <SheetDescription>
            {metric.category} • {metric.owner_name || "Unassigned"}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Edit Form */}
            {isEditing && (
              <div className="p-4 glass rounded-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Target</Label>
                    <Input
                      type="number"
                      value={editValues.target || ""}
                      onChange={(e) =>
                        setEditValues({ ...editValues, target: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input
                      value={editValues.unit || ""}
                      onChange={(e) =>
                        setEditValues({ ...editValues, unit: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Direction</Label>
                  <Select
                    value={editValues.direction}
                    onValueChange={(value) =>
                      setEditValues({ ...editValues, direction: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="up">Higher is better (≥)</SelectItem>
                      <SelectItem value="down">Lower is better (≤)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={updateMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

          {/* Benchmark Position Panel */}
          {metricId && (
            <BenchmarkPositionPanel metricId={metricId} />
          )}

          {/* Chart */}
          <div className="glass rounded-lg p-4">
            <h3 className="font-semibold mb-4">12-Week Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <ReferenceLine 
                  y={metric.target || 0} 
                  stroke="#9ca3af" 
                  strokeDasharray="3 3"
                  label="Target"
                />
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Data Table */}
          <div className="glass rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold">Week</th>
                  <th className="text-right p-3 text-sm font-semibold">Actual</th>
                  <th className="text-right p-3 text-sm font-semibold">Target</th>
                  <th className="text-right p-3 text-sm font-semibold">vs Target</th>
                </tr>
              </thead>
              <tbody>
                {results?.map((result) => {
                  const percentage = result.value && metric.target
                    ? ((result.value / metric.target) * 100).toFixed(0)
                    : null;
                  return (
                    <tr key={result.id} className="border-t">
                      <td className="p-3 text-sm">
                        {format(new Date(result.week_start), "MMM d, yyyy")}
                      </td>
                      <td className="p-3 text-sm text-right font-medium">
                        {result.value !== null ? `${result.value} ${metric.unit}` : "—"}
                      </td>
                      <td className="p-3 text-sm text-right">
                        {metric.target ? `${metric.target} ${metric.unit}` : "—"}
                      </td>
                      <td className="p-3 text-sm text-right">
                        {percentage ? `${percentage}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Backfill Button */}
            <div className="flex justify-center">
              <BackfillButton
                organizationId={organizationId}
                hasJaneIntegration={hasJaneIntegration}
                variant="default"
              />
            </div>
          </TabsContent>

          <TabsContent value="goals" className="space-y-4">
            {/* Active Goals */}
            {activeGoals && activeGoals.length > 0 ? (
              <div className="space-y-4">
                {activeGoals.map((goal) => (
                  <GoalProgressCard
                    key={goal.id}
                    goal={goal as any}
                    currentValue={results?.[results.length - 1]?.value || null}
                    metricUnit={metric.unit}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 glass rounded-lg">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-2">No active goals</p>
                <Button
                  variant="outline"
                  onClick={() => setGoalDialogOpen(true)}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Set Your First Goal
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            <GoalHistoryView
              metricId={metricId!}
              organizationId={organizationId!}
            />
          </TabsContent>

          <TabsContent value="comments">
            <MetricComments
              metricId={metricId!}
              organizationId={organizationId!}
            />
          </TabsContent>
        </Tabs>

        {/* Dev-only debug panel */}
        <MetricResultsDebugPanel metricId={metricId} />

        {/* Goal Dialog */}
        {metricId && organizationId && currentUser && (
          <SetGoalDialog
            open={goalDialogOpen}
            onOpenChange={setGoalDialogOpen}
            metricId={metricId}
            metricName={metric.name}
            organizationId={organizationId}
            currentUserId={currentUser.id}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};
