import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const Copilot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return null;

      const { data, error } = await supabase
        .from("users")
        .select("team_id")
        .eq("email", authData.user.email)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const handleSend = async () => {
    if (!input.trim() || !currentUser?.team_id) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-query-data", {
        body: { 
          question: input,
          team_id: currentUser.team_id,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.answer,
      };
      setMessages((prev) => [...prev, assistantMessage]);
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

  const exampleQuestions = [
    "Who's off track on Rocks?",
    "What are our top 3 KPI issues?",
    "Summarize last week's highlights",
    "Which KPIs are trending down?",
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-brand" />
          <h1 className="text-3xl font-bold text-foreground">EOS Copilot</h1>
        </div>
        <p className="text-muted-foreground">Ask questions about your clinic's EOS data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chat with Your Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground mb-6">Ask me anything about your clinic's performance</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {exampleQuestions.map((question, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => setInput(question)}
                      className="text-xs"
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 min-h-[400px] max-h-[500px] overflow-y-auto">
                {messages.map((message, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg ${
                      message.role === "user"
                        ? "bg-brand/10 ml-12"
                        : "bg-muted/50 mr-12 italic"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {message.role === "assistant" && (
                        <Sparkles className="w-4 h-4 text-brand mt-1 flex-shrink-0" />
                      )}
                      <p className="text-sm text-foreground whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="p-4 rounded-lg bg-muted/50 mr-12 italic">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand animate-pulse" />
                      <p className="text-sm text-muted-foreground">Thinking...</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about KPIs, Rocks, Issues, etc..."
                disabled={isLoading}
              />
              <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Copilot;
