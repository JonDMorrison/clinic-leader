/**
 * Interpretation Callout Component
 * Required on all EMR comparison outputs for legal safety
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertTriangle } from "lucide-react";
import { SAFE_LANGUAGE } from "@/lib/analytics/emrComparisonTypes";

interface InterpretationCalloutProps {
  variant?: 'info' | 'warning';
  compact?: boolean;
}

export function InterpretationCallout({ 
  variant = 'info',
  compact = false 
}: InterpretationCalloutProps) {
  const Icon = variant === 'warning' ? AlertTriangle : Info;
  
  if (compact) {
    return (
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
        <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p>
          <strong>Note:</strong> Correlation ≠ causation. Differences may reflect 
          selection bias, regional variations, or other factors.
        </p>
      </div>
    );
  }
  
  return (
    <Alert variant={variant === 'warning' ? 'destructive' : 'default'} className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
      <Icon className="h-4 w-4" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">
        Interpretation Notice
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm mt-2">
        <p className="mb-2">
          This analysis shows <strong>statistical associations only</strong>. 
          Correlation does not imply causation.
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Differences may reflect selection bias in EMR adoption</li>
          <li>Regional, specialty, and practice size variations exist</li>
          <li>Organizations may have self-selected based on operational maturity</li>
          <li>These findings should inform investigation, not definitive conclusions</li>
        </ul>
      </AlertDescription>
    </Alert>
  );
}
