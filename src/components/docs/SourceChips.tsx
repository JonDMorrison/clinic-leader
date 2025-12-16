import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Source {
  doc_id: string;
  section_id: string;
  label: string;
  confidence: "high" | "med" | "low";
}

interface SourceChipsProps {
  sources: Source[];
  onOpenSection: (source: Source) => void;
  onViewFullSop: (docId: string) => void;
}

export const SourceChips = ({ sources, onOpenSection, onViewFullSop }: SourceChipsProps) => {
  if (!sources || sources.length === 0) return null;

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20";
      case "med":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20";
      case "low":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      <span className="text-xs text-muted-foreground mr-1">Sources:</span>
      {sources.map((source, index) => (
        <DropdownMenu key={`${source.doc_id}-${source.section_id}-${index}`}>
          <DropdownMenuTrigger asChild>
            <Badge
              variant="outline"
              className={`text-xs cursor-pointer transition-colors ${getConfidenceColor(source.confidence)}`}
            >
              <FileText className="h-3 w-3 mr-1" />
              {source.label.length > 40 ? `${source.label.slice(0, 40)}...` : source.label}
            </Badge>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => onOpenSection(source)}>
              <FileText className="h-4 w-4 mr-2" />
              Open SOP section
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewFullSop(source.doc_id)}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View full SOP
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ))}
    </div>
  );
};
