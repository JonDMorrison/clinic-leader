/**
 * InterventionTypeBackfillPanel
 * 
 * Master admin only panel for backfilling intervention types on historical data.
 * Shows progress, stats, and detailed results.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Bot,
  User,
  RotateCw,
  Loader2,
  Tag,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { useMasterAdmin } from "@/hooks/useMasterAdmin";
import {
  backfillInterventionTypes,
  getUntypedInterventionCount,
  getInterventionTypeStats,
  type BackfillProgress,
  type BackfillResult,
  type BackfillDetail,
} from "@/lib/interventions/backfillInterventionTypes";

export function InterventionTypeBackfillPanel() {
  const { data: isMasterAdmin, isLoading: isAdminLoading } = useMasterAdmin();
  const queryClient = useQueryClient();
  
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<BackfillProgress | null>(null);
  const [lastResult, setLastResult] = useState<BackfillResult | null>(null);

  // Fetch stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["intervention-type-stats"],
    queryFn: getInterventionTypeStats,
    staleTime: 30_000, // 30 seconds
    enabled: !!isMasterAdmin,
  });

  const handleRunBackfill = async () => {
    if (!isMasterAdmin) {
      toast.error("Master admin access required");
      return;
    }

    setIsRunning(true);
    setProgress(null);
    setLastResult(null);

    try {
      const result = await backfillInterventionTypes((p) => {
        setProgress({ ...p });
      });

      setLastResult(result);
      
      if (result.success) {
        toast.success(`Backfill complete: ${result.progress.updated} interventions updated`);
      } else {
        toast.error(result.message);
      }

      // Refresh stats
      refetchStats();
      queryClient.invalidateQueries({ queryKey: ["interventions"] });

    } catch (err) {
      console.error("Backfill error:", err);
      toast.error("Backfill failed unexpectedly");
    } finally {
      setIsRunning(false);
    }
  };

  // Access guard
  if (isAdminLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking access...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isMasterAdmin) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              Master admin access is required to run backfill operations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const totalTyped = (stats?.aiSuggested || 0) + (stats?.userSelected || 0) + (stats?.aiBackfilled || 0);
  const totalInterventions = totalTyped + (stats?.untyped || 0);
  const typedPercent = totalInterventions > 0 ? Math.round((totalTyped / totalInterventions) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Intervention Type Backfill
        </CardTitle>
        <CardDescription>
          Classify historical interventions using AI. Requires 70%+ confidence for backfill.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Untyped"
            value={stats?.untyped || 0}
            icon={<AlertTriangle className="h-4 w-4 text-warning" />}
            loading={statsLoading}
          />
          <StatCard
            label="AI Suggested"
            value={stats?.aiSuggested || 0}
            icon={<Bot className="h-4 w-4 text-primary" />}
            loading={statsLoading}
          />
          <StatCard
            label="User Selected"
            value={stats?.userSelected || 0}
            icon={<User className="h-4 w-4 text-muted-foreground" />}
            loading={statsLoading}
          />
          <StatCard
            label="AI Backfilled"
            value={stats?.aiBackfilled || 0}
            icon={<RotateCw className="h-4 w-4 text-secondary-foreground" />}
            loading={statsLoading}
          />
        </div>

        {/* Coverage Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Type Coverage</span>
            <span className="font-medium">{typedPercent}%</span>
          </div>
          <Progress value={typedPercent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {totalTyped} of {totalInterventions} interventions have types assigned
          </p>
        </div>

        <Separator />

        {/* Action Button */}
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleRunBackfill} 
            disabled={isRunning || (stats?.untyped || 0) === 0}
            className="flex-1"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Backfill Types (50 at a time)
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => refetchStats()}
            disabled={isRunning || statsLoading}
          >
            <RefreshCw className={`h-4 w-4 ${statsLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Running Progress */}
        {isRunning && progress && (
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Processing interventions...</span>
              <Badge variant="outline">
                {progress.processed} / {Math.min(50, progress.totalUntyped)}
              </Badge>
            </div>
            <Progress 
              value={(progress.processed / Math.min(50, progress.totalUntyped)) * 100} 
              className="h-2"
            />
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                <span>Updated: {progress.updated}</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-warning" />
                <span>Low conf: {progress.skippedLowConfidence}</span>
              </div>
              <div className="flex items-center gap-1">
                <User className="h-3 w-3 text-muted-foreground" />
                <span>Skipped: {progress.skippedAlreadyTyped}</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-destructive" />
                <span>Errors: {progress.errors}</span>
              </div>
            </div>
          </div>
        )}

        {/* Last Result */}
        {lastResult && !isRunning && (
          <div className="space-y-3">
            <Alert variant={lastResult.success ? "default" : "destructive"}>
              {lastResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>{lastResult.success ? "Backfill Complete" : "Backfill Failed"}</AlertTitle>
              <AlertDescription>{lastResult.message}</AlertDescription>
            </Alert>

            {lastResult.details && lastResult.details.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Details</p>
                <ScrollArea className="h-48 rounded-md border">
                  <div className="p-2 space-y-1">
                    {lastResult.details.map((detail, i) => (
                      <DetailRow key={i} detail={detail} />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ 
  label, 
  value, 
  icon, 
  loading 
}: { 
  label: string; 
  value: number; 
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <p className="text-xl font-semibold">{value.toLocaleString()}</p>
      )}
    </div>
  );
}

function DetailRow({ detail }: { detail: BackfillDetail }) {
  const getIcon = () => {
    switch (detail.action) {
      case "updated":
        return <CheckCircle2 className="h-3 w-3 text-primary" />;
      case "skipped_low_confidence":
        return <AlertTriangle className="h-3 w-3 text-warning" />;
      case "skipped_already_typed":
        return <User className="h-3 w-3 text-muted-foreground" />;
      case "error":
        return <XCircle className="h-3 w-3 text-destructive" />;
    }
  };

  const getLabel = () => {
    switch (detail.action) {
      case "updated":
        return (
          <span>
            → <span className="font-medium">{detail.typeName}</span>
            <span className="text-muted-foreground ml-1">({detail.confidence}%)</span>
          </span>
        );
      case "skipped_low_confidence":
        return <span className="text-muted-foreground">Low confidence ({detail.confidence}%)</span>;
      case "skipped_already_typed":
        return <span className="text-muted-foreground">Already typed</span>;
      case "error":
        return <span className="text-destructive">{detail.error}</span>;
    }
  };

  return (
    <div className="flex items-start gap-2 text-xs py-1 border-b last:border-0">
      {getIcon()}
      <span className="truncate flex-1 font-medium">{detail.title}</span>
      {getLabel()}
    </div>
  );
}
