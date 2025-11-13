import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProvenProcessEditorProps {
  steps: string[];
  onChange: (steps: string[]) => void;
  organizationId: string;
}

export function ProvenProcessEditor({ steps, onChange, organizationId }: ProvenProcessEditorProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAIDraft = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      const { data, error } = await supabase.functions.invoke("clarity-ai", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          intent: "draft",
          context: { organization_id: organizationId },
          field: "proven_process",
          current_value: steps.join(", "),
        },
      });

      if (error) throw error;
      if (data?.suggestions?.[0]?.text) {
        const suggested = data.suggestions[0].text.split("\n").map((v: string) => v.trim());
        onChange(suggested.slice(0, 5));
      }
    } catch (error) {
      console.error("AI draft error:", error);
      toast({
        title: "AI draft failed",
        description: "Could not generate suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addStep = () => {
    if (steps.length < 5) {
      onChange([...steps, ""]);
    }
  };

  const removeStep = (index: number) => {
    onChange(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    onChange(newSteps);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Proven Process (3-5 steps)</label>
        <Button variant="outline" size="sm" onClick={handleAIDraft} disabled={loading}>
          <Sparkles className="h-4 w-4 mr-2" />
          {loading ? "Drafting..." : "AI Draft"}
        </Button>
      </div>

      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            placeholder={`${index + 1}. Step name`}
            value={step}
            onChange={(e) => updateStep(index, e.target.value)}
          />
          {steps.length > 3 && (
            <Button variant="ghost" size="icon" onClick={() => removeStep(index)}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}

      {steps.length < 5 && (
        <Button variant="outline" size="sm" onClick={addStep}>
          <Plus className="h-4 w-4 mr-2" />
          Add Step
        </Button>
      )}
    </div>
  );
}
