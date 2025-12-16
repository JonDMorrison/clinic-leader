import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { SourceChips } from "./SourceChips";
import { StepsToggle } from "./StepsToggle";
import { SuggestedFollowups } from "./SuggestedFollowups";
import { SectionViewerModal } from "./SectionViewerModal";

interface Source {
  doc_id: string;
  section_id: string;
  label: string;
  confidence: "high" | "med" | "low";
}

interface StructuredResponse {
  answer: string;
  steps?: string[];
  sources?: Source[];
  suggested_followups?: string[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  structured?: StructuredResponse;
}

const STORAGE_KEY_PREFIX = "sop_chat_history";
const MAX_MESSAGES = 20;

export const DocsAIChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<{ sectionId: string; docId: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("users")
        .select("team_id")
        .eq("id", user.id)
        .single();

      return { ...user, team_id: profile?.team_id };
    },
  });

  // Load persisted messages on mount
  useEffect(() => {
    if (user?.id && user?.team_id) {
      const storageKey = `${STORAGE_KEY_PREFIX}_${user.team_id}_${user.id}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setMessages(parsed.slice(-MAX_MESSAGES));
        } catch (e) {
          console.error("Failed to parse stored messages:", e);
        }
      }
    }
  }, [user?.id, user?.team_id]);

  // Persist messages on change
  useEffect(() => {
    if (user?.id && user?.team_id && messages.length > 0) {
      const storageKey = `${STORAGE_KEY_PREFIX}_${user.team_id}_${user.id}`;
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-MAX_MESSAGES)));
    }
  }, [messages, user?.id, user?.team_id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const suggestedQuestions = [
    "How do I score the NDI?",
    "When should I use Rivermead?",
    "How do I interpret ODI results?",
    "What are the clinical notes for assessments?",
  ];

  const handleSend = async () => {
    if (!input.trim() || !user?.team_id || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-query-docs", {
        body: { question: input, team_id: user.team_id },
      });

      if (error) throw error;

      // Parse structured response
      let structured: StructuredResponse | undefined;
      let displayContent = "";

      if (data.answer) {
        // New structured format
        structured = {
          answer: data.answer,
          steps: data.steps,
          sources: data.sources,
          suggested_followups: data.suggested_followups,
        };
        displayContent = data.answer;
      } else if (typeof data === "string") {
        // Legacy string format
        displayContent = data;
      } else {
        displayContent = "I received an unexpected response format.";
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: displayContent,
        structured,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error querying docs:", error);
      toast.error("Failed to get answer. Please try again.");
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

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  const handleOpenSection = (source: Source) => {
    setSelectedSection({ sectionId: source.section_id, docId: source.doc_id });
    setSectionModalOpen(true);
  };

  const handleViewFullSop = (docId: string) => {
    // Dispatch custom event that the Docs page can listen to
    window.dispatchEvent(new CustomEvent("openSopViewer", { detail: { docId } }));
  };

  return (
    <>
      <Card className="h-full flex flex-col max-h-[calc(100vh-12rem)]">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Ask About SOPs
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-start gap-4 text-center pt-8">
                <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-full p-6 mb-2">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ask questions about your SOPs and clinical documents
                  </p>
                  <div className="grid grid-cols-1 gap-2 max-w-md">
                    {suggestedQuestions.map((question) => (
                      <Button
                        key={question}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestedQuestion(question)}
                        className="text-xs h-auto py-2 px-3 whitespace-normal text-left"
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pr-2">
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[90%] rounded-lg p-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
                      {message.role === "assistant" && message.structured && (
                        <>
                          {/* Steps toggle */}
                          {message.structured.steps && message.structured.steps.length > 0 && (
                            <StepsToggle steps={message.structured.steps} />
                          )}
                          
                          {/* Source chips */}
                          {message.structured.sources && message.structured.sources.length > 0 && (
                            <SourceChips
                              sources={message.structured.sources}
                              onOpenSection={handleOpenSection}
                              onViewFullSop={handleViewFullSop}
                            />
                          )}
                          
                          {/* Suggested follow-ups */}
                          {message.structured.suggested_followups && message.structured.suggested_followups.length > 0 && (
                            <SuggestedFollowups
                              followups={message.structured.suggested_followups}
                              onSelect={handleSuggestedQuestion}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-muted rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your SOPs..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <SectionViewerModal
        open={sectionModalOpen}
        onOpenChange={setSectionModalOpen}
        sectionId={selectedSection?.sectionId || null}
        docId={selectedSection?.docId || null}
      />
    </>
  );
};
