import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface DocChatProps {
  docId: string;
  docTitle: string;
  docContent: string;
  extractStatus?: string;
  onTriggerExtraction?: () => void;
}

export const DocChat = ({ docId, docTitle, docContent, extractStatus, onTriggerExtraction }: DocChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const hasNoContent = !docContent || docContent.trim().length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-query-single-doc", {
        body: {
          question: userMessage,
          docTitle,
          docContent,
          conversationHistory: messages,
        },
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
    } catch (error) {
      console.error("Error querying document:", error);
      toast.error("Failed to get answer. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border p-4">
        <h3 className="font-semibold text-sm">Ask about this document</h3>
        <p className="text-xs text-muted-foreground mt-1">Questions will only reference: {docTitle}</p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {hasNoContent ? (
            <div className="flex flex-col items-center justify-center text-center py-8 px-4 space-y-4">
              <AlertCircle className="w-12 h-12 text-amber-500" />
              <div className="space-y-2">
                <p className="font-medium text-foreground">Document content not available</p>
                <p className="text-sm text-muted-foreground">
                  {extractStatus === 'needs_ocr' 
                    ? 'This appears to be a scanned document that requires OCR processing.'
                    : extractStatus === 'error'
                    ? 'Text extraction failed for this document.'
                    : extractStatus === 'extracting' || extractStatus === 'queued'
                    ? 'This document is still being processed. Please wait a moment.'
                    : 'Text has not been extracted from this document yet.'}
                </p>
                {onTriggerExtraction && extractStatus !== 'extracting' && extractStatus !== 'queued' && (
                  <Button onClick={onTriggerExtraction} size="sm" className="mt-2">
                    {extractStatus === 'needs_ocr' ? 'Run OCR' : 'Extract Text'}
                  </Button>
                )}
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              Ask a question about this document to get started
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t border-border p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about this document..."
            className="min-h-[60px] resize-none"
            disabled={hasNoContent}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button type="submit" disabled={isLoading || !input.trim() || hasNoContent} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};
