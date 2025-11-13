import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DifferentiatorsEditorProps {
  values: string[];
  onChange: (values: string[]) => void;
  organizationId: string;
}

export function DifferentiatorsEditor({ values, onChange, organizationId }: DifferentiatorsEditorProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAIDraft = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("clarity-ai", {
        body: {
          intent: "draft",
          context: { organization_id: organizationId },
          field: "differentiators",
          current_value: values.join(", "),
        },
      });

      if (error) throw error;
      if (data?.suggestions?.[0]?.text) {
        const suggested = data.suggestions[0].text.split("\n").map((v: string) => v.trim());
        onChange(suggested.slice(0, 3));
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

  const updateValue = (index: number, value: string) => {
    const newValues = [...values];
    newValues[index] = value;
    onChange(newValues);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Top 3 Differentiators</label>
        <Button variant="outline" size="sm" onClick={handleAIDraft} disabled={loading}>
          <Sparkles className="h-4 w-4 mr-2" />
          {loading ? "Drafting..." : "AI Draft"}
        </Button>
      </div>

      {[0, 1, 2].map((index) => (
        <Input
          key={index}
          placeholder={`${index + 1}. What makes you unique?`}
          value={values[index] || ""}
          onChange={(e) => updateValue(index, e.target.value)}
        />
      ))}
    </div>
  );
}
