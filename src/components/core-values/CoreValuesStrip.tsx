import { useState, useEffect } from "react";
import { useCoreValues } from "@/hooks/useCoreValues";
import type { CoreValue } from "@/lib/core-values/types";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-24 bg-muted/50 rounded-full animate-pulse" />
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
    const words = title.split(" ");
    return words.length <= 3 ? title : words.slice(0, 3).join(" ");
  };

  return (
    <>
      <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "glass py-3 px-4 rounded-xl border border-border/20"}`}>
        {!compact && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-3">
            <Heart className="h-3.5 w-3.5 text-primary/70" />
            <span className="font-medium">Our Values</span>
          </div>
        )}
        
        <TooltipProvider delayDuration={200}>
          {activeValues.map((value, index) => (
            <Tooltip key={value.id}>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="cursor-pointer border-border/50 bg-background/50 hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 py-1.5 px-3 text-xs font-medium animate-fade-in"
                  style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'backwards' }}
                  onClick={() => setSelectedValue(value)}
                >
                  {shortenTitle(value.title)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center" sideOffset={8} className="max-w-xs z-50 bg-popover">
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
            className="ml-auto h-7 w-7 p-0 opacity-50 hover:opacity-100 transition-opacity"
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
                <h3 className="font-semibold text-lg leading-tight">{selectedValue.title}</h3>
                {selectedValue.short_behavior && (
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{selectedValue.short_behavior}</p>
                )}
              </div>

              <div className="p-3 bg-muted/30 rounded-lg border border-border/30">
                <p className="text-xs font-medium text-muted-foreground">What it looks like this week</p>
                <p className="text-sm mt-1">
                  Look for opportunities to demonstrate this value in your daily interactions.
                </p>
              </div>

              <Button onClick={() => handleShoutout(selectedValue)} className="w-full" size="sm">
                <Heart className="h-4 w-4 mr-2" />
                Give a Shout-Out
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CoreValueEditDialog open={showEdit} onOpenChange={setShowEdit} />
      <ShoutoutDialog
        open={showShoutout}
        onOpenChange={setShowShoutout}
        preselectedValue={shoutoutValue}
      />
    </>
  );
}
