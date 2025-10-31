import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, Users, Building2, Database, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function AdminDemo() {
  const queryClient = useQueryClient();

  const { data: demoProvision, isLoading } = useQuery({
    queryKey: ["demo-provision"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demo_provision")
        .select(`
          *,
          users!inner(id, email, full_name, role)
        `)
        .single();

      if (error) throw error;

      // Fetch team separately
      if (data) {
        const { data: teamData } = await supabase
          .from("teams")
          .select("id, name, is_demo_org")
          .eq("id", data.organization_id)
          .single();
        
        return { ...data, teams: teamData } as typeof data & { teams: typeof teamData };
      }

      return data;
    },
  });

  const { data: demoUsers } = useQuery({
    queryKey: ["demo-users", demoProvision?.organization_id],
    queryFn: async () => {
      if (!demoProvision?.organization_id) return [];

      const { data, error } = await supabase
        .from("users")
        .select("id, email, full_name, role, demo_user")
        .eq("team_id", demoProvision.organization_id);

      if (error) throw error;
      return data;
    },
    enabled: !!demoProvision?.organization_id,
  });

  const { data: janeStatus } = useQuery({
    queryKey: ["jane-status", demoProvision?.organization_id],
    queryFn: async () => {
      if (!demoProvision?.organization_id) return null;

      const { data, error } = await supabase
        .from("jane_integrations")
        .select("status, last_sync, sync_mode, clinic_id")
        .eq("organization_id", demoProvision.organization_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!demoProvision?.organization_id,
  });

  const reseedMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("demo-provision", {
        body: { reset: true },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Demo data re-seeded successfully");
      queryClient.invalidateQueries({ queryKey: ["demo-provision"] });
      queryClient.invalidateQueries({ queryKey: ["demo-users"] });
      queryClient.invalidateQueries({ queryKey: ["jane-status"] });
    },
    onError: (error) => {
      toast.error(`Failed to re-seed: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!demoProvision) {
    return (
      <div className="p-8">
        <Card className="p-6">
          <div className="text-center space-y-4">
            <Database className="w-12 h-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">No Demo Provision Found</h2>
            <p className="text-muted-foreground">
              You need to be logged in as a whitelisted demo user to see this page.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Demo Organization Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your demo clinic data and integrations
          </p>
        </div>
        <Button
          onClick={() => reseedMutation.mutate()}
          disabled={reseedMutation.isPending}
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${reseedMutation.isPending ? 'animate-spin' : ''}`} />
          Re-seed Demo Data
        </Button>
      </div>

      {/* Organization Info */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-brand/10 rounded-lg">
            <Building2 className="w-6 h-6 text-brand" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Organization</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{(demoProvision as any)?.teams?.name}</span>
                {(demoProvision as any)?.teams?.is_demo_org && (
                  <Badge variant="secondary">Demo</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">ID:</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">{demoProvision.organization_id}</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Provisioned:</span>
                <span>{format(new Date(demoProvision.created_at), 'PPp')}</span>
              </div>
              {demoProvision.last_seed_at && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Last Seeded:</span>
                  <span>{format(new Date(demoProvision.last_seed_at), 'PPp')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Demo Users */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-accent/10 rounded-lg">
            <Users className="w-6 h-6 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-4">Demo Users</h3>
            <div className="space-y-3">
              {demoUsers?.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{user.full_name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{user.role}</Badge>
                    {user.demo_user && (
                      <Badge variant="secondary">Demo User</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Jane Integration Status */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${
            janeStatus?.status === 'connected' ? 'bg-green-500/10' : 'bg-red-500/10'
          }`}>
            {janeStatus?.status === 'connected' ? (
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Jane Integration</h3>
            {janeStatus ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={janeStatus.status === 'connected' ? 'default' : 'destructive'}>
                    {janeStatus.status === 'connected' ? 'Connected (Sandbox)' : 'Disconnected'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Clinic ID:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{janeStatus.clinic_id}</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Sync Mode:</span>
                  <span className="capitalize">{janeStatus.sync_mode}</span>
                </div>
                {janeStatus.last_sync && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Last Sync:</span>
                    <span>{format(new Date(janeStatus.last_sync), 'PPp')}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No Jane integration found</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
