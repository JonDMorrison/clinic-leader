import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  FileSpreadsheet,
  ArrowLeft,
  Database,
  Loader2,
} from "lucide-react";
import JaneSetupWizard from "@/components/integrations/JaneSetupWizard";
import JaneConnectionSummary from "@/components/integrations/JaneConnectionSummary";
import DataDeliveryHistory from "@/components/integrations/DataDeliveryHistory";

export default function JaneIntegration() {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const orgId = currentUser?.team_id;

  // Check for existing bulk analytics connector for Jane
  const { data: connector, isLoading } = useQuery({
    queryKey: ["jane-bulk-connector", orgId],
    queryFn: async () => {
      if (!orgId) return null;

      const { data, error } = await supabase
        .from("bulk_analytics_connectors")
        .select("*")
        .eq("organization_id", orgId)
        .eq("source_system", "jane")
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Fetch recent file ingest logs
  const { data: recentIngests } = useQuery({
    queryKey: ["jane-ingest-logs", orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("file_ingest_log")
        .select("*")
        .eq("organization_id", orgId)
        .eq("source_system", "jane")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  // Determine if setup is complete (receiving data with actual evidence)
  const isSetupComplete = connector?.last_received_at && connector?.last_processed_at;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/settings/integrations")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-primary" />
            Jane Bulk Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Scheduled, read-only data delivery for leadership reporting
          </p>
        </div>
      </div>

      {/* Main Description Card - Only show during setup */}
      {!isSetupComplete && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="font-medium text-lg">
                  Leadership analytics from your Jane data
                </p>
                <p className="text-muted-foreground">
                  Connect your Jane clinic to automatically update your ClinicLeader scorecards.
                  No credentials or login required — Jane delivers data directly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content: Either Wizard or Summary */}
      {isSetupComplete && connector ? (
        <>
          <JaneConnectionSummary 
            connector={connector} 
            recentIngests={recentIngests || []} 
          />
          {/* Data Delivery History - Audit Trail */}
          {orgId && (
            <DataDeliveryHistory organizationId={orgId} />
          )}
        </>
      ) : (
        <JaneSetupWizard 
          connector={connector} 
          orgId={orgId || ""} 
          recentIngests={recentIngests || []} 
        />
      )}
    </div>
  );
}
