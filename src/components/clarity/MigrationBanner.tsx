import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Info, CheckCircle, AlertTriangle, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface MigrationBannerProps {
  organizationId: string;
  onMigrationComplete?: () => void;
}

export function MigrationBanner({ organizationId, onMigrationComplete }: MigrationBannerProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>("");

  const handleMigrate = async () => {
    setMigrating(true);
    setProgress(10);
    setStatus("Preparing migration...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      setProgress(30);
      setStatus("Migrating your data to the new VTO system...");

      const { data, error } = await supabase.functions.invoke("migrate-clarity-to-vto", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { organizationId, dryRun: false },
      });

      if (error) throw error;

      setProgress(100);
      setStatus("Migration complete!");

      toast({
        title: "Migration Successful!",
        description: `Successfully migrated ${data.summary.success} document(s) to the new VTO system.`,
      });

      // Wait a moment then redirect
      setTimeout(() => {
        navigate("/vto/vision");
        onMigrationComplete?.();
      }, 2000);

    } catch (error: any) {
      console.error("Migration error:", error);
      toast({
        title: "Migration Failed",
        description: error.message || "Could not complete migration. Please try again.",
        variant: "destructive",
      });
      setProgress(0);
      setStatus("");
      setMigrating(false);
    }
  };

  return (
    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="text-blue-900 dark:text-blue-100">
        {migrating ? "Migration In Progress" : "Ready to Upgrade?"}
      </AlertTitle>
      <AlertDescription className="text-blue-800 dark:text-blue-200">
        {migrating ? (
          <div className="space-y-3 mt-2">
            <p className="text-sm">{status}</p>
            <Progress value={progress} className="h-2" />
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4 mt-2">
            <div className="flex-1">
              <p className="text-sm mb-2">
                Your Clarity Builder data is ready to migrate to the enhanced VTO system with autosave, mini-map navigation, and improved workflows.
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                This will create a new VTO from your existing Clarity data. Your original data will remain unchanged.
              </p>
            </div>
            <Button 
              onClick={handleMigrate}
              disabled={migrating}
              className="shrink-0"
            >
              <Rocket className="mr-2 h-4 w-4" />
              Migrate Now
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
