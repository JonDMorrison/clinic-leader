import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
const SUGGESTED_VALUES = ["Integrity", "Compassion", "Excellence", "Innovation", "Collaboration", "Respect", "Accountability", "Empathy", "Quality", "Trust", "Growth", "Service"];
interface CoreValuesEditorProps {
  values: string[];
  onChange: (values: string[]) => void;
  organizationId: string;
}
export function CoreValuesEditor({
  values,
  onChange,
  organizationId
}: CoreValuesEditorProps) {
  const [loading, setLoading] = useState(false);
  const {
    toast
  } = useToast();
  const handleAIDraft = async () => {
    setLoading(true);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }
      const {
        data,
        error
      } = await supabase.functions.invoke("clarity-ai", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: {
          intent: "draft",
          context: {
            organization_id: organizationId
          },
          field: "core_values",
          current_value: values.join(", ")
        }
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
        variant: "destructive"
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
  const handleSuggestedClick = (suggestedValue: string) => {
    // Check if already selected
    if (values.includes(suggestedValue)) {
      // Remove it
      onChange(values.filter(v => v !== suggestedValue));
      return;
    }

    // Find first empty slot or add new if under limit
    const emptyIndex = values.findIndex(v => !v || v.trim() === "");
    if (emptyIndex !== -1) {
      const newValues = [...values];
      newValues[emptyIndex] = suggestedValue;
      onChange(newValues);
    } else if (values.length < 5) {
      onChange([...values, suggestedValue]);
    }
  };
  return <div className="space-y-4">
      

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Click any values below to add them (3-5 recommended), or write your own:
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_VALUES.map(suggested => {
          const isSelected = values.includes(suggested);
          return <Badge key={suggested} variant={isSelected ? "default" : "outline"} className="cursor-pointer hover:bg-primary/80" onClick={() => handleSuggestedClick(suggested)}>
                {suggested}
                {isSelected && <X className="ml-1 h-3 w-3" />}
              </Badge>;
        })}
        </div>
      </div>

      {values.map((value, index) => <div key={index} className="flex items-center gap-2">
          <Input placeholder={`Value ${index + 1}`} value={value} onChange={e => updateValue(index, e.target.value)} />
          {values.length > 3 && <Button variant="ghost" size="icon" onClick={() => removeValue(index)}>
              <X className="h-4 w-4" />
            </Button>}
        </div>)}

      {values.length < 5 && <Button variant="outline" size="sm" onClick={addValue}>
          <Plus className="h-4 w-4 mr-2" />
          Add Value
        </Button>}

      <p className="text-xs text-muted-foreground">
        These principles guide every decision your team makes
      </p>
    </div>;
}