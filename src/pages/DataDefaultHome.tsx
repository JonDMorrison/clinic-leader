import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Database, 
  FileSpreadsheet,
  Upload,
  Calendar,
  Loader2,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";

export default function DataDefaultHome() {
  const navigate = useNavigate();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  // Fetch latest legacy_monthly_reports for current org
  const { data: latestReport, isLoading: reportLoading } = useQuery({
    queryKey: ["legacy-monthly-reports", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return null;
      
      const { data, error } = await supabase
        .from("legacy_monthly_reports")
        .select("id, period_key, source_file_name, created_at, updated_at")
        .eq("organization_id", currentUser.team_id)
        .order("period_key", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching legacy reports:", error);
        return null;
      }
      
      return data;
    },
    enabled: !!currentUser?.team_id,
  });

  // Fetch count of all reports for this org
  const { data: reportCount } = useQuery({
    queryKey: ["legacy-monthly-reports-count", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return 0;
      
      const { count, error } = await supabase
        .from("legacy_monthly_reports")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", currentUser.team_id);
      
      if (error) {
        console.error("Error fetching report count:", error);
        return 0;
      }
      
      return count || 0;
    },
    enabled: !!currentUser?.team_id,
  });

  const isLoading = userLoading || reportLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  // Format period_key (YYYY-MM) to readable month
  const formatPeriodKey = (periodKey: string) => {
    try {
      const date = parseISO(`${periodKey}-01`);
      return format(date, "MMMM yyyy");
    } catch {
      return periodKey;
    }
  };

  // Empty state - no reports uploaded yet
  if (!latestReport) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="p-3 rounded-xl bg-brand/10">
            <Database className="w-8 h-8 text-brand" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Data</h1>
            <p className="text-muted-foreground">Monthly clinic metrics from your workbook</p>
          </div>
        </motion.div>

        {/* Empty State Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <FileSpreadsheet className="w-12 h-12 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No Monthly Reports Yet</h2>
              <p className="text-muted-foreground max-w-md mb-6">
                Upload your monthly Excel workbook to start tracking clinic metrics. 
                Your data will appear here organized by month.
              </p>
              <Button onClick={() => navigate("/imports/monthly-report")} size="lg">
                <Upload className="w-4 h-4 mr-2" />
                Import Monthly Report
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Has reports - show dashboard shell
  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-brand/10">
            <Database className="w-8 h-8 text-brand" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Data</h1>
            <p className="text-muted-foreground">Monthly clinic metrics from your workbook</p>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1.5 py-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Latest: {formatPeriodKey(latestReport.period_key)}
          </Badge>
          <Badge variant="outline" className="gap-1.5 py-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            {reportCount} month{reportCount !== 1 ? "s" : ""} tracked
          </Badge>
          <Button variant="outline" size="sm" onClick={() => navigate("/imports/monthly-report")}>
            <Upload className="w-4 h-4 mr-2" />
            Import New
          </Button>
        </div>
      </motion.div>

      {/* Dashboard Shell - Placeholder for full implementation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {formatPeriodKey(latestReport.period_key)} Report
            </CardTitle>
            <CardDescription>
              {latestReport.source_file_name 
                ? `Imported from: ${latestReport.source_file_name}`
                : "Monthly metrics data"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-4">
                Dashboard rendering coming soon. Your data is stored and ready to display.
              </p>
              <Button variant="outline" onClick={() => navigate("/scorecard")}>
                View Scorecard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:border-brand/30 transition-colors cursor-pointer" onClick={() => navigate("/imports/monthly-report")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-brand" />
              Import Another Month
            </CardTitle>
            <CardDescription>
              Upload a new monthly workbook to add more data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Go to Import
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-brand/30 transition-colors cursor-pointer" onClick={() => navigate("/scorecard")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand" />
              View Scorecard
            </CardTitle>
            <CardDescription>
              See your metrics on the weekly scorecard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Open Scorecard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
