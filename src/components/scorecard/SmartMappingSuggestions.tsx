import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, ExternalLink } from "lucide-react";
import { suggestMappings, formatSuggestions } from "@/lib/kpis/suggest";

interface SmartMappingSuggestionsProps {
  organizationId: string;
  onApplySuggestion?: (kpiName: string, sourceSystem: string, sourceLabel: string) => void;
}

export function SmartMappingSuggestions({ 
  organizationId, 
  onApplySuggestion 
}: SmartMappingSuggestionsProps) {
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["mapping-suggestions", organizationId],
    queryFn: () => suggestMappings(organizationId),
    enabled: !!organizationId,
  });

  if (isLoading) {
    return (
      <Card className="glass p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Lightbulb className="h-5 w-5 animate-pulse" />
          <span>Loading smart suggestions...</span>
        </div>
      </Card>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const grouped = formatSuggestions(suggestions);

  return (
    <Card className="glass p-6 border-2 border-primary/20">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Smart Mapping Suggestions</h3>
          </div>
          <Badge variant="muted">
            {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Based on your staging data, we found these potential mappings for your KPIs:
        </p>

        <div className="space-y-4">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">{group}</h4>
              <div className="space-y-2 pl-4 border-l-2 border-border">
                {items.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{suggestion.kpiName}</span>
                        <Badge 
                          variant={
                            suggestion.confidence === "high" 
                              ? "success" 
                              : suggestion.confidence === "medium"
                              ? "muted"
                              : "muted"
                          }
                          className="text-xs"
                        >
                          {suggestion.confidence}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{suggestion.sourceLabel}</span>
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        {suggestion.reason}
                      </p>
                    </div>
                    {onApplySuggestion && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onApplySuggestion(
                          suggestion.kpiName,
                          suggestion.sourceSystem,
                          suggestion.sourceLabel
                        )}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            💡 These are suggestions based on available data. Review and confirm each mapping before use.
          </p>
        </div>
      </div>
    </Card>
  );
}
