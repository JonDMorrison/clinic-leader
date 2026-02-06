/**
 * InterventionTypeSuggestion - AI-assisted type suggestion with accept/change/ignore
 */

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Sparkles, Check, X, ChevronDown, Info } from "lucide-react";
import {
  suggestInterventionType,
  getInterventionTypesByCategory,
  type TypeSuggestion,
  type InterventionTypeRecord,
} from "@/lib/interventions/interventionTypeClassifier";
import { cn } from "@/lib/utils";

interface InterventionTypeSuggestionProps {
  title: string;
  description?: string;
  interventionId?: string;
  onTypeSelected: (selection: {
    typeId: string | null;
    typeName: string | null;
    source: "ai" | "user" | null;
    confidence: number | null;
  }) => void;
  disabled?: boolean;
  className?: string;
}

export function InterventionTypeSuggestion({
  title,
  description,
  interventionId,
  onTypeSelected,
  disabled = false,
  className,
}: InterventionTypeSuggestionProps) {
  const [suggestion, setSuggestion] = useState<TypeSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const [userChoice, setUserChoice] = useState<"pending" | "accepted" | "changed" | "ignored">("pending");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);

  // Fetch types for dropdown
  const { data: typesByCategory = {} } = useQuery({
    queryKey: ["intervention-types-by-category"],
    queryFn: getInterventionTypesByCategory,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  // Debounced suggestion trigger
  const fetchSuggestion = useCallback(async () => {
    if (!title || title.trim().length < 4 || disabled) return;
    
    setIsLoading(true);
    try {
      const result = await suggestInterventionType({
        title: title.trim(),
        description: description?.trim(),
        interventionId,
      });
      setSuggestion(result);
      setHasTriggered(true);
    } catch (err) {
      console.error("Type suggestion failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [title, description, interventionId, disabled]);

  // Auto-trigger on blur or after typing pause
  useEffect(() => {
    if (hasTriggered || userChoice !== "pending") return;
    
    // Only trigger if we have enough text
    if (title.trim().length >= 8) {
      const timer = setTimeout(fetchSuggestion, 1500);
      return () => clearTimeout(timer);
    }
  }, [title, description, hasTriggered, userChoice, fetchSuggestion]);

  const handleAccept = () => {
    if (!suggestion?.suggested_type_id) return;
    setUserChoice("accepted");
    setSelectedTypeId(suggestion.suggested_type_id);
    onTypeSelected({
      typeId: suggestion.suggested_type_id,
      typeName: suggestion.suggested_type_name,
      source: "ai",
      confidence: suggestion.confidence,
    });
  };

  const handleChange = () => {
    setUserChoice("changed");
    setShowDropdown(true);
  };

  const handleIgnore = () => {
    setUserChoice("ignored");
    onTypeSelected({
      typeId: null,
      typeName: null,
      source: null,
      confidence: null,
    });
  };

  const handleManualSelect = (typeId: string) => {
    const allTypes = Object.values(typesByCategory).flat();
    const selected = allTypes.find((t) => t.id === typeId);
    setSelectedTypeId(typeId);
    setUserChoice("changed");
    onTypeSelected({
      typeId,
      typeName: selected?.name || null,
      source: "user",
      confidence: null,
    });
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 85) {
      return (
        <Badge variant="default" className="text-xs">
          High Confidence
        </Badge>
      );
    } else if (confidence >= 60) {
      return (
        <Badge variant="secondary" className="text-xs">
          Medium Confidence
        </Badge>
      );
    }
    return null;
  };

  // Show nothing if no suggestion yet and not loading
  if (!isLoading && !suggestion && userChoice === "pending") {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 p-3 bg-muted/30 rounded-md border border-dashed", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Analyzing intervention type...</span>
      </div>
    );
  }

  // User made a choice - show confirmation
  if (userChoice === "accepted" || userChoice === "changed") {
    const allTypes = Object.values(typesByCategory).flat();
    const selectedType = allTypes.find((t) => t.id === selectedTypeId);
    
    return (
      <div className={cn("p-3 bg-primary/5 rounded-md border border-primary/20", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Type: {selectedType?.name}</span>
            <Badge variant="outline" className="text-xs">
              {userChoice === "accepted" ? "AI" : "Manual"}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setUserChoice("pending");
              setShowDropdown(true);
            }}
          >
            Change
          </Button>
        </div>
      </div>
    );
  }

  // User ignored - show minimal UI with option to reconsider
  if (userChoice === "ignored") {
    return (
      <div className={cn("flex items-center justify-between p-2 bg-muted/20 rounded-md", className)}>
        <span className="text-xs text-muted-foreground">No type selected</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={() => {
            setUserChoice("pending");
            setShowDropdown(true);
          }}
        >
          Add Type
        </Button>
      </div>
    );
  }

  // Show dropdown if user wants to change
  if (showDropdown) {
    return (
      <div className={cn("space-y-2", className)}>
        <Select value={selectedTypeId || ""} onValueChange={handleManualSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Select intervention type..." />
          </SelectTrigger>
          <SelectContent className="z-50 bg-popover">
            {Object.entries(typesByCategory).map(([category, types]) => (
              <SelectGroup key={category}>
                <SelectLabel className="text-xs text-muted-foreground font-semibold">
                  {category}
                </SelectLabel>
                {types.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setShowDropdown(false);
              setUserChoice("ignored");
              onTypeSelected({ typeId: null, typeName: null, source: null, confidence: null });
            }}
          >
            Skip
          </Button>
        </div>
      </div>
    );
  }

  // Suggestion available - show accept/change/ignore UI
  if (suggestion && suggestion.suggested_type_id) {
    return (
      <div className={cn("p-3 bg-primary/5 rounded-md border border-primary/20", className)}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Suggested Type</span>
          {getConfidenceBadge(suggestion.confidence)}
        </div>
        
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium">{suggestion.suggested_type_name}</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Why this type?
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-sm mb-2">{suggestion.rationale}</p>
                {suggestion.matched_signals.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Matched signals:</p>
                    <ul className="list-disc list-inside">
                      {suggestion.matched_signals.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          </div>
          
          <div className="flex gap-1">
            <Button size="sm" className="h-7 px-3" onClick={handleAccept}>
              <Check className="h-3 w-3 mr-1" />
              Accept
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2" onClick={handleChange}>
              <ChevronDown className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleIgnore}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No suggestion or low confidence - show optional dropdown
  return (
    <div className={cn("p-3 bg-muted/30 rounded-md border border-dashed", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {suggestion ? "No clear type match" : "Add intervention type (optional)"}
          </span>
        </div>
        <Button variant="outline" size="sm" className="h-7" onClick={() => setShowDropdown(true)}>
          Select Type
        </Button>
      </div>
    </div>
  );
}
