import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Send, Sparkles, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface CopilotDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMessages?: Message[];
  onMessagesChange?: (messages: Message[]) => void;
}

export const CopilotDrawer = ({
  open,
  onOpenChange,
  initialMessages = [],
  onMessagesChange,
}: CopilotDrawerProps) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data: userData } = await supabase
        .from("users")
        .select("team_id")
        .eq("id", user.id)
        .single();
      
      return { ...user, team_id: userData?.team_id };
    },
  });

  const exampleQuestions = [
    "Which metrics are off track this month?",
    "What rocks are due in the next 30 days?",
    "Show me our team's open issues",
    "How are we tracking on our quarterly goals?",
    "Summarize our scorecard performance",
    "Who needs help with their rocks?",
  ];

  const handleSend = async (questionOverride?: string) => {
    const question = questionOverride || input;
    if (!question.trim() || !currentUser?.team_id) return;

    const userMessage: Message = { role: "user", content: question };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    onMessagesChange?.(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-query-data", {
        body: { 
          question,
          team_id: currentUser.team_id,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.answer,
      };
      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);
      onMessagesChange?.(updatedMessages);
    } catch (error: any) {
      console.error("Error querying copilot:", error);
      toast.error(error.message || "Failed to get response");
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

  const clearConversation = () => {
    setMessages([]);
    onMessagesChange?.([]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/30 dark:to-sky-950/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
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
                <Sparkles className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              </motion.div>
              <div>
                <SheetTitle className="text-cyan-700 dark:text-cyan-300">
                  AI Copilot
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Ask questions about your metrics, rocks, and issues
                </SheetDescription>
              </div>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearConversation}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear chat
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="py-8">
                <p className="text-sm text-muted-foreground mb-6 text-center">
                  Ask me anything about your organization's performance
                </p>
                <div className="grid gap-2">
                  {exampleQuestions.map((question, idx) => (
                    <motion.button
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSend(question)}
                      className="w-full text-left py-3 px-4 bg-white dark:bg-white/5 rounded-xl shadow-sm hover:shadow-md text-sm text-slate-700 dark:text-slate-200 transition-all duration-200 border border-transparent hover:border-cyan-200 dark:hover:border-cyan-700"
                    >
                      {question}
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {messages.map((message, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-4 rounded-xl ${
                      message.role === "user"
                        ? "bg-cyan-100/50 dark:bg-cyan-900/30 ml-8"
                        : "bg-white dark:bg-white/5 mr-8 border border-slate-100 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {message.role === "assistant" && (
                        <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400 mt-0.5 flex-shrink-0" />
                      )}
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-white dark:bg-white/5 mr-8 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400 animate-pulse" />
                      <p className="text-sm text-muted-foreground">Analyzing your data...</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about metrics, rocks, issues..."
              disabled={isLoading}
              className="flex-1 bg-white dark:bg-white/5 border-slate-200 dark:border-slate-700 focus:border-cyan-400 dark:focus:border-cyan-500 rounded-xl"
            />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="shrink-0 bg-gradient-to-br from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </motion.div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
