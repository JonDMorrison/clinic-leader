import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImpersonation } from "@/hooks/useImpersonation";

export const ImpersonationBanner = () => {
  const { isImpersonating, impersonationData, exitImpersonation } = useImpersonation();

  if (!isImpersonating || !impersonationData) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground px-4 py-2 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <div className="text-sm">
            <span className="font-semibold">Impersonation Mode:</span>{" "}
            You are viewing as <span className="font-medium">{impersonationData.targetEmail}</span>
            {impersonationData.targetFullName && ` (${impersonationData.targetFullName})`}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exitImpersonation}
          className="bg-background text-foreground hover:bg-background/90"
        >
          <X className="h-4 w-4 mr-2" />
          Exit Impersonation
        </Button>
      </div>
    </div>
  );
};
