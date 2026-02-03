/**
 * Peer Matching Toggle
 * 
 * Allows users to toggle between "All eligible orgs" and "Matched peers"
 * for more defensible Jane vs non-Jane comparisons.
 */

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Users } from "lucide-react";

interface PeerMatchingToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function PeerMatchingToggle({
  enabled,
  onChange,
  disabled = false,
}: PeerMatchingToggleProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <Users className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="peer-matching" className="text-sm font-medium">
            Matched Peers
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  <strong>Peer Matching</strong> reduces selection bias by comparing 
                  Jane orgs only to non-Jane orgs with similar characteristics:
                </p>
                <ul className="text-xs mt-1 space-y-0.5">
                  <li>• Provider count bucket (1-2, 3-5, 6-10, 11+)</li>
                  <li>• Visit volume quartile</li>
                </ul>
                <p className="text-xs mt-2 text-muted-foreground">
                  This produces more defensible comparisons but may reduce sample size.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-xs text-muted-foreground">
          {enabled ? "Comparing matched peer groups" : "Comparing all eligible orgs"}
        </p>
      </div>
      <Switch
        id="peer-matching"
        checked={enabled}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
