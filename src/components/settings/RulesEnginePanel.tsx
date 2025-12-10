import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Zap, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const RulesEnginePanel = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<{
    issuesCreated: number;
    issues: string[];
  } | null>(null);

  const handleRunRules = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('rules-weekly');

      if (error) throw error;

      setLastRun(data);
      toast.success(`Rules engine completed. Created ${data.issuesCreated} issues.`);
      console.log('Rules engine results:', data);
    } catch (error: any) {
      toast.error(error.message || 'Rules engine failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-brand" />
            <CardTitle>KPI Rules Engine</CardTitle>
          </div>
          <Button onClick={handleRunRules} disabled={isRunning} size="sm">
            <Play className="w-4 h-4 mr-2" />
            {isRunning ? 'Running...' : 'Run Now'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Active Rules</h4>
          
          <div className="p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  KPI Target Miss Alert
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Creates issue if KPI misses target 2 consecutive weeks → Assigned to KPI owner
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Document Acknowledgment Alert
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Creates issue if doc has &lt;95% ack rate by Friday 3pm → Assigned to Clinic Director
                </p>
              </div>
            </div>
          </div>
        </div>

        {lastRun && (
          <div className="p-4 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="success">Last Run</Badge>
              <span className="text-xs text-muted-foreground">
                {lastRun.issuesCreated} issues created
              </span>
            </div>
            {lastRun.issues.length > 0 && (
              <div className="space-y-1 mt-3">
                {lastRun.issues.map((issue, idx) => (
                  <p key={idx} className="text-xs text-foreground">
                    • {issue}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground">
            <strong>Schedule:</strong> This runs weekly via cron. Use "Run Now" to test rules manually.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
