import { Button } from "@/components/ui/button";
import { Zap, Plus } from "lucide-react";
import { InterventionEducationPanel } from "./InterventionEducationPanel";

interface EmptyInterventionsProps {
  onCreateClick: () => void;
}

export function EmptyInterventions({ onCreateClick }: EmptyInterventionsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* Icon */}
      <div className="rounded-full bg-primary/10 p-4 mb-4">
        <Zap className="h-8 w-8 text-primary" />
      </div>
      
      {/* Title */}
      <h3 className="text-lg font-semibold mb-2">No interventions yet</h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        Start tracking the solutions your team implements to improve performance.
      </p>

      {/* Create Button */}
      <Button onClick={onCreateClick} className="mb-8">
        <Plus className="mr-2 h-4 w-4" />
        Create First Intervention
      </Button>

      {/* Education Panel */}
      <div className="w-full max-w-2xl">
        <InterventionEducationPanel variant="full" />
      </div>
    </div>
  );
}
