import { useEffect, useRef, useCallback } from "react";
import { useDebounce } from "./use-debounce";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

export type AutosaveStatus = "saved" | "saving" | "error";

interface UseClarityAutosaveProps {
  organizationId: string;
  vtoData: any;
  onStatusChange: (status: AutosaveStatus) => void;
}

export function useClarityAutosave({
  organizationId,
  vtoData,
  onStatusChange,
}: UseClarityAutosaveProps) {
  const { toast } = useToast();
  const debouncedData = useDebounce(vtoData, 2000);
  const lastSavedRef = useRef<string>("");

  const save = useCallback(async () => {
    const dataStr = JSON.stringify(debouncedData);
    if (dataStr === lastSavedRef.current) return;

    onStatusChange("saving");
    try {
      const { error } = await supabase.functions.invoke("clarity-save", {
        body: {
          organization_id: organizationId,
          vision: debouncedData.vision,
          traction: debouncedData.traction,
          metrics: debouncedData.metrics,
        },
      });

      if (error) throw error;

      lastSavedRef.current = dataStr;
      onStatusChange("saved");
    } catch (error) {
      console.error("Autosave error:", error);
      onStatusChange("error");
      toast({
        title: "Autosave failed",
        description: "Changes could not be saved. Please try again.",
        variant: "destructive",
      });
    }
  }, [debouncedData, organizationId, onStatusChange, toast]);

  useEffect(() => {
    if (debouncedData && organizationId) {
      save();
    }
  }, [debouncedData, organizationId, save]);

  return { save };
}
