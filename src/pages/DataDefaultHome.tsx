import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Database, 
  FileSpreadsheet,
  Upload,
  Loader2,
  Clock,
  TrendingUp,
  BarChart3,
  FileText,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import LegacyMonthlyReportView, { LegacyMonthPayload } from "@/components/data/LegacyMonthlyReportView";
import YTDDataView from "@/components/data/YTDDataView";
import ExecutiveSummaryCard from "@/components/data/ExecutiveSummaryCard";

const YTD_TAB_VALUE = "ytd";

type ViewTab = "summary" | "raw";

export default function DataDefaultHome() {
  const navigate = useNavigate();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<ViewTab>("summary");

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

  // Determine current year for YTD calculation
  const currentYear = new Date().getFullYear();
  
  // Filter months for current year (for YTD)
  const currentYearMonths = useMemo(() => {
    if (!availableMonths) return [];
    return availableMonths.filter(m => m.period_key.startsWith(String(currentYear)));
  }, [availableMonths, currentYear]);

  // Set default selected period to latest (or YTD if months exist)
  const effectiveSelectedPeriod = selectedPeriod || 
    (availableMonths && availableMonths.length > 0 
      ? availableMonths[availableMonths.length - 1].period_key 
      : null);

  const isYTDSelected = effectiveSelectedPeriod === YTD_TAB_VALUE || selectedPeriod === YTD_TAB_VALUE;

  // Fetch selected month's payload (single month)
  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ["legacy-monthly-report", currentUser?.team_id, effectiveSelectedPeriod],
    queryFn: async () => {
      if (!currentUser?.team_id || !effectiveSelectedPeriod || isYTDSelected) return null;
      
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
    enabled: !!currentUser?.team_id && !!effectiveSelectedPeriod && !isYTDSelected,
  });

  // Fetch all months for YTD view
  const { data: ytdPayloads, isLoading: ytdLoading } = useQuery({
    queryKey: ["legacy-monthly-report-ytd", currentUser?.team_id, currentYear],
    queryFn: async () => {
      if (!currentUser?.team_id || currentYearMonths.length === 0) return [];
      
      const periodKeys = currentYearMonths.map(m => m.period_key);
      
      const { data, error } = await supabase
        .from("legacy_monthly_reports" as any)
        .select("period_key, payload")
        .eq("organization_id", currentUser.team_id)
        .in("period_key", periodKeys);
      
      if (error) {
        console.error("Error fetching YTD payloads:", error);
        return [];
      }
      
      return (data || []) as unknown as { period_key: string; payload: LegacyMonthPayload }[];
    },
    enabled: !!currentUser?.team_id && isYTDSelected && currentYearMonths.length > 0,
  });

  const isLoading = userLoading || monthsLoading;
  const contentLoading = isYTDSelected ? ytdLoading : reportLoading;
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
      {/* Simplified Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand/10">
            <Database className="w-6 h-6 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Data</h1>
            <p className="text-sm text-muted-foreground">Monthly metrics</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate("/imports/monthly-report")}>
          <Upload className="w-4 h-4 mr-2" />
          Import
        </Button>
      </motion.div>

      {/* Month Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Tabs 
          value={isYTDSelected ? YTD_TAB_VALUE : (effectiveSelectedPeriod || undefined)} 
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
            {/* YTD Tab - only show if we have current year data */}
            {currentYearMonths.length > 0 && (
              <TabsTrigger 
                value={YTD_TAB_VALUE}
                className="whitespace-nowrap ml-2 bg-brand/5 data-[state=active]:bg-brand data-[state=active]:text-brand-foreground"
              >
                <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                {currentYear} YTD
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </motion.div>

      {/* View Toggle (Summary vs Raw) - only for single month view */}
      {!isYTDSelected && reportData?.payload && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as ViewTab)} className="w-full">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="summary" className="gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Executive Summary
                </TabsTrigger>
                <TabsTrigger value="raw" className="gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Raw Monthly Report
                </TabsTrigger>
              </TabsList>
              
              {/* Compact report header */}
              <div className="text-sm text-muted-foreground flex items-center gap-3">
                <span>
                  {formatPeriodKey(effectiveSelectedPeriod!)}
                  {reportData.source_file_name && (
                    <span className="ml-2 text-xs">• {reportData.source_file_name}</span>
                  )}
                </span>
                <span className="flex items-center gap-1.5 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  {format(parseISO(reportData.updated_at), "MMM d, h:mm a")}
                </span>
              </div>
            </div>
          </Tabs>
        </motion.div>
      )}

      {/* Report Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {contentLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
          </div>
        ) : isYTDSelected ? (
          // YTD View
          <YTDDataView
            payloads={ytdPayloads?.map(p => p.payload) || []}
            periodKeys={ytdPayloads?.map(p => p.period_key) || []}
            year={currentYear}
          />
        ) : reportData?.payload ? (
          <Card>
            <CardContent className="pt-6">
              {viewTab === "summary" ? (
                <ExecutiveSummaryCard
                  payload={reportData.payload}
                  periodKey={effectiveSelectedPeriod!}
                />
              ) : (
                <LegacyMonthlyReportView
                  payload={reportData.payload}
                  periodKey={effectiveSelectedPeriod!}
                  updatedAt={reportData.updated_at}
                />
              )}
            </CardContent>
          </Card>
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
    </div>
  );
}
