import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
        .select("team_id, role")
        .eq("email", user.email)
        .single();
      
      return { ...user, team_id: data?.team_id, role: data?.role };
    },
  });

  const getSuggestedQuestions = (role: string | undefined) => {
    switch (role) {
      case "owner":
      case "director":
        return [
          "What are our top 3 KPIs this week?",
          "Show me all overdue rocks",
          "What issues need my attention?",
        ];
      case "manager":
        return [
          "How is my team performing on KPIs?",
          "What rocks are off track?",
          "Summary of open issues",
        ];
      default:
        return [
          "What are my current rocks?",
          "Show my team's scorecard",
          "What todos are due soon?",
        ];
    }
  };

  const suggestions = getSuggestedQuestions(currentUser?.role);

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="relative h-full"
    >
      {/* Animated gradient border - hidden on mobile for performance */}
      <motion.div
        className="absolute -inset-0.5 bg-gradient-to-r from-brand via-accent to-brand rounded-3xl opacity-20 blur-sm hidden md:block"
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          backgroundSize: "200% 200%",
        }}
      />
      
      <Card className="relative h-full hover:scale-[1.02] transition-all duration-300 border-brand/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 md:px-6 pt-4 md:pt-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <motion.div
              className="md:animate-none" // Disable animation on mobile
              animate={{
                rotate: [0, 5, -5, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-brand" />
            </motion.div>
            <span className="bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">
              AI Copilot
            </span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/copilot")}
            className="text-xs hover:bg-brand/10 min-h-[36px]"
          >
            Full View
          </Button>
        </CardHeader>
        <CardContent className="px-4 md:px-6 pb-4 md:pb-6 flex flex-col h-full">
          {response ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-2xl bg-gradient-to-br from-brand/5 to-accent/5 border border-brand/20 text-sm flex-1 overflow-y-auto mb-4"
            >
              <p className="text-foreground">{response}</p>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-3 flex-1 justify-center mb-4">
              <p className="text-xs text-muted-foreground text-center font-medium">
                Try asking:
              </p>
              <div className="flex flex-col gap-2">
                {suggestions.map((question, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="touch-manipulation"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInput(question)}
                      className={cn(
                        "text-xs h-auto py-3 px-3 w-full",
                        "bg-gradient-to-br from-white/5 to-white/0",
                        "border-white/10 hover:border-brand/30",
                        "hover:shadow-[0_4px_12px_rgba(139,92,246,0.15)]",
                        "transition-all duration-300 text-left justify-start"
                      )}
                    >
                      {question}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex gap-2 mt-auto">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about KPIs, rocks, issues..."
              disabled={isLoading}
              className="flex-1 border-white/10 focus:border-brand/30 bg-white/5 min-h-[44px]"
            />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="shrink-0 bg-gradient-to-br from-brand to-accent hover:shadow-[0_4px_16px_rgba(139,92,246,0.3)] min-h-[44px] min-w-[44px]"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
