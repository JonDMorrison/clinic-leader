import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JaneConnectWizard } from "@/components/integrations/JaneConnectWizard";
import { Cloud, CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function JaneIntegration() {
  const [showWizard, setShowWizard] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Get user's team
  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Not authenticated");
      
      const { data } = await supabase
        .from("users")
        .select("team_id")
        .eq("email", user.email)
        .single();
      
      return data;
    },
  });

  // Get integration status
  const { data: integration, refetch: refetchIntegration } = useQuery({
    queryKey: ["janeIntegration", user?.team_id],
    queryFn: async () => {
      if (!user?.team_id) return null;
      
      const { data } = await supabase
        .from("jane_integrations")
        .select("*")
        .eq("team_id", user.team_id)
        .maybeSingle();
      
      return data;
    },
    enabled: !!user?.team_id,
  });

  // Get recent sync logs
  const { data: syncLogs } = useQuery({
    queryKey: ["janeSyncLogs", integration?.id],
    queryFn: async () => {
      if (!integration?.id) return [];
      
      const { data } = await supabase
        .from("jane_sync_logs")
        .select("*")
        .eq("integration_id", integration.id)
        .order("created_at", { ascending: false })
        .limit(5);
      
      return data || [];
    },
    enabled: !!integration?.id,
  });

  const handleForceSync = async () => {
    if (!user?.team_id) return;
    
    setIsSyncing(true);
    try {
      await supabase.functions.invoke("jane-sync", {
        body: { teamId: user.team_id, immediate: true },
      });
      
      toast.success("Sync started successfully");
      setTimeout(() => refetchIntegration(), 2000);
    } catch (error) {
      toast.error("Sync failed to start");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!integration?.id) return;
    
    await supabase
      .from("jane_integrations")
      .update({ status: "disconnected" })
      .eq("id", integration.id);
    
    toast.success("Jane integration disconnected");
    refetchIntegration();
  };

  if (!integration || integration.status === "disconnected") {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <div className="max-w-2xl mx-auto">
          {!showWizard ? (
            <Card className="bg-background/95 backdrop-blur-xl border-border/20">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Cloud className="w-8 h-8 text-primary" />
                  <CardTitle>Connect to Jane App</CardTitle>
                </div>
                <CardDescription>
                  Sync your patients, appointments, and financial data directly from Jane — securely, automatically, and without spreadsheets.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowWizard(true)} size="lg" className="w-full">
                  Connect Jane
                </Button>
              </CardContent>
            </Card>
          ) : (
            <JaneConnectWizard
              teamId={user?.team_id || ""}
              onComplete={() => {
                setShowWizard(false);
                refetchIntegration();
              }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Jane App Integration</h1>
          <p className="text-muted-foreground">
            Connected and syncing automatically
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleForceSync}
            disabled={isSyncing}
            variant="outline"
          >
            {isSyncing ? "Syncing..." : "Force Sync Now"}
          </Button>
          <Button onClick={handleDisconnect} variant="destructive">
            Disconnect
          </Button>
        </div>
      </div>

      {/* Connection Status Dashboard */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-background/95 backdrop-blur-xl border-border/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {integration.status === "connected" ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-2xl font-bold">Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-2xl font-bold">Disconnected</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background/95 backdrop-blur-xl border-border/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {integration.last_sync
                  ? format(new Date(integration.last_sync), "MMM d, h:mm a")
                  : "Never"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background/95 backdrop-blur-xl border-border/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Next Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold">
                {integration.sync_mode === "manual"
                  ? "Manual"
                  : integration.next_sync
                  ? format(new Date(integration.next_sync), "MMM d, h:mm a")
                  : "Scheduled"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background/95 backdrop-blur-xl border-border/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Records Synced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold">
                {syncLogs?.[0]?.records_synced || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sync Activity */}
      <Card className="bg-background/95 backdrop-blur-xl border-border/20">
        <CardHeader>
          <CardTitle>Recent Sync Activity</CardTitle>
          <CardDescription>
            View the history of your Jane App data syncs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {syncLogs && syncLogs.length > 0 ? (
              syncLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    {log.status === "completed" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : log.status === "failed" ? (
                      <XCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-500" />
                    )}
                    <div>
                      <p className="font-medium capitalize">{log.sync_type} Sync</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={log.status === "completed" ? "default" : "destructive"}>
                      {log.status}
                    </Badge>
                    {log.records_synced > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {log.records_synced} records
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No sync activity yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync Configuration */}
      <Card className="bg-background/95 backdrop-blur-xl border-border/20">
        <CardHeader>
          <CardTitle>Sync Configuration</CardTitle>
          <CardDescription>
            Manage what data is synced from Jane App
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
              <span className="font-medium">Data Types</span>
              <div className="flex gap-2">
                {integration.sync_scope.map((scope: string) => (
                  <Badge key={scope} variant="secondary">
                    {scope}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
              <span className="font-medium">Sync Mode</span>
              <Badge variant="outline" className="capitalize">
                {integration.sync_mode}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
              <span className="font-medium">Clinic ID</span>
              <span className="text-sm text-muted-foreground">
                {integration.clinic_id || "Auto-detected"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Info */}
      <Card className="bg-background/95 backdrop-blur-xl border-border/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            Secure API Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            ✓ API key stored encrypted
          </p>
          <p className="text-sm text-muted-foreground">
            ✓ No PHI stored - only operational summaries
          </p>
          <p className="text-sm text-muted-foreground">
            ✓ Automatic daily sync at 2:00 AM
          </p>
          <p className="text-sm text-muted-foreground">
            ✓ Real-time KPI updates
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
