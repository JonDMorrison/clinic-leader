import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useCutoverReadiness } from "@/hooks/useCutoverReadiness";

interface CutoverBannerProps {
  variant?: "warning" | "info";
}

export function CutoverBanner({ variant = "warning" }: CutoverBannerProps) {
  const { cutoverStatus, isLoading } = useCutoverReadiness();

  // Don't show banner if:
  // - Loading
  // - Not an aligned org
  // - Already ready
  if (isLoading || !cutoverStatus.isAlignedMode || cutoverStatus.scorecardReady) {
    return null;
  }

  return (
    <Alert variant={variant === "warning" ? "destructive" : "default"} className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
        <span>
          {variant === "warning" 
            ? "Alignment needs attention. Complete setup to get your scorecard on track."
            : "Data may be incomplete until alignment setup is finished."
          }
        </span>
        <Button variant="outline" size="sm" asChild>
          <Link to="/scorecard/cutover">
            Realign
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
