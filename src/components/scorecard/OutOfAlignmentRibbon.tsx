import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAlignmentStatus } from "@/hooks/useAlignmentStatus";

export function OutOfAlignmentRibbon() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isFlexible, isLoading } = useAlignmentStatus();
  const [dismissed, setDismissed] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);

  // Don't show on cutover page itself
  if (location.pathname === "/scorecard/cutover") {
    return null;
  }

  // Don't show if aligned, loading, or dismissed
  if (isLoading || !isFlexible || dismissed) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative rounded-lg border border-border bg-muted/50 p-4 print:hidden"
    >
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="pr-8">
        <p className="font-medium text-foreground">Out of alignment</p>
        <p className="text-sm text-muted-foreground mt-1">
          Some scorecard actions may be managed through your template while you're flexible.
        </p>

        <div className="flex items-center gap-3 mt-3">
          <Button
            size="sm"
            onClick={() => navigate("/scorecard/cutover")}
          >
            Realign (get back on track)
          </Button>

          <Collapsible open={showExplainer} onOpenChange={setShowExplainer}>
            <CollapsibleTrigger asChild>
              <button className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 flex items-center gap-1">
                What does this mean?
                <ChevronDown className={`w-3 h-3 transition-transform ${showExplainer ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="text-sm text-muted-foreground bg-background/50 rounded-lg p-3 space-y-2">
                <p>
                  <strong>Aligned scorecards</strong> keep one consistent set of numbers across your scorecard, meetings, and Rocks.
                </p>
                <p>
                  <strong>Flexible mode</strong> allows ad-hoc changes. You can realign at any time to get back on track.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
