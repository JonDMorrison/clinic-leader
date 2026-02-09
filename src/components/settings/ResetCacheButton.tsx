import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { resetAllStorage, CURRENT_STORAGE_VERSION } from "@/lib/storage/versionedStorage";
import { useState } from "react";
import { toast } from "sonner";

export function ResetCacheButton() {
  const [confirming, setConfirming] = useState(false);

  const handleReset = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    resetAllStorage();
    toast.success("Cached UI state has been reset. Reloading...");
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div>
        <h4 className="text-sm font-medium">Reset Cached UI State</h4>
        <p className="text-xs text-muted-foreground mt-1">
          Clear saved preferences, dismissed banners, and custom sort orders.
          Storage version: {CURRENT_STORAGE_VERSION}
        </p>
      </div>
      <Button
        variant={confirming ? "destructive" : "outline"}
        size="sm"
        onClick={handleReset}
        onBlur={() => setConfirming(false)}
      >
        <RotateCcw className="w-4 h-4 mr-1" />
        {confirming ? "Confirm Reset" : "Reset Cache"}
      </Button>
    </div>
  );
}
