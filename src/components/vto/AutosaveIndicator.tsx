import { CheckCircle2, Cloud, AlertCircle, Loader2 } from "lucide-react";
import { AutosaveStatus } from "@/hooks/useVTOAutosave";
import { cn } from "@/lib/utils";

interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  className?: string;
}

export function AutosaveIndicator({ status, className }: AutosaveIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      {status === "saved" && (
        <>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
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
        </>
      )}
    </div>
  );
}
