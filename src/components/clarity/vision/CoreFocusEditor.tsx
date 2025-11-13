import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CoreFocusEditorProps {
  purpose: string;
  niche: string;
  onChange: (data: { purpose: string; niche: string }) => void;
  organizationId: string;
}

export function CoreFocusEditor({ purpose, niche, onChange, organizationId }: CoreFocusEditorProps) {
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
          field: "core_focus",
          current_value: `Purpose: ${purpose}, Niche: ${niche}`,
        },
      });

      if (error) throw error;
      if (data?.suggestions?.[0]?.text) {
        const parts = data.suggestions[0].text.split("\n");
        onChange({
          purpose: parts[0]?.replace("Purpose:", "").trim() || purpose,
          niche: parts[1]?.replace("Niche:", "").trim() || niche,
        });
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
        <label className="text-sm font-medium">Core Focus</label>
        <Button variant="outline" size="sm" onClick={handleAIDraft} disabled={loading}>
          <Sparkles className="h-4 w-4 mr-2" />
          {loading ? "Drafting..." : "AI Draft"}
        </Button>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Purpose</label>
        <Input
          placeholder="Why your clinic exists"
          value={purpose}
          onChange={(e) => onChange({ purpose: e.target.value, niche })}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Niche</label>
        <Input
          placeholder="What you specialize in"
          value={niche}
          onChange={(e) => onChange({ purpose, niche: e.target.value })}
        />
      </div>
    </div>
  );
}
