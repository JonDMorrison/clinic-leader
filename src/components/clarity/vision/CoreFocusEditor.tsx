import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SUGGESTED_PURPOSES = [
  "Empowering patients to achieve optimal health and wellness",
  "Providing compassionate, patient-centered care",
  "Transforming lives through innovative healthcare",
  "Delivering exceptional care that improves quality of life",
  "Creating a healthier community through personalized care",
  "Supporting patients on their journey to better health"
];

const SUGGESTED_NICHES = [
  "Integrated pain management and rehabilitation",
  "Family medicine with holistic approach",
  "Sports medicine and performance optimization",
  "Chronic disease management and prevention",
  "Pediatric care with developmental focus",
  "Women's health and wellness"
];

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
        const text = data.suggestions[0].text;
        const lines = text.split("\n").filter(line => line.trim());
        
        // Extract purpose and niche from the response
        let purposeText = purpose;
        let nicheText = niche;
        
        if (lines.length >= 2) {
          purposeText = lines[0].replace(/^(Purpose:|1\.|•)\s*/i, "").trim();
          nicheText = lines[1].replace(/^(Niche:|2\.|•)\s*/i, "").trim();
        }
        
        onChange({
          purpose: purposeText,
          niche: nicheText,
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

      <div className="space-y-2">
        <label className="text-sm font-medium">Purpose</label>
        <p className="text-sm text-muted-foreground">
          Click a suggestion below or write your own:
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {SUGGESTED_PURPOSES.map((suggested) => (
            <Badge
              key={suggested}
              variant={purpose === suggested ? "brand" : "muted"}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onChange({ purpose: suggested, niche })}
            >
              {suggested.length > 50 ? suggested.slice(0, 50) + "..." : suggested}
            </Badge>
          ))}
        </div>
        <Input
          placeholder="Why your clinic exists"
          value={purpose}
          onChange={(e) => onChange({ purpose: e.target.value, niche })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Niche</label>
        <p className="text-sm text-muted-foreground">
          Click a suggestion below or write your own:
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {SUGGESTED_NICHES.map((suggested) => (
            <Badge
              key={suggested}
              variant={niche === suggested ? "brand" : "muted"}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onChange({ purpose, niche: suggested })}
            >
              {suggested}
            </Badge>
          ))}
        </div>
        <Input
          placeholder="What you specialize in"
          value={niche}
          onChange={(e) => onChange({ purpose, niche: e.target.value })}
        />
      </div>
    </div>
  );
}
