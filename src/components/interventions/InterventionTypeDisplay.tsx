/**
 * InterventionTypeDisplay - Shows intervention type with source and confidence in detail view
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, User, Bot, Pencil, Check, X, Info, RefreshCw } from "lucide-react";
import { getInterventionTypesByCategory, type InterventionTypeRecord } from "@/lib/interventions/interventionTypeClassifier";
import { cn } from "@/lib/utils";

interface InterventionTypeDisplayProps {
  interventionId: string;
  typeId: string | null;
  typeName?: string | null;
  typeSource: "ai" | "user" | "ai_backfill" | null;
  typeConfidence: number | null;
  canEdit: boolean;
  onUpdate?: () => void;
  className?: string;
}

export function InterventionTypeDisplay({
  interventionId,
  typeId,
  typeName,
  typeSource,
  typeConfidence,
  canEdit,
  onUpdate,
  className,
}: InterventionTypeDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(typeId);
  const queryClient = useQueryClient();

  // Fetch types for dropdown
  const { data: typesByCategory = {} } = useQuery({
    queryKey: ["intervention-types-by-category"],
    queryFn: getInterventionTypesByCategory,
    staleTime: 5 * 60 * 1000,
    enabled: isEditing,
  });

  // Fetch type details if we only have ID
  const { data: typeDetails } = useQuery({
    queryKey: ["intervention-type-detail", typeId],
    queryFn: async () => {
      if (!typeId) return null;
      const { data, error } = await supabase
        .from("intervention_type_registry")
        .select("id, name, category, description")
        .eq("id", typeId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!typeId && !typeName,
    staleTime: 10 * 60 * 1000,
  });

  const displayName = typeName || typeDetails?.name || "Unknown Type";
  const displayCategory = typeDetails?.category;

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (newTypeId: string | null) => {
      const allTypes = Object.values(typesByCategory).flat();
      const selected = allTypes.find((t) => t.id === newTypeId);
      
      const { error } = await supabase
        .from("interventions")
        .update({
          intervention_type_id: newTypeId,
          intervention_type_source: newTypeId ? "user" : null,
          intervention_type_confidence: null, // Manual selection clears AI confidence
        })
        .eq("id", interventionId);

      if (error) throw error;
      return { typeId: newTypeId, typeName: selected?.name };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intervention", interventionId] });
      setIsEditing(false);
      onUpdate?.();
    },
  });

  const handleSave = () => {
    updateMutation.mutate(selectedTypeId);
  };

  const handleCancel = () => {
    setSelectedTypeId(typeId);
    setIsEditing(false);
  };

  const getSourceIcon = () => {
    switch (typeSource) {
      case "ai":
        return <Bot className="h-3 w-3" />;
      case "ai_backfill":
        return <RefreshCw className="h-3 w-3" />;
      case "user":
        return <User className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getSourceLabel = () => {
    switch (typeSource) {
      case "ai":
        return "AI Suggested";
      case "ai_backfill":
        return "AI Backfill";
      case "user":
        return "Manually Set";
      default:
        return "";
    }
  };

  const getConfidenceBadge = () => {
    if (typeConfidence === null || typeSource !== "ai") return null;
    
    if (typeConfidence >= 85) {
      return (
        <Badge variant="outline" className="text-xs">
          {typeConfidence}% confidence
        </Badge>
      );
    } else if (typeConfidence >= 60) {
      return (
        <Badge variant="outline" className="text-xs">
          {typeConfidence}% confidence
        </Badge>
      );
    }
    return null;
  };

  // No type assigned
  if (!typeId && !isEditing) {
    return (
      <div className={cn("flex items-center justify-between", className)}>
        <div>
          <p className="text-sm text-muted-foreground">Governance Type</p>
          <p className="text-sm italic text-muted-foreground">Not classified</p>
        </div>
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="h-3 w-3 mr-1" />
            Add
          </Button>
        )}
      </div>
    );
  }

  // Editing mode
  if (isEditing) {
    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-sm text-muted-foreground">Governance Type</p>
        <Select value={selectedTypeId || "none"} onValueChange={(v) => setSelectedTypeId(v === "none" ? null : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select type..." />
          </SelectTrigger>
          <SelectContent className="z-50 bg-popover">
            <SelectItem value="none">No type</SelectItem>
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
            size="sm"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            <Check className="h-3 w-3 mr-1" />
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={updateMutation.isPending}
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Display mode with type assigned
  return (
    <div className={cn("", className)}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-muted-foreground">Governance Type</p>
        {canEdit && (
          <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setIsEditing(true)}>
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium">{displayName}</p>
          {displayCategory && (
            <Badge variant="outline" className="text-xs">
              {displayCategory}
            </Badge>
          )}
        </div>
        
        {typeSource && (
          <div className="flex items-center gap-2 flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                  {getSourceIcon()}
                  <span>{getSourceLabel()}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {typeSource === "ai" && "Type was suggested by AI classification"}
                {typeSource === "ai_backfill" && "Type was assigned by automated backfill process"}
                {typeSource === "user" && "Type was manually selected by user"}
              </TooltipContent>
            </Tooltip>
            {getConfidenceBadge()}
          </div>
        )}
      </div>
    </div>
  );
}
