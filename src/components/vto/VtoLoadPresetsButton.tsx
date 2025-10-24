import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { VtoPresetWizard } from "./VtoPresetWizard";

interface VtoLoadPresetsButtonProps {
  vtoId: string;
}

export const VtoLoadPresetsButton = ({ vtoId }: VtoLoadPresetsButtonProps) => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsWizardOpen(true)}
        variant="outline"
        className="gap-2"
      >
        <Download className="w-4 h-4" />
        Load Presets
      </Button>

      {isWizardOpen && (
        <VtoPresetWizard
          vtoId={vtoId}
          onClose={() => setIsWizardOpen(false)}
        />
      )}
    </>
  );
};
