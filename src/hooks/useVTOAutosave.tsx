import { useEffect, useRef, useCallback } from "react";
import { useDebounce } from "./use-debounce";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

export type AutosaveStatus = "saved" | "saving" | "error";

interface UseVTOAutosaveProps {
  vtoId: string;
  versionData: any;
  onStatusChange: (status: AutosaveStatus) => void;
  enabled?: boolean;
}

export function useVTOAutosave({
  vtoId,
  versionData,
  onStatusChange,
  enabled = true,
}: UseVTOAutosaveProps) {
  const { toast } = useToast();
  const debouncedData = useDebounce(versionData, 3000);
  const lastSavedRef = useRef<string>("");

  const save = useCallback(async () => {
    if (!enabled) return;
    
    const dataStr = JSON.stringify(debouncedData);
    if (dataStr === lastSavedRef.current) return;

    onStatusChange("saving");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      const { error } = await supabase.functions.invoke("vto-save", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          vto_id: vtoId,
          version_data: debouncedData,
          action: "save_draft",
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
        description: "Changes could not be saved. Please try manually saving.",
        variant: "destructive",
      });
    }
  }, [debouncedData, vtoId, onStatusChange, toast, enabled]);

  useEffect(() => {
    if (debouncedData && vtoId && vtoId.trim() !== "" && enabled) {
      save();
    }
  }, [debouncedData, vtoId, save, enabled]);

  return { save };
}
