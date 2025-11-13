import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TenYearTargetEditorProps {
  value: string;
  onChange: (value: string) => void;
  organizationId: string;
}

export function TenYearTargetEditor({ value, onChange, organizationId }: TenYearTargetEditorProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAIDraft = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("clarity-ai", {
        body: {
          intent: "draft",
          context: { organization_id: organizationId },
          field: "ten_year_target",
          current_value: value,
        },
      });

      if (error) throw error;
      if (data?.suggestions?.[0]?.text) {
        onChange(data.suggestions[0].text);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">10-Year Target</label>
        <Button variant="outline" size="sm" onClick={handleAIDraft} disabled={loading}>
          <Sparkles className="h-4 w-4 mr-2" />
          {loading ? "Drafting..." : "AI Draft"}
        </Button>
      </div>

      <Textarea
        placeholder="Describe where you'll be in 10 years. Be specific and inspiring."
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      <p className="text-xs text-muted-foreground">
        Example: "Most trusted rehab network in BC with 10 locations and 200 team members"
      </p>
    </div>
  );
}
