import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export const CopilotWidget = () => {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data } = await supabase
        .from("users")
        .select("team_id")
        .eq("email", user.email)
        .single();
      
      return { ...user, team_id: data?.team_id };
    },
  });

  const handleSend = async () => {
    if (!input.trim() || !currentUser?.team_id) return;

    setIsLoading(true);
    setResponse("");

    try {
      const { data, error } = await supabase.functions.invoke("ai-query-data", {
        body: { question: input, team_id: currentUser.team_id },
      });

      if (error) throw error;
      setResponse(data.answer);
      setInput("");
    } catch (error) {
      console.error("Error querying AI:", error);
      toast.error("Failed to get AI response");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="hover:scale-105 transition-transform duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand" />
          AI Copilot
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/copilot")}
          className="text-xs"
        >
          Full View
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {response ? (
          <div className="p-3 rounded-lg bg-muted/50 text-sm max-h-32 overflow-y-auto">
            <p className="text-muted-foreground italic">{response}</p>
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-4">
            Ask me anything about your clinic data
          </div>
        )}
        
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about KPIs, rocks, issues..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
