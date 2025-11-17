import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";

export function ReadOnlyNotice() {
  return (
    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
      <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="text-amber-800 dark:text-amber-200">
        <span className="font-medium">Read-only mode:</span> Editing is disabled. Migrate to the new VTO system to continue making changes.
      </AlertDescription>
    </Alert>
  );
}
