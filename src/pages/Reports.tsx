import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Plus, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportCard } from "@/components/reports/ReportCard";
import { Report } from "@/types/reports";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HelpHint } from "@/components/help/HelpHint";
import { Skeleton } from "@/components/ui/skeleton";

const Reports = () => {
  const [periodFilter, setPeriodFilter] = useState<"all" | "weekly" | "monthly">("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<"weekly" | "monthly">("weekly");

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return null;

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .single();
      
      if (roleError) throw roleError;

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("team_id")
        .eq("id", authData.user.id)
        .single();
      
      if (userError) throw userError;
      
      const data = { team_id: userData?.team_id, role: roleData?.role };
      return data;
    },
  });

  const { data: reports, isLoading, refetch } = useQuery({
    queryKey: ["reports", periodFilter, currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];

      let query = supabase
        .from("reports")
        .select("*")
        .eq("organization_id", currentUser.team_id)
        .order("created_at", { ascending: false });

      if (periodFilter !== "all") {
        query = query.eq("period", periodFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Report[];
    },
    enabled: !!currentUser?.team_id,
  });

  const handleGenerateReport = async () => {
    if (!currentUser?.team_id) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-report", {
        body: {
          team_id: currentUser.team_id,
          period: selectedPeriod,
        },
      });

      if (error) throw error;

      toast.success(`${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} report generated successfully`);
      setGenerateModalOpen(false);
      await refetch();
    } catch (error: any) {
      console.error("Error generating report:", error);
      toast.error(error.message || "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = currentUser?.role === "owner" || currentUser?.role === "director" || currentUser?.role === "manager";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
            Reports
            <HelpHint term="Reports" context="reports_header" />
          </h1>
          <p className="text-muted-foreground">AI-generated EOS summary reports</p>
        </div>
        {canGenerate && (
          <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate New Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Report Period
                  </label>
                  <Select value={selectedPeriod} onValueChange={(v: "weekly" | "monthly") => setSelectedPeriod(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly Report</SelectItem>
                      <SelectItem value="monthly">Monthly Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setGenerateModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleGenerateReport}
                    disabled={isGenerating}
                  >
                    {isGenerating ? "Generating..." : "Generate"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Report Archive</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={periodFilter} onValueChange={(v: any) => setPeriodFilter(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reports</SelectItem>
                  <SelectItem value="weekly">Weekly Only</SelectItem>
                  <SelectItem value="monthly">Monthly Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : reports && reports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No reports found</p>
              {canGenerate && (
                <Button onClick={() => setGenerateModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Your First Report
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
