import { Button } from "@/components/ui/button";
import { Database, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useJaneBackfill } from "@/hooks/useJaneBackfill";

interface BackfillButtonProps {
  organizationId?: string;
  hasJaneIntegration: boolean;
  variant?: "default" | "outline";
}

export const BackfillButton = ({ 
  organizationId, 
  hasJaneIntegration,
  variant = "outline" 
}: BackfillButtonProps) => {
  const { backfill, isBackfilling, progress } = useJaneBackfill(organizationId);

  const handleBackfill = () => {
    if (window.confirm(
      "This will fetch the last 12 weeks of data from Jane App for all metrics. " +
      "Existing manual entries will not be overwritten. Continue?"
    )) {
      backfill();
    }
  };

  // Only show button if Jane integration exists
  if (!hasJaneIntegration) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleBackfill}
        disabled={isBackfilling}
        variant={variant}
      >
        {isBackfilling ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Backfilling...
          </>
        ) : (
          <>
            <Database className="w-4 h-4 mr-2" />
            Backfill 12 Weeks
          </>
        )}
      </Button>
      
      {isBackfilling && progress > 0 && (
        <Progress value={progress} className="h-2" />
      )}
    </div>
  );
};
