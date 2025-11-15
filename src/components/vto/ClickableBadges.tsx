import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

interface ClickableBadgesProps {
  suggestions: string[];
  selected: string[];
  onAdd: (value: string) => void;
  label?: string;
  maxSelections?: number;
}

export function ClickableBadges({ 
  suggestions, 
  selected, 
  onAdd, 
  label = "Quick Add",
  maxSelections 
}: ClickableBadgesProps) {
  const availableSuggestions = suggestions.filter(s => !selected.includes(s));
  
  if (availableSuggestions.length === 0) return null;
  
  const canAddMore = !maxSelections || selected.length < maxSelections;

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{label}:</p>
      <div className="flex flex-wrap gap-2">
        {availableSuggestions.map((suggestion) => (
          <Badge
            key={suggestion}
            variant="outline"
            className={cn(
              "cursor-pointer transition-colors",
              canAddMore 
                ? "hover:bg-primary hover:text-primary-foreground" 
                : "opacity-50 cursor-not-allowed"
            )}
            onClick={() => canAddMore && onAdd(suggestion)}
          >
            <Plus className="h-3 w-3 mr-1" />
            {suggestion}
          </Badge>
        ))}
      </div>
      {!canAddMore && maxSelections && (
        <p className="text-xs text-muted-foreground">
          Maximum of {maxSelections} selections reached
        </p>
      )}
    </div>
  );
}

// Common suggestions
export const CORE_VALUE_SUGGESTIONS = [
  "Integrity",
  "Excellence",
  "Innovation",
  "Teamwork",
  "Growth",
  "Patient Care",
  "Accountability",
  "Transparency",
  "Respect",
  "Quality",
  "Collaboration",
  "Continuous Improvement",
];

export const DIFFERENTIATOR_SUGGESTIONS = [
  "Proven track record",
  "Expert team",
  "Personalized service",
  "Fast response time",
  "Comprehensive solutions",
  "Industry-leading technology",
  "24/7 support",
  "Money-back guarantee",
  "Local presence",
  "Years of experience",
];

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
