import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Users,
  Mail,
  Key,
  Shield,
  BarChart3,
  PlayCircle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TestStep {
  step: string;
  success: boolean;
  duration: number;
  details?: any;
  error?: string;
}

interface OnboardingTestResult {
  overall_success: boolean;
  steps: TestStep[];
  summary: {
    org_id?: string;
    user_id?: string;
    roles_confirmed: string[];
    default_kpis_count: number;
    total_duration: number;
  };
  timestamp: string;
}

const stepIcons: { [key: string]: any } = {
  "Create Organization": Users,
  "Create User with Owner Role": Shield,
  "Email Invitation (Mock)": Mail,
  "Invite Token Generation": Key,
  "Role-Based Permissions": Shield,
  "Load Default KPIs": BarChart3,
};

export const OnboardingFlowCard = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OnboardingTestResult | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const runOnboardingTest = async () => {
    setLoading(true);
    setProgress(0);
    setResult(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      const { data, error } = await supabase.functions.invoke('test-onboarding-flow', {
        body: { timestamp: new Date().toISOString() }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;

      setResult(data);
      
      toast({
        title: data.overall_success ? "All Tests Passed ✅" : "Some Tests Failed",
        description: `Completed ${data.steps.length} tests in ${data.summary.total_duration}ms`,
        variant: data.overall_success ? "default" : "destructive",
      });
    } catch (error: unknown) {
      console.error('Onboarding test failed:', error);
      const msg = error instanceof Error ? error.message : String(error);
      toast({
        title: "Test Failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (stepName: string) => {
    return stepIcons[stepName] || CheckCircle2;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-brand" />
            <CardTitle>Onboarding Flow Test</CardTitle>
          </div>
          <Button 
            onClick={runOnboardingTest} 
            disabled={loading}
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4 mr-2" />
                Run Test
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Running onboarding simulation...</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {!result && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            Click "Run Test" to simulate a complete onboarding flow
          </div>
        )}

        {result && (
          <>
            {/* Overall Status */}
            <div className="flex items-center justify-between p-4 glass rounded-2xl">
              <div>
                <h3 className="font-semibold text-lg">Overall Status</h3>
                <p className="text-sm text-muted-foreground">
                  {result.steps.length} steps completed in {result.summary.total_duration}ms
                </p>
              </div>
              <Badge 
                variant={result.overall_success ? "default" : "destructive"}
                className="text-lg px-4 py-2"
              >
                {result.overall_success ? "All Passed ✅" : "Failed"}
              </Badge>
            </div>

            {/* Test Steps */}
            <div className="space-y-3">
              <h4 className="font-semibold">Test Steps</h4>
              {result.steps.map((step, index) => {
                const StepIcon = getStepIcon(step.step);
                return (
                  <div 
                    key={index}
                    className="glass rounded-2xl p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <StepIcon className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">{step.step}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{step.duration}ms</span>
                        {step.success ? (
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        ) : (
                          <XCircle className="w-5 h-5 text-danger" />
                        )}
                      </div>
                    </div>

                    {step.details && (
                      <div className="ml-8 text-sm text-muted-foreground">
                        {step.details.org_id && (
                          <div>Org ID: {step.details.org_id.substring(0, 8)}...</div>
                        )}
                        {step.details.user_id && (
                          <div>User ID: {step.details.user_id.substring(0, 8)}...</div>
                        )}
                        {step.details.email && (
                          <div>Email: {step.details.email}</div>
                        )}
                        {step.details.role && (
                          <div>Role: {step.details.role}</div>
                        )}
                        {step.details.kpis_created && (
                          <div>KPIs Created: {step.details.kpis_created}</div>
                        )}
                        {step.details.kpi_names && (
                          <div>KPI Names: {step.details.kpi_names.join(', ')}</div>
                        )}
                        {step.details.note && (
                          <div className="italic">{step.details.note}</div>
                        )}
                      </div>
                    )}

                    {step.error && (
                      <Alert variant="destructive" className="ml-8 mt-2">
                        <AlertDescription className="text-sm">
                          {step.error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="glass rounded-2xl p-4 space-y-2">
              <h4 className="font-semibold mb-3">Test Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Organization Created:</span>
                  <div className="font-medium">{result.summary.org_id ? '✓ Yes' : '✗ No'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">User Created:</span>
                  <div className="font-medium">{result.summary.user_id ? '✓ Yes' : '✗ No'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Roles Confirmed:</span>
                  <div className="font-medium">{result.summary.roles_confirmed.join(', ') || 'None'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Default KPIs:</span>
                  <div className="font-medium">{result.summary.default_kpis_count}</div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
