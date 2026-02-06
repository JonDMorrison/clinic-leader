import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { 
  Database, 
  FileSpreadsheet,
  Upload,
  Loader2,
  Clock,
  TrendingUp,
  BarChart3,
  FileText,
  Calendar,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import LegacyMonthlyReportView, { LegacyMonthPayload } from "@/components/data/LegacyMonthlyReportView";
import YTDDataView from "@/components/data/YTDDataView";
import ExecutiveSummaryCard from "@/components/data/ExecutiveSummaryCard";
import { DataSourceStatusLine } from "@/components/data/DataSourcePill";

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

  // Calculate previous month period key
  const previousPeriodKey = useMemo(() => {
    if (!effectiveSelectedPeriod || isYTDSelected) return null;
    try {
      const [year, month] = effectiveSelectedPeriod.split('-').map(Number);
      const prevDate = new Date(year, month - 2, 1); // month-2 because Date uses 0-indexed months
      return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    } catch {
      return null;
    }
  }, [effectiveSelectedPeriod, isYTDSelected]);

  // Fetch selected month's payload AND previous month for trend comparison
  const { data: reportData, isLoading: reportLoading, error: reportError } = useQuery({
    queryKey: ["legacy-monthly-report", currentUser?.team_id, effectiveSelectedPeriod, previousPeriodKey],
    queryFn: async () => {
      if (!currentUser?.team_id || !effectiveSelectedPeriod || isYTDSelected) return null;
      
      // Fetch current and previous month in parallel
      const periodKeys = previousPeriodKey 
        ? [effectiveSelectedPeriod, previousPeriodKey]
        : [effectiveSelectedPeriod];
      
      const { data, error } = await supabase
        .from("legacy_monthly_reports" as any)
        .select("period_key, payload, updated_at, source_file_name")
        .eq("organization_id", currentUser.team_id)
        .in("period_key", periodKeys);
      
      if (error) {
        console.error("Error fetching report payload:", error);
        throw new Error(error.message);
      }
      
      const records = (data || []) as unknown as { period_key: string; payload: LegacyMonthPayload; updated_at: string; source_file_name: string | null }[];
      const current = records.find(r => r.period_key === effectiveSelectedPeriod);
      const previous = records.find(r => r.period_key === previousPeriodKey);
      
      return current ? {
        payload: current.payload,
        updated_at: current.updated_at,
        source_file_name: current.source_file_name,
        previousPayload: previous?.payload || null,
      } : null;
    },
    enabled: !!currentUser?.team_id && !!effectiveSelectedPeriod && !isYTDSelected,
    retry: 1,
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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-1"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand/10">
            <Database className="w-6 h-6 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Data</h1>
            <p className="text-sm text-muted-foreground">Monthly clinic metrics</p>
          </div>
        </div>
        {/* Data Source Status Line */}
        <DataSourceStatusLine className="mt-2 ml-12" />
      </motion.div>


      {/* Unified Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="flex items-center justify-between gap-4 py-2">
          {/* Left: Period Selector */}
          <Select 
            value={isYTDSelected ? YTD_TAB_VALUE : (effectiveSelectedPeriod || undefined)} 
            onValueChange={setSelectedPeriod}
          >
            <SelectTrigger className="w-[200px]">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {currentYearMonths.length > 0 && (
                <>
                  <SelectItem value={YTD_TAB_VALUE}>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-primary" />
                      <span>{currentYear} YTD</span>
                    </div>
                  </SelectItem>
                  <SelectSeparator />
                </>
              )}
              {[...availableMonths].reverse().map((month) => (
                <SelectItem key={month.period_key} value={month.period_key}>
                  {formatPeriodKey(month.period_key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Center: View Toggle (only for single month) */}
          {!isYTDSelected && reportData?.payload && (
            <ToggleGroup 
              type="single" 
              value={viewTab} 
              onValueChange={(v) => v && setViewTab(v as ViewTab)}
              className="bg-muted/50 rounded-lg p-1"
            >
              <ToggleGroupItem 
                value="summary" 
                aria-label="Executive Summary"
                className="gap-1.5 px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Summary</span>
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="raw" 
                aria-label="Raw Monthly Report"
                className="gap-1.5 px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Raw</span>
              </ToggleGroupItem>
            </ToggleGroup>
          )}

          {/* Right: Metadata + Import */}
          <div className="flex items-center gap-3 ml-auto">
            {reportData && !isYTDSelected && (
              <span className="text-xs text-muted-foreground hidden md:flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {format(parseISO(reportData.updated_at), "MMM d, h:mm a")}
              </span>
            )}
            <Button 
              size="sm" 
              onClick={() => navigate("/imports/monthly-report")}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          </div>
        </div>
      </motion.div>

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
        ) : reportError ? (
          // Error state
          <Card className="border-destructive/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-destructive font-medium mb-2">Failed to load report data</p>
              <p className="text-sm text-muted-foreground max-w-md">
                {reportError instanceof Error ? reportError.message : 'An unexpected error occurred'}
              </p>
            </CardContent>
          </Card>
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
                  previousPayload={reportData.previousPayload}
                />
              ) : (
                <LegacyMonthlyReportView
                  payload={reportData.payload}
                  periodKey={effectiveSelectedPeriod!}
                  updatedAt={reportData.updated_at}
                  organizationId={currentUser?.team_id}
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
              <p className="text-sm text-muted-foreground mt-2">
                Import a monthly report to see data here.
              </p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
