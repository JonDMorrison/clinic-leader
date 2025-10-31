import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Cloud, Shield, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface JaneConnectWizardProps {
  onComplete: () => void;
  teamId: string;
}

type Step = "intro" | "credentials" | "scope" | "schedule" | "confirmation";

export function JaneConnectWizard({ onComplete, teamId }: JaneConnectWizardProps) {
  const [step, setStep] = useState<Step>("intro");
  const [apiKey, setApiKey] = useState("");
  const [clinicId, setClinicId] = useState("");
  const [syncScope, setSyncScope] = useState({
    appointments: true,
    patients: true,
    payments: true,
    metrics: true,
  });
  const [syncMode, setSyncMode] = useState("daily");
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      // Call edge function to verify Jane API credentials
      const { data, error } = await supabase.functions.invoke("jane-verify", {
        body: { apiKey, clinicId },
      });

      if (error) throw error;

      if (data.valid) {
        toast({
          title: "Jane connected successfully!",
          description: "Your credentials have been verified.",
        });
        setStep("scope");
      } else {
        throw new Error("Invalid credentials");
      }
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Please check your API key and try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleComplete = async () => {
    try {
      const scope = Object.entries(syncScope)
        .filter(([_, enabled]) => enabled)
        .map(([key]) => key);

      const nextSync = new Date();
      if (syncMode === "daily") {
        nextSync.setDate(nextSync.getDate() + 1);
        nextSync.setHours(2, 0, 0, 0);
      }

      const { error } = await supabase.from("jane_integrations").insert({
        organization_id: teamId,
        api_key: apiKey,
        clinic_id: clinicId,
        sync_scope: scope,
        sync_mode: syncMode,
        status: "connected",
        next_sync: syncMode === "daily" ? nextSync.toISOString() : null,
      });

      if (error) throw error;

      // Trigger initial sync
      await supabase.functions.invoke("jane-sync", {
        body: { teamId, immediate: true },
      });

      setStep("confirmation");
    } catch (error) {
      toast({
        title: "Setup failed",
        description: "Could not complete Jane integration setup.",
        variant: "destructive",
      });
    }
  };

  if (step === "intro") {
    return (
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
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">Secure API Connection</p>
            </div>
            <p className="text-sm text-muted-foreground">
              We use Jane's secure API to sync your clinic data automatically. No PHI is stored — only summaries used for KPIs and dashboards.
            </p>
          </div>
          <Button onClick={() => setStep("credentials")} className="w-full">
            Get Started
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "credentials") {
    return (
      <Card className="bg-background/95 backdrop-blur-xl border-border/20">
        <CardHeader>
          <CardTitle>Enter Credentials</CardTitle>
          <CardDescription>
            Your API key is stored securely and encrypted. Never shared with third parties.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">Jane API Key *</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="jane_api_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Find this in Jane under Settings → API & Integrations
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="clinicId">Clinic ID (Optional)</Label>
            <Input
              id="clinicId"
              placeholder="Auto-detected if left blank"
              value={clinicId}
              onChange={(e) => setClinicId(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("intro")}>
              Back
            </Button>
            <Button
              onClick={handleVerify}
              disabled={!apiKey || isVerifying}
              className="flex-1"
            >
              {isVerifying ? "Verifying..." : "Verify & Connect"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "scope") {
    return (
      <Card className="bg-background/95 backdrop-blur-xl border-border/20">
        <CardHeader>
          <CardTitle>Choose What to Sync</CardTitle>
          <CardDescription>
            Select the data types you want to sync from Jane. You can adjust this later in Settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {Object.entries(syncScope).map(([key, enabled]) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={key}
                  checked={enabled}
                  onCheckedChange={(checked) =>
                    setSyncScope({ ...syncScope, [key]: checked as boolean })
                  }
                />
                <Label htmlFor={key} className="capitalize cursor-pointer">
                  {key}
                </Label>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("credentials")}>
              Back
            </Button>
            <Button onClick={() => setStep("schedule")} className="flex-1">
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "schedule") {
    return (
      <Card className="bg-background/95 backdrop-blur-xl border-border/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <CardTitle>Sync Schedule</CardTitle>
          </div>
          <CardDescription>
            Choose how often you want to sync data from Jane
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={syncMode} onValueChange={setSyncMode}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="daily" id="daily" />
              <Label htmlFor="daily" className="cursor-pointer">
                Daily (Recommended) — 2:00 AM
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id="manual" />
              <Label htmlFor="manual" className="cursor-pointer">
                Manual — Sync on demand only
              </Label>
            </div>
          </RadioGroup>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("scope")}>
              Back
            </Button>
            <Button onClick={handleComplete} className="flex-1">
              Complete Setup
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "confirmation") {
    return (
      <Card className="bg-background/95 backdrop-blur-xl border-border/20">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            <CardTitle>Jane Connection Live!</CardTitle>
          </div>
          <CardDescription>
            Data will appear automatically in your KPIs and dashboard within minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
            <p className="text-sm">
              Initial sync in progress... Check the sync status dashboard for real-time updates.
            </p>
          </div>
          <Button onClick={onComplete} className="w-full">
            View Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
