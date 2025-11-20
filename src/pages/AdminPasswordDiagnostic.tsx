import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function AdminPasswordDiagnostic() {
  const [email, setEmail] = useState("ajorgensendc@gmail.com");
  const [password, setPassword] = useState("NWClinics2025!");
  const [auditResult, setAuditResult] = useState<any>(null);
  const [fixResult, setFixResult] = useState<any>(null);
  const [envResult, setEnvResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runAudit = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auth-audit-user', {
        body: { email, testPassword: password }
      });
      
      if (error) throw error;
      setAuditResult(data);
      toast.success("Audit complete");
    } catch (error: any) {
      toast.error(`Audit failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runFix = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-fix-password', {
        body: { email, newPassword: password }
      });
      
      if (error) throw error;
      setFixResult(data);
      
      if (data.ok) {
        toast.success("Password fixed and verified!");
      } else {
        toast.error(data.error || data.message || "Failed to fix password");
      }
    } catch (error: any) {
      toast.error(`Fix failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkEnv = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('debug-auth-env', {});
      
      if (error) throw error;
      setEnvResult(data);
      
      const clientUrl = import.meta.env.VITE_SUPABASE_URL;
      const match = data.edge_SUPABASE_URL === clientUrl;
      
      toast.success(match ? "Environments match ✓" : "⚠️ Environment mismatch detected!");
    } catch (error: any) {
      toast.error(`Env check failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Password Diagnostic Tools</CardTitle>
          <CardDescription>
            Diagnose and fix password authentication issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={runAudit} disabled={isLoading}>
              1. Run Audit
            </Button>
            <Button onClick={runFix} disabled={isLoading} variant="default">
              2. Fix Password
            </Button>
            <Button onClick={checkEnv} disabled={isLoading} variant="outline">
              3. Check Env
            </Button>
          </div>

          {auditResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Audit Result</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded overflow-auto">
                  {JSON.stringify(auditResult, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {fixResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fix Result</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded overflow-auto">
                  {JSON.stringify(fixResult, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {envResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Environment Check</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <strong>Client URL:</strong> {import.meta.env.VITE_SUPABASE_URL}
                </div>
                <div className="text-sm">
                  <strong>Edge URL:</strong> {envResult.edge_SUPABASE_URL}
                </div>
                <div className={`text-sm font-semibold ${envResult.edge_SUPABASE_URL === import.meta.env.VITE_SUPABASE_URL ? 'text-green-600' : 'text-red-600'}`}>
                  {envResult.edge_SUPABASE_URL === import.meta.env.VITE_SUPABASE_URL ? '✓ Match' : '✗ Mismatch'}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
