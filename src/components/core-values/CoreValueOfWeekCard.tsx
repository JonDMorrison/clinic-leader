import { useEffect, useState } from "react";
import { useCoreValues } from "@/hooks/useCoreValues";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Heart } from "lucide-react";
import { ShoutoutDialog } from "./ShoutoutDialog";

interface CoreValueOfWeekCardProps {
  compact?: boolean;
}

export function CoreValueOfWeekCard({ compact = false }: CoreValueOfWeekCardProps) {
  const { 
    activeValues, 
    currentSpotlightValue, 
    spotlight,
    isLoading, 
    checkAndRotate,
    setSpotlightValue,
    seedDefaults,
  } = useCoreValues();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === "owner" || user?.role === "director";
  
  const [showShoutout, setShowShoutout] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  // Seed and check rotation on mount
  useEffect(() => {
    if (!isLoading && activeValues.length === 0) {
      seedDefaults.mutate();
    }
  }, [isLoading, activeValues.length]);

  useEffect(() => {
    if (!isLoading && activeValues.length > 0) {
      checkAndRotate();
    }
  }, [isLoading, activeValues.length, spotlight]);

  if (isLoading) {
    return (
      <Card className="border-border/30">
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-muted/50 rounded animate-pulse" />
            <div className="h-5 w-48 bg-muted/50 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const value = currentSpotlightValue || activeValues[0];
  if (!value) return null;

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg transition-colors hover:bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary/80">Value of the Week</p>
            <p className="text-sm font-semibold truncate">{value.title}</p>
          </div>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setShowShoutout(true)}>
            <Heart className="h-4 w-4" />
          </Button>
        </div>

        <ShoutoutDialog
          open={showShoutout}
          onOpenChange={setShowShoutout}
          preselectedValue={value}
        />
      </>
    );
  }

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Core Value of the Week
          </CardTitle>
          <p className="text-xs text-muted-foreground">This week, we focus on how we show up.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h3 className="font-semibold leading-tight">{value.title}</h3>
            {value.short_behavior && (
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{value.short_behavior}</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button onClick={() => setShowShoutout(true)} size="sm" variant="default">
              <Heart className="h-3.5 w-3.5 mr-1.5" />
              Give a Shout-Out
            </Button>

            {isAdmin && (
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSelector(!showSelector)}
                >
                  Change
                </Button>
                
                {showSelector && (
                  <div className="absolute top-full left-0 mt-1 z-50">
                    <Select
                      value={value.id}
                      onValueChange={(id) => {
                        setSpotlightValue.mutate(id);
                        setShowSelector(false);
                      }}
                    >
                      <SelectTrigger className="w-[200px] bg-background">
                        <SelectValue placeholder="Select value" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeValues.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.title.split(" ").slice(0, 3).join(" ")}...
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ShoutoutDialog
        open={showShoutout}
        onOpenChange={setShowShoutout}
        preselectedValue={value}
      />
    </>
  );
}
