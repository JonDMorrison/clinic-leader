import { CheckCircle2, Cloud, AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { AutosaveStatus } from "@/hooks/useVTOAutosave";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  className?: string;
  onRetry?: () => void;
}

export function AutosaveIndicator({ status, className, onRetry }: AutosaveIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      {status === "saved" && (
        <>
          <CheckCircle2 className="h-4 w-4 text-green-500 animate-scale-in" />
          <span className="text-muted-foreground">All changes saved</span>
        </>
      )}
      {status === "saving" && (
        <>
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-destructive">Failed to save</span>
          {onRetry && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onRetry}
              className="h-6 px-2 gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Retry
            </Button>
          )}
        </>
      )}
    </div>
  );
}
