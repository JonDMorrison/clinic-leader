import { Button } from "@/components/ui/button";
import { Lightbulb, Plus } from "lucide-react";

interface EmptyInterventionsProps {
  onCreateClick: () => void;
}

export function EmptyInterventions({ onCreateClick }: EmptyInterventionsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-primary/10 p-4 mb-4">
        <Lightbulb className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No interventions yet</h3>
      <p className="text-muted-foreground max-w-md mb-6">
        Interventions help you track strategic initiatives and measure their impact on your key metrics.
        Create your first intervention to get started.
      </p>
      <Button onClick={onCreateClick}>
        <Plus className="mr-2 h-4 w-4" />
        Create Intervention
      </Button>
    </div>
  );
}
