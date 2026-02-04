import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, HelpCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgSafetyCheck } from "@/hooks/useOrgSafetyCheck";
import { subDays } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const IDSFollowThroughCard = () => {
  const { orgId } = useOrgSafetyCheck();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["ids-followthrough", orgId],
    queryFn: async () => {
      if (!orgId) return null;

      const ninetyDaysAgo = subDays(new Date(), 90).toISOString();

      // Get all resolved issues in last 90 days
      const { data: issues, error } = await supabase
        .from("issues")
        .select("id, resolution_type, resolved_at")
        .eq("organization_id", orgId)
        .eq("status", "solved")
        .gte("resolved_at", ninetyDaysAgo);

      if (error) throw error;

      const resolved = issues || [];
      
      // Count by resolution type
      const interventionCreated = resolved.filter(i => i.resolution_type === 'intervention_created').length;
      const noIntervention = resolved.filter(i => i.resolution_type === 'no_intervention_needed').length;
      const deferred = resolved.filter(i => i.resolution_type === 'defer').length;
      const unknown = resolved.filter(i => !i.resolution_type || i.resolution_type === 'unknown').length;

      // Denominator excludes defer and unknown
      const denominator = interventionCreated + noIntervention;
      const percentage = denominator > 0 ? Math.round((interventionCreated / denominator) * 100) : 0;

      return {
        total: resolved.length,
        interventionCreated,
        noIntervention,
        deferred,
        unknown,
        denominator,
        percentage,
      };
    },
    enabled: !!orgId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            IDS Follow-through
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-16 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            IDS Follow-through
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-3 h-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Measures how often resolved issues lead to tracked interventions. Higher is better—it means your team is executing on solutions.</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No resolved issues in the last 90 days</p>
        </CardContent>
      </Card>
    );
  }

  const getPercentageColor = (pct: number) => {
    if (pct >= 70) return "text-success";
    if (pct >= 40) return "text-warning";
    return "text-destructive";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          IDS Follow-through
          <Badge variant="outline" className="text-xs font-normal">
            Last 90 days
          </Badge>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="w-3 h-3 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Measures how often resolved issues lead to tracked interventions. Higher is better—it means your team is executing on solutions.</p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${getPercentageColor(stats.percentage)}`}>
            {stats.percentage}%
          </span>
          <span className="text-sm text-muted-foreground">
            ({stats.interventionCreated} of {stats.denominator} issues)
          </span>
        </div>

        <Progress value={stats.percentage} className="h-2" />

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-muted-foreground">Interventions:</span>
            <span className="font-medium">{stats.interventionCreated}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-muted-foreground" />
            <span className="text-muted-foreground">No action:</span>
            <span className="font-medium">{stats.noIntervention}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-muted-foreground">Deferred:</span>
            <span className="font-medium">{stats.deferred}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-muted" />
            <span className="text-muted-foreground">Unknown:</span>
            <span className="font-medium">{stats.unknown}</span>
          </div>
        </div>

        {stats.percentage < 50 && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-warning/10 border border-warning/20">
            <TrendingUp className="w-4 h-4 text-warning mt-0.5" />
            <p className="text-xs text-warning">
              Low follow-through. Consider creating interventions when solving issues to track execution.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
