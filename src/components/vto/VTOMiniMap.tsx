import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";

export interface VTOMiniMapSection {
  id: string;
  label: string;
  complete: boolean;
  onClick?: () => void;
}

interface VTOMiniMapProps {
  sections: VTOMiniMapSection[];
  currentSection?: string;
  title?: string;
}

export function VTOMiniMap({ sections, currentSection, title = "Navigation" }: VTOMiniMapProps) {
  const handleKeyDown = (e: React.KeyboardEvent, section: VTOMiniMapSection) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      section.onClick?.();
    }
  };

  return (
    <div className="w-full lg:w-64 flex-shrink-0 lg:border-l bg-background/50 p-4 overflow-y-auto">
      <div className="space-y-4 lg:sticky lg:top-4">
        <div>
          <h3 className="font-semibold text-sm text-foreground mb-2">{title}</h3>
          <div className="h-1 w-12 bg-primary rounded-full" />
        </div>

        <nav className="space-y-1" role="navigation" aria-label={title}>
          {sections.map((section, index) => {
            const isActive = currentSection === section.id;
            
            return (
              <button
                key={section.id}
                onClick={section.onClick}
                onKeyDown={(e) => handleKeyDown(e, section)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200 w-full text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "hover:bg-muted hover:scale-[1.02]"
                )}
                aria-label={`Navigate to ${section.label}`}
                aria-current={isActive ? 'page' : undefined}
                tabIndex={0}
              >
                {section.complete ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className="flex-1 truncate">{section.label}</span>
                {isActive && <ChevronRight className="h-4 w-4 flex-shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* Progress Summary */}
        <div className="pt-4 border-t">
          <div className="text-xs text-muted-foreground mb-1">Progress</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ 
                  width: `${(sections.filter(s => s.complete).length / sections.length) * 100}%` 
                }}
              />
            </div>
            <span className="text-xs font-medium">
              {sections.filter(s => s.complete).length}/{sections.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
