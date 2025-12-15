import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SectionNavigatorProps {
  sections: string[];
  sectionLabels: Record<string, string>;
  currentSectionIndex: number;
  onNavigate: (index: number) => void;
}

export const SectionNavigator = ({
  sections,
  sectionLabels,
  currentSectionIndex,
  onNavigate,
}: SectionNavigatorProps) => {
  const currentSection = sections[currentSectionIndex];
  const hasPrev = currentSectionIndex > 0;
  const hasNext = currentSectionIndex < sections.length - 1;

  return (
    <div className="flex items-center gap-3 bg-card border rounded-lg px-4 py-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(currentSectionIndex - 1)}
        disabled={!hasPrev}
      >
        <ChevronLeft className="w-4 h-4" />
        Prev
      </Button>
      
      <div className="flex items-center gap-2 min-w-[180px] justify-center">
        <span className="text-sm text-muted-foreground">
          {currentSectionIndex + 1}/{sections.length}
        </span>
        <span className="font-medium text-sm">
          {sectionLabels[currentSection] || currentSection}
        </span>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(currentSectionIndex + 1)}
        disabled={!hasNext}
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
};
