import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface StayAlignedModalProps {
  open: boolean;
  onClose: () => void;
  onProceed: () => void;
  organizationId: string;
}

export function StayAlignedModal({ 
  open, 
  onClose, 
  onProceed, 
  organizationId 
}: StayAlignedModalProps) {
  const [showExplainer, setShowExplainer] = useState(false);
  const queryClient = useQueryClient();

  const switchToFlexibleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('teams')
        .update({ scorecard_mode: 'flexible' })
        .eq('id', organizationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-settings'] });
      toast.success("Switched to flexible mode");
      onProceed();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to switch mode");
    },
  });

  const handleKeepAligned = () => {
    onClose();
  };

  const handleSwitchToFlexible = () => {
    switchToFlexibleMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Stay aligned?</DialogTitle>
          <DialogDescription className="pt-2 text-base leading-relaxed">
            Your clinic is currently aligned, which keeps your scorecard, meetings, and Rocks on track.
            <br /><br />
            This change would move you out of alignment.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-2">
          <Button 
            onClick={handleKeepAligned}
            className="w-full"
          >
            Keep aligned
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleSwitchToFlexible}
            disabled={switchToFlexibleMutation.isPending}
            className="w-full"
          >
            {switchToFlexibleMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Switching...
              </>
            ) : (
              "Switch to flexible mode"
            )}
          </Button>

          <Collapsible open={showExplainer} onOpenChange={setShowExplainer}>
            <CollapsibleTrigger asChild>
              <button className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 flex items-center gap-1 mx-auto mt-1">
                What does this mean?
                <ChevronDown className={`w-3 h-3 transition-transform ${showExplainer ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-2">
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
      </DialogContent>
    </Dialog>
  );
}
