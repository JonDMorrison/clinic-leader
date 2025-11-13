import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PromiseEditorProps {
  value: string;
  onChange: (value: string) => void;
  organizationId: string;
}

export function PromiseEditor({ value, onChange, organizationId }: PromiseEditorProps) {
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
          field: "promise",
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
        <label className="text-sm font-medium">Promise/Guarantee</label>
        <Button variant="outline" size="sm" onClick={handleAIDraft} disabled={loading}>
          <Sparkles className="h-4 w-4 mr-2" />
          {loading ? "Drafting..." : "AI Draft"}
        </Button>
      </div>

      <Textarea
        placeholder="What can clients count on from you?"
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      <p className="text-xs text-muted-foreground">
        Example: "Clear treatment plan within first visit"
      </p>
    </div>
  );
}
