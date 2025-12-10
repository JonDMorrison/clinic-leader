import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sparkles, FileText, Stethoscope, Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type AIIntent = 'generate_template' | 'refine_healthcare' | 'rewrite_with_values';

interface AIAutoFillMenuProps {
  field: string;
  currentValue: string;
  onResult: (value: string) => void;
  organizationId: string;
  coreValues?: string[];
  disabled?: boolean;
}

const MENU_ITEMS: Array<{ intent: AIIntent; label: string; icon: React.ReactNode; description: string }> = [
  {
    intent: 'generate_template',
    label: 'Generate from Template',
    icon: <FileText className="h-4 w-4" />,
    description: 'Start with industry-standard content',
  },
  {
    intent: 'refine_healthcare',
    label: 'Refine for Healthcare',
    icon: <Stethoscope className="h-4 w-4" />,
    description: 'Adapt for clinic/healthcare context',
  },
  {
    intent: 'rewrite_with_values',
    label: 'Align with Core Values',
    icon: <Heart className="h-4 w-4" />,
    description: 'Incorporate your core values',
  },
];

export function AIAutoFillMenu({
  field,
  currentValue,
  onResult,
  organizationId,
  coreValues = [],
  disabled = false,
}: AIAutoFillMenuProps) {
  const [loading, setLoading] = useState<AIIntent | null>(null);
  const { toast } = useToast();

  const handleAction = async (intent: AIIntent) => {
    setLoading(intent);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const { data, error } = await supabase.functions.invoke("clarity-ai", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          intent,
          context: {
            organization_id: organizationId,
            core_values: coreValues,
          },
          field,
          current_value: currentValue,
        },
      });

      if (error) throw error;

      if (data?.suggestions?.[0]) {
        const result = typeof data.suggestions[0] === 'string' 
          ? data.suggestions[0] 
          : data.suggestions[0].text;
        if (result) {
          onResult(result);
          toast({
            title: "AI Content Generated",
            description: "Review and edit the suggestion as needed.",
          });
        }
      }
    } catch (error) {
      console.error("AI action error:", error);
      toast({
        title: "AI action failed",
        description: "Could not generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const isLoading = loading !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {isLoading ? "Generating..." : "AI Assist"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {MENU_ITEMS.map((item) => (
          <DropdownMenuItem
            key={item.intent}
            onClick={() => handleAction(item.intent)}
            disabled={isLoading}
            className="flex flex-col items-start gap-1 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </div>
            <span className="text-xs text-muted-foreground ml-6">{item.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
