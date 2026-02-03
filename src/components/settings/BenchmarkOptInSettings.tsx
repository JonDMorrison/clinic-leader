/**
 * Benchmark Opt-In Settings Component
 * 
 * PRIVACY: Allows org admins to control cross-org learning participation.
 * All changes are audited to benchmark_audit_log.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, Users, Lock, Eye, EyeOff, Info } from "lucide-react";
import { toast } from "sonner";

export function BenchmarkOptInSettings() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const organizationId = currentUser?.team_id;
  const canManage = currentUser?.role && ["admin", "owner", "director"].includes(currentUser.role);

  const { data: optInStatus, isLoading } = useQuery({
    queryKey: ["benchmark-opt-in", organizationId],
    queryFn: async () => {
      if (!organizationId) return false;
      const { data, error } = await supabase.rpc("get_org_benchmark_opt_in", {
        _org_id: organizationId,
      });
      if (error) throw error;
      return data as boolean;
    },
    enabled: !!organizationId,
  });

  const updateOptIn = useMutation({
    mutationFn: async (optIn: boolean) => {
      if (!organizationId) throw new Error("No organization");
      const { data, error } = await supabase.rpc("set_org_benchmark_opt_in", {
        _org_id: organizationId,
        _opt_in: optIn,
      });
      if (error) throw error;
      return data;
    },
    onMutate: () => setIsUpdating(true),
    onSuccess: (_, optIn) => {
      queryClient.invalidateQueries({ queryKey: ["benchmark-opt-in"] });
      toast.success(
        optIn
          ? "Opted in to cross-organization benchmarking"
          : "Opted out of cross-organization benchmarking"
      );
    },
    onError: (error) => {
      console.error("Failed to update opt-in:", error);
      toast.error("Failed to update benchmark participation");
    },
    onSettled: () => setIsUpdating(false),
  });

  if (!canManage) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Cross-Organization Benchmarking</CardTitle>
        </div>
        <CardDescription>
          Control whether your organization's anonymized data contributes to network-wide benchmarks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            {optInStatus ? (
              <Eye className="h-5 w-5 text-primary" />
            ) : (
              <EyeOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <Label htmlFor="benchmark-opt-in" className="text-base font-medium">
                Participate in Network Benchmarks
              </Label>
              <p className="text-sm text-muted-foreground">
                {optInStatus
                  ? "Your anonymized metrics contribute to aggregate comparisons"
                  : "Your data is not included in cross-org analyses"}
              </p>
            </div>
          </div>
          <Switch
            id="benchmark-opt-in"
            checked={optInStatus ?? false}
            onCheckedChange={(checked) => updateOptIn.mutate(checked)}
            disabled={isLoading || isUpdating}
          />
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Current status:</span>
          <Badge variant={optInStatus ? "default" : "secondary"}>
            {optInStatus ? "Opted In" : "Opted Out"}
          </Badge>
        </div>

        {/* Privacy Information */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>What data is shared</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>
                <strong>Anonymized metrics only</strong> — No clinic names, staff names, or patient data
              </li>
              <li>
                <strong>Aggregate statistics</strong> — Your values are combined with 5+ other organizations
              </li>
              <li>
                <strong>Minimum 5 org suppression</strong> — Results are hidden if fewer than 5 orgs participate
              </li>
              <li>
                <strong>No raw values disclosed</strong> — Only percentile rankings and cohort medians shown
              </li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* What you get */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-medium">When Opted In</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• See your ranking vs. similar clinics</li>
              <li>• Compare to Jane vs. non-Jane benchmarks</li>
              <li>• Access peer-matched comparisons</li>
              <li>• Receive data-driven recommendations</li>
            </ul>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">When Opted Out</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• View only your own data</li>
              <li>• No contribution to network stats</li>
              <li>• Limited benchmark visibility</li>
              <li>• Can opt in anytime</li>
            </ul>
          </div>
        </div>

        {/* Audit notice */}
        <p className="text-xs text-muted-foreground border-t pt-4">
          Changes to this setting are logged for compliance purposes. Your organization can view opt-in history in the audit log.
        </p>
      </CardContent>
    </Card>
  );
}
