import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Database, 
  Shield, 
  Globe, 
  Terminal,
  Key,
  RefreshCw
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface HealthCheckResult {
  env_ok: boolean;
  db_ok: boolean;
  rls_ok: boolean;
  endpoints_ok: boolean;
  console_ok: boolean;
  details: {
    env: { [key: string]: boolean };
    db: { connected: boolean; error?: string };
    rls: { [key: string]: boolean };
    endpoints: { [key: string]: boolean };
    errors: string[];
  };
  timestamp: string;
}

export const SystemHealthCard = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HealthCheckResult | null>(null);
  const { toast } = useToast();

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('system-health', {
        body: { timestamp: new Date().toISOString() }
      });

      if (error) throw error;

      setResult(data);
      
      const allHealthy = data.env_ok && data.db_ok && data.rls_ok && data.endpoints_ok && data.console_ok;
      
      toast({
        title: allHealthy ? "System Healthy ✓" : "Issues Detected",
        description: allHealthy 
          ? "All system checks passed successfully" 
          : `${data.details.errors.length} issue(s) found`,
        variant: allHealthy ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Health check failed:', error);
      toast({
        title: "Health Check Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = ({ ok }: { ok: boolean }) => (
    ok ? (
      <CheckCircle2 className="w-5 h-5 text-success" />
    ) : (
      <XCircle className="w-5 h-5 text-danger" />
    )
  );

  const CategoryCard = ({ 
    title, 
    ok, 
    icon: Icon, 
    details 
  }: { 
    title: string; 
    ok: boolean; 
    icon: any; 
    details?: React.ReactNode 
  }) => (
    <div className="glass rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-muted-foreground" />
          <span className="font-semibold">{title}</span>
        </div>
        <StatusIcon ok={ok} />
      </div>
      {details && <div className="text-sm text-muted-foreground">{details}</div>}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-6 h-6 text-brand" />
            <CardTitle>System Health Check</CardTitle>
          </div>
          <Button 
            onClick={runHealthCheck} 
            disabled={loading}
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Run Check
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!result ? (
          <div className="text-center py-8 text-muted-foreground">
            Click "Run Check" to verify system health
          </div>
        ) : (
          <>
            {/* Overall Status */}
            <div className="flex items-center justify-between p-4 glass rounded-2xl">
              <div>
                <h3 className="font-semibold text-lg">Overall Status</h3>
                <p className="text-sm text-muted-foreground">
                  Last checked: {new Date(result.timestamp).toLocaleString()}
                </p>
              </div>
              <Badge 
                variant={
                  result.env_ok && result.db_ok && result.rls_ok && result.endpoints_ok && result.console_ok
                    ? "default"
                    : "destructive"
                }
                className="text-lg px-4 py-2"
              >
                {result.env_ok && result.db_ok && result.rls_ok && result.endpoints_ok && result.console_ok
                  ? "Healthy"
                  : "Issues Detected"}
              </Badge>
            </div>

            {/* Detailed Checks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CategoryCard
                title="Environment Variables"
                ok={result.env_ok}
                icon={Key}
                details={
                  <div className="space-y-1">
                    {Object.entries(result.details.env).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span>{key}</span>
                        {value ? (
                          <CheckCircle2 className="w-3 h-3 text-success" />
                        ) : (
                          <XCircle className="w-3 h-3 text-danger" />
                        )}
                      </div>
                    ))}
                  </div>
                }
              />

              <CategoryCard
                title="Database"
                ok={result.db_ok}
                icon={Database}
                details={
                  result.details.db.connected ? (
                    <span className="text-success">Connected</span>
                  ) : (
                    <span className="text-danger">{result.details.db.error || "Disconnected"}</span>
                  )
                }
              />

              <CategoryCard
                title="RLS Policies"
                ok={result.rls_ok}
                icon={Shield}
                details={
                  <div className="space-y-1">
                    {Object.entries(result.details.rls).slice(0, 4).map(([table, enabled]) => (
                      <div key={table} className="flex items-center justify-between text-xs">
                        <span>{table}</span>
                        {enabled ? (
                          <CheckCircle2 className="w-3 h-3 text-success" />
                        ) : (
                          <XCircle className="w-3 h-3 text-danger" />
                        )}
                      </div>
                    ))}
                  </div>
                }
              />

              <CategoryCard
                title="Edge Functions"
                ok={result.endpoints_ok}
                icon={Globe}
                details={
                  <div className="space-y-1">
                    {Object.entries(result.details.endpoints).map(([func, ok]) => (
                      <div key={func} className="flex items-center justify-between text-xs">
                        <span className="truncate">{func}</span>
                        {ok ? (
                          <CheckCircle2 className="w-3 h-3 text-success" />
                        ) : (
                          <XCircle className="w-3 h-3 text-danger" />
                        )}
                      </div>
                    ))}
                  </div>
                }
              />
            </div>

            {/* Errors */}
            {result.details.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="font-semibold mb-2">Issues Found:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {result.details.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
