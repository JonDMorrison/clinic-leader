import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2, Maximize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { CopilotDrawer } from "@/components/ai/CopilotDrawer";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const CopilotWidget = () => {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      const { data: userData } = await supabase
        .from("users")
        .select("team_id")
        .eq("id", user.id)
        .single();
      
      return { ...user, team_id: userData?.team_id, role: roleData?.role || "staff" };
    },
  });

  const getSuggestedQuestions = (role: string | undefined) => {
    switch (role) {
      case "owner":
      case "director":
        return [
          "Which metrics are off track?",
          "Show me all overdue rocks",
          "What issues need attention?",
        ];
      case "manager":
        return [
          "How is my team performing?",
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

  const handleSend = async (questionOverride?: string) => {
    const question = questionOverride || input;
    if (!question.trim() || !currentUser?.team_id) return;

    setIsLoading(true);
    setResponse("");

    try {
      const { data, error } = await supabase.functions.invoke("ai-query-data", {
        body: { question, team_id: currentUser.team_id },
      });

      if (error) throw error;
      
      // Update widget response
      setResponse(data.answer);
      
      // Also update messages for drawer sync
      const newMessages: Message[] = [
        { role: "user", content: question },
        { role: "assistant", content: data.answer },
      ];
      setMessages(newMessages);
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

  const handleExpandClick = () => {
    setDrawerOpen(true);
  };

  const handleMessagesChange = (newMessages: Message[]) => {
    setMessages(newMessages);
    // Update widget response with the latest assistant message
    const lastAssistant = [...newMessages].reverse().find(m => m.role === "assistant");
    if (lastAssistant) {
      setResponse(lastAssistant.content);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="relative h-full"
      >
        <Card className="relative h-full flex flex-col bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-950/50 dark:to-cyan-950/50 border-cyan-200/50 dark:border-cyan-800/30 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 md:px-6 pt-4 md:pt-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <motion.div
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
                <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-cyan-600 dark:text-cyan-400" />
              </motion.div>
              <span className="text-cyan-700 dark:text-cyan-300 font-semibold">
                AI Copilot
              </span>
            </CardTitle>
            <button
              onClick={handleExpandClick}
              className="flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:underline transition-colors"
            >
              <Maximize2 className="w-3 h-3" />
              Expand
            </button>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4 md:pb-6 flex flex-col flex-1">
            {response ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl bg-white dark:bg-white/10 border border-cyan-100 dark:border-cyan-800/30 text-sm flex-1 overflow-y-auto mb-3 shadow-sm"
              >
                <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{response}</p>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-3 flex-1 mb-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  Suggested Questions
                </p>
                <div className="flex flex-col gap-2">
                  {suggestions.map((question, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSend(question)}
                      className="w-full text-left py-3 px-4 bg-white dark:bg-white/10 rounded-xl shadow-sm hover:shadow-md text-sm text-slate-700 dark:text-slate-200 transition-all duration-200 border border-transparent hover:border-cyan-200 dark:hover:border-cyan-700"
                    >
                      {question}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-2 mt-auto pt-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about metrics, rocks, issues..."
                disabled={isLoading}
                className="flex-1 bg-white dark:bg-white/10 border-slate-200 dark:border-slate-700 focus:border-cyan-400 dark:focus:border-cyan-500 rounded-xl shadow-sm focus:shadow-md transition-all min-h-[44px] placeholder:text-slate-400"
              />
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="shrink-0 bg-gradient-to-br from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl shadow-md hover:shadow-lg min-h-[44px] min-w-[44px] transition-all"
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

      <CopilotDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        initialMessages={messages}
        onMessagesChange={handleMessagesChange}
      />
    </>
  );
};
