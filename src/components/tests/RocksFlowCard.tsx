import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, PlayCircle } from "lucide-react";

interface TestResult {
  passed: number;
  total: number;
  success_rate: number;
  rocks_flow: boolean;
  kpi_flow: boolean;
  issues_flow: boolean;
  meeting_flow: boolean;
  permissions_correct: boolean;
  details: any;
}

export const RocksFlowCard = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const runTest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('rocks-flow');
      
      if (error) throw error;
      
      setResult(data);
      
      if (data.success_rate === 100) {
        toast.success("All Rocks & Meetings tests passed!");
      } else {
        toast.warning(`Tests completed with ${data.passed}/${data.total} passing`);
      }
    } catch (error) {
      console.error('Error running rocks flow test:', error);
      toast.error("Failed to run test");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Rocks & Meetings Flow</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Test core EOS features and permissions
            </p>
          </div>
          <Button 
            onClick={runTest} 
            disabled={loading}
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                Run Test
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {result && (
          <>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <div className="text-2xl font-bold">
                  {result.passed}/{result.total}
                </div>
                <div className="text-sm text-muted-foreground">Tests Passed</div>
              </div>
              <Badge 
                variant={result.success_rate === 100 ? "default" : result.success_rate >= 80 ? "secondary" : "destructive"}
                className="text-lg px-4 py-2"
              >
                {result.success_rate}%
              </Badge>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Feature Tests</h4>
              
              <div className="space-y-2">
                <TestRow
                  label="Create Rock → Update Status"
                  passed={result.rocks_flow}
                />
                <TestRow
                  label="Add KPI → Record Reading"
                  passed={result.kpi_flow}
                />
                <TestRow
                  label="Create Issue → Mark Resolved"
                  passed={result.issues_flow}
                />
                <TestRow
                  label="Generate Meeting Summary"
                  passed={result.meeting_flow}
                />
                <TestRow
                  label="Permissions (Staff Read-Only)"
                  passed={result.permissions_correct}
                />
              </div>
            </div>

            {result.details && Object.keys(result.details).length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer font-semibold text-muted-foreground">
                  Test Details
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </details>
            )}
          </>
        )}

        {!result && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            Click "Run Test" to validate Rocks & Meetings features
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TestRow = ({ label, passed }: { label: string; passed: boolean }) => (
  <div className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors">
    <span className="text-sm">{label}</span>
    {passed ? (
      <CheckCircle2 className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-destructive" />
    )}
  </div>
);
