import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CoreValuesEditorProps {
  values: string[];
  onChange: (values: string[]) => void;
  organizationId: string;
}

export function CoreValuesEditor({ values, onChange, organizationId }: CoreValuesEditorProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAIDraft = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("clarity-ai", {
        body: {
          intent: "draft",
          context: { organization_id: organizationId },
          field: "core_values",
          current_value: values.join(", "),
        },
      });

      if (error) throw error;
      if (data?.suggestions?.[0]?.text) {
        const suggested = data.suggestions[0].text.split(",").map((v: string) => v.trim());
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

  const addValue = () => {
    if (values.length < 5) {
      onChange([...values, ""]);
    }
  };

  const removeValue = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const updateValue = (index: number, value: string) => {
    const newValues = [...values];
    newValues[index] = value;
    onChange(newValues);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Core Values (3-5)</label>
        <Button variant="outline" size="sm" onClick={handleAIDraft} disabled={loading}>
          <Sparkles className="h-4 w-4 mr-2" />
          {loading ? "Drafting..." : "AI Draft"}
        </Button>
      </div>

      {values.map((value, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            placeholder={`Value ${index + 1}`}
            value={value}
            onChange={(e) => updateValue(index, e.target.value)}
          />
          {values.length > 3 && (
            <Button variant="ghost" size="icon" onClick={() => removeValue(index)}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}

      {values.length < 5 && (
        <Button variant="outline" size="sm" onClick={addValue}>
          <Plus className="h-4 w-4 mr-2" />
          Add Value
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        These principles guide every decision your team makes
      </p>
    </div>
  );
}
