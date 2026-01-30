import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Database, 
  FileSpreadsheet,
  Upload,
  Calendar,
  Loader2,
  ArrowRight,
  BarChart3,
  Clock,
  RefreshCw,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import LegacyMonthlyReportView, { LegacyMonthPayload } from "@/components/data/LegacyMonthlyReportView";

export default function DataDefaultHome() {
  const navigate = useNavigate();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  // Fetch all available months for current org
  const { data: availableMonths, isLoading: monthsLoading } = useQuery({
    queryKey: ["legacy-monthly-reports-months", currentUser?.team_id],
    queryFn: async () => {
      if (!currentUser?.team_id) return [];
      
      const { data, error } = await supabase
        .from("legacy_monthly_reports" as any)
        .select("period_key, updated_at")
        .eq("organization_id", currentUser.team_id)
        .order("period_key", { ascending: true });
      
      if (error) {
        console.error("Error fetching legacy reports:", error);
        return [];
      }
      
      return (data || []) as unknown as { period_key: string; updated_at: string }[];
    },
    enabled: !!currentUser?.team_id,
  });

  // Set default selected period to latest
  const effectiveSelectedPeriod = selectedPeriod || 
    (availableMonths && availableMonths.length > 0 
      ? availableMonths[availableMonths.length - 1].period_key 
      : null);

  // Fetch selected month's payload
  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ["legacy-monthly-report", currentUser?.team_id, effectiveSelectedPeriod],
    queryFn: async () => {
      if (!currentUser?.team_id || !effectiveSelectedPeriod) return null;
      
      const { data, error } = await supabase
        .from("legacy_monthly_reports" as any)
        .select("payload, updated_at, source_file_name")
        .eq("organization_id", currentUser.team_id)
        .eq("period_key", effectiveSelectedPeriod)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching report payload:", error);
        return null;
      }
      
      return data as unknown as { payload: LegacyMonthPayload; updated_at: string; source_file_name: string | null } | null;
    },
    enabled: !!currentUser?.team_id && !!effectiveSelectedPeriod,
  });

  const isLoading = userLoading || monthsLoading;

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

  // Short month format for tabs
  const formatPeriodShort = (periodKey: string) => {
    try {
      const date = parseISO(`${periodKey}-01`);
      return format(date, "MMM ''yy");
    } catch {
      return periodKey;
    }
  };

  // Empty state - no reports uploaded yet
  if (!availableMonths || availableMonths.length === 0) {
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

  // Has reports - show dashboard with month tabs
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

        {/* Status badges & actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="gap-1.5 py-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Updated monthly
          </Badge>
          <Badge variant="outline" className="gap-1.5 py-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            {availableMonths.length} month{availableMonths.length !== 1 ? "s" : ""} tracked
          </Badge>
          <Button variant="outline" size="sm" onClick={() => navigate("/imports/monthly-report")}>
            <Upload className="w-4 h-4 mr-2" />
            Import New
          </Button>
        </div>
      </motion.div>

      {/* Month Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Tabs 
          value={effectiveSelectedPeriod || undefined} 
          onValueChange={setSelectedPeriod}
          className="w-full"
        >
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
            {availableMonths.map((month) => (
              <TabsTrigger 
                key={month.period_key} 
                value={month.period_key}
                className="whitespace-nowrap"
              >
                {formatPeriodShort(month.period_key)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Report Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {reportLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-brand" />
            </CardContent>
          </Card>
        ) : reportData?.payload ? (
          <div className="space-y-4">
            {/* Report header with metadata */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
              <div>
                <h2 className="text-xl font-semibold">
                  {formatPeriodKey(effectiveSelectedPeriod!)}
                </h2>
                {reportData.source_file_name && (
                  <p className="text-sm text-muted-foreground">
                    Source: {reportData.source_file_name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Last updated: {format(parseISO(reportData.updated_at), "MMM d, yyyy 'at' h:mm a")}
              </div>
            </div>

            {/* The actual report view */}
            <LegacyMonthlyReportView
              payload={reportData.payload}
              periodKey={effectiveSelectedPeriod!}
              updatedAt={reportData.updated_at}
            />
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground">
                No data found for {effectiveSelectedPeriod && formatPeriodKey(effectiveSelectedPeriod)}
              </p>
            </CardContent>
          </Card>
        )}
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
