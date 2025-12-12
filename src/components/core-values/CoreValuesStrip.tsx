import { useState, useEffect } from "react";
import { useCoreValues, CoreValue } from "@/hooks/useCoreValues";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Settings, Heart, Sparkles } from "lucide-react";
import { CoreValueEditDialog } from "./CoreValueEditDialog";
import { ShoutoutDialog } from "./ShoutoutDialog";

interface CoreValuesStripProps {
  showEditButton?: boolean;
  compact?: boolean;
}

export function CoreValuesStrip({ showEditButton = true, compact = false }: CoreValuesStripProps) {
  const { activeValues, isLoading, seedDefaults } = useCoreValues();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === "owner" || user?.role === "director";
  
  const [selectedValue, setSelectedValue] = useState<CoreValue | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showShoutout, setShowShoutout] = useState(false);
  const [shoutoutValue, setShoutoutValue] = useState<CoreValue | null>(null);

  // Seed defaults if no values
  useEffect(() => {
    if (!isLoading && activeValues.length === 0) {
      seedDefaults.mutate();
    }
  }, [isLoading, activeValues.length]);

  if (isLoading) {
    return (
      <div className="flex gap-2 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-24 bg-muted rounded-full" />
        ))}
      </div>
    );
  }

  if (activeValues.length === 0) return null;

  const handleShoutout = (value: CoreValue) => {
    setShoutoutValue(value);
    setShowShoutout(true);
    setSelectedValue(null);
  };

  // Shorten title for display
  const shortenTitle = (title: string) => {
    const words = title.split(" ");
    if (words.length <= 3) return title;
    // Find key words
    const keyPhrases: Record<string, string> = {
      "Treat Our Patients Like": "Family First",
      "Dedicated Can-Do": "Can-Do Attitude",
      "Uncompromised Quality": "Quality Care",
      "Returning Customer Service": "Customer Service",
      "Patient Advocates": "Patient Advocates",
    };
    for (const [phrase, short] of Object.entries(keyPhrases)) {
      if (title.includes(phrase)) return short;
    }
    return words.slice(0, 3).join(" ");
  };

  return (
    <>
      <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "p-3 bg-muted/30 rounded-lg border border-border/50"}`}>
        {!compact && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-2">
            <Heart className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">Our Values</span>
          </div>
        )}
        
        <TooltipProvider>
          {activeValues.map((value) => (
            <Tooltip key={value.id}>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-colors py-1.5 px-3"
                  onClick={() => setSelectedValue(value)}
                >
                  {shortenTitle(value.title)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-medium text-sm">{value.title}</p>
                {value.short_behavior && (
                  <p className="text-xs text-muted-foreground mt-1">{value.short_behavior}</p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>

        {showEditButton && isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 w-7 p-0"
            onClick={() => setShowEdit(true)}
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Value Detail Modal */}
      <Dialog open={!!selectedValue} onOpenChange={() => setSelectedValue(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Core Value
            </DialogTitle>
          </DialogHeader>
          
          {selectedValue && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedValue.title}</h3>
                {selectedValue.short_behavior && (
                  <p className="text-muted-foreground mt-2">{selectedValue.short_behavior}</p>
                )}
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">What it looks like this week</p>
                <p className="text-sm mt-1">
                  Look for opportunities to demonstrate this value in your daily interactions with patients and teammates.
                </p>
              </div>

              <Button onClick={() => handleShoutout(selectedValue)} className="w-full">
                <Heart className="h-4 w-4 mr-2" />
                Give a Shout-Out
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <CoreValueEditDialog open={showEdit} onOpenChange={setShowEdit} />

      {/* Shoutout Dialog */}
      <ShoutoutDialog
        open={showShoutout}
        onOpenChange={setShowShoutout}
        preselectedValue={shoutoutValue}
      />
    </>
  );
}
