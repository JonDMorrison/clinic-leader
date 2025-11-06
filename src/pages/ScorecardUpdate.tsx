import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Save, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { startOfWeek, subWeeks, format } from "date-fns";
import { BackfillButton } from "@/components/scorecard/BackfillButton";

interface MetricResult {
  id?: string;
  metric_id: string;
  week_start: string;
  value: number | null;
  source: "manual" | "jane";
  note?: string;
}

const ScorecardUpdate = () => {
  const [selectedMetricId, setSelectedMetricId] = useState<string>("");
  const [editedValues, setEditedValues] = useState<Record<string, number | null>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's organization
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return null;

      const { data } = await supabase
        .from("users")
        .select("id, team_id")
        .eq("email", session.session.user.email)
        .single();

      return data;
    },
  });

  // Fetch metrics for the dropdown
  const { data: metrics } = useQuery({
    queryKey: ["metrics", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];

      const { data, error } = await supabase
        .from("metrics")
        .select("*")
        .eq("organization_id", currentUser.team_id)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.team_id,
  });

  // Get selected metric details
  const selectedMetric = metrics?.find((m) => m.id === selectedMetricId);

  // Generate past 6 weeks dates
  const weekDates = Array.from({ length: 6 }, (_, i) => {
    const date = subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), i);
    return format(date, "yyyy-MM-dd");
  }).reverse();

  // Fetch metric results for selected metric
  const { data: metricResults, isLoading } = useQuery({
    queryKey: ["metric-results", selectedMetricId],
    queryFn: async () => {
      if (!selectedMetricId) return [];

      const { data, error } = await supabase
        .from("metric_results")
        .select("*")
        .eq("metric_id", selectedMetricId)
        .in("week_start", weekDates)
        .order("week_start", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedMetricId,
  });

  // Check if Jane integration exists
  const { data: janeIntegration } = useQuery({
    queryKey: ["jane-integration", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;

      const { data } = await supabase
        .from("jane_integrations")
        .select("*")
        .eq("organization_id", currentUser.team_id)
        .eq("status", "connected")
        .maybeSingle();

      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  const hasJaneIntegration = !!janeIntegration;

  // Get or create result for a specific week
  const getResultForWeek = (weekStart: string) => {
    return metricResults?.find((r) => r.week_start === weekStart);
  };

  // Handle value change
  const handleValueChange = (weekStart: string, value: string) => {
    setEditedValues((prev) => ({
      ...prev,
      [weekStart]: value === "" ? null : Number(value),
    }));
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMetricId) throw new Error("No metric selected");

      const upserts = Object.entries(editedValues).map(([weekStart, value]) => ({
        metric_id: selectedMetricId,
        week_start: weekStart,
        value,
        source: "manual" as const,
      }));

      const { error } = await supabase
        .from("metric_results")
        .upsert(upserts, {
          onConflict: "metric_id,week_start",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metric-results", selectedMetricId] });
      setEditedValues({});
      toast({
        title: "Changes saved",
        description: "Weekly data has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving changes",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  // Sync from Jane
  const handleSyncFromJane = async () => {
    if (!selectedMetricId || !selectedMetric?.sync_source) return;

    setIsSyncing(true);

    try {
      const syncPromises = weekDates.map((weekStart) =>
        supabase.functions.invoke("fetch-jane-kpi", {
          body: { metricId: selectedMetricId, weekStart },
        })
      );

      const results = await Promise.all(syncPromises);
      
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        console.error("Sync errors:", errors);
        toast({
          title: "Partial sync completed",
          description: `${results.length - errors.length} of ${results.length} weeks synced successfully.`,
        });
      } else {
        toast({
          title: "Sync complete",
          description: "All weeks synced successfully from Jane App.",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["metric-results", selectedMetricId] });
    } catch (error) {
      console.error("Sync error:", error);
      toast({
        title: "Sync failed",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const hasChanges = Object.keys(editedValues).length > 0;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Weekly KPI Entry</h1>
          <p className="text-muted-foreground">
            Update your metric values manually or sync from Jane App
          </p>
        </div>
        <BackfillButton 
          organizationId={currentUser?.team_id}
          hasJaneIntegration={hasJaneIntegration}
        />
      </div>

      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1 max-w-md">
              <Label htmlFor="metric-select">Select Metric</Label>
              <Select value={selectedMetricId} onValueChange={setSelectedMetricId}>
                <SelectTrigger id="metric-select">
                  <SelectValue placeholder="Choose a metric to update..." />
                </SelectTrigger>
                <SelectContent>
                  {metrics?.map((metric) => (
                    <SelectItem key={metric.id} value={metric.id}>
                      {metric.name} ({metric.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedMetric?.sync_source === "jane" && hasJaneIntegration && (
              <Button
                onClick={handleSyncFromJane}
                disabled={isSyncing || !selectedMetricId}
                variant="outline"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                Sync from Jane
              </Button>
            )}
          </div>
        </CardHeader>

        {selectedMetricId && (
          <CardContent>
            <div className="space-y-4">
              {/* Metric Info */}
              <div className="flex items-center gap-4 p-4 bg-accent/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Target</p>
                  <p className="font-semibold">
                    {selectedMetric?.target || "—"} {selectedMetric?.unit}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Direction</p>
                  <p className="font-semibold">
                    {selectedMetric?.direction === "up" ? "↑ Higher is better" : "↓ Lower is better"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Source</p>
                  <p className="font-semibold capitalize">{selectedMetric?.sync_source}</p>
                </div>
              </div>

              {/* Data Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4 font-semibold">Week Starting</th>
                      <th className="text-left p-4 font-semibold">Actual Value</th>
                      <th className="text-left p-4 font-semibold">Source</th>
                      <th className="text-left p-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={4} className="text-center p-8 text-muted-foreground">
                          Loading data...
                        </td>
                      </tr>
                    ) : (
                      weekDates.map((weekStart) => {
                        const result = getResultForWeek(weekStart);
                        const isJaneSynced = result?.source === "jane";
                        const currentValue = editedValues[weekStart] ?? result?.value ?? null;

                        return (
                          <tr key={weekStart} className="border-t hover:bg-accent/30">
                            <td className="p-4">
                              <span className="font-medium">{format(new Date(weekStart), "MMM d, yyyy")}</span>
                            </td>
                            <td className="p-4">
                              <Input
                                type="number"
                                value={currentValue ?? ""}
                                onChange={(e) => handleValueChange(weekStart, e.target.value)}
                                disabled={isJaneSynced}
                                placeholder="Enter value..."
                                className="max-w-[200px]"
                              />
                            </td>
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                  isJaneSynced
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {result?.source || "—"}
                              </span>
                            </td>
                            <td className="p-4">
                              {result?.value !== null && result?.value !== undefined ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                              ) : (
                                <span className="text-muted-foreground text-sm">Not entered</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={!hasChanges || saveMutation.isPending}
                  size="lg"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveMutation.isPending ? "Saving..." : "Save All Changes"}
                </Button>
              </div>
            </div>
          </CardContent>
        )}

        {!selectedMetricId && (
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              Select a metric above to view and edit weekly data
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default ScorecardUpdate;
