import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface FeedbackButtonsProps {
  logId: string;
}

export const FeedbackButtons = ({ logId }: FeedbackButtonsProps) => {
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null);
  const [comment, setComment] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (score: "positive" | "negative") => {
    if (score === "negative") {
      setIsOpen(true);
      setFeedback(score);
      return;
    }

    await submitFeedback(score, "");
  };

  const submitFeedback = async (score: "positive" | "negative", userComment: string) => {
    setIsSubmitting(true);
    try {
      // Get existing log
      const { data: existingLog, error: fetchError } = await supabase
        .from("ai_logs")
        .select("feedback")
        .eq("id", logId)
        .single();

      if (fetchError) throw fetchError;

      // Update with feedback
      const { error: updateError } = await supabase
        .from("ai_logs")
        .update({
          feedback: {
            score: score === "positive" ? 1 : -1,
            comment: userComment || null,
            timestamp: new Date().toISOString(),
          },
        })
        .eq("id", logId);

      if (updateError) throw updateError;

      setFeedback(score);
      toast.success("Thank you for your feedback!");
      setIsOpen(false);
      setComment("");
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerate = async () => {
    toast.info("Regeneration feature coming soon");
    // TODO: Implement regeneration logic
  };

  return (
    <div className="flex items-center gap-2">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleFeedback("positive")}
            disabled={feedback !== null}
            className={cn(
              "h-7 px-2",
              feedback === "positive" && "text-success"
            )}
          >
            <ThumbsUp className="w-3 h-3" />
          </Button>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleFeedback("negative")}
              disabled={feedback !== null}
              className={cn(
                "h-7 px-2",
                feedback === "negative" && "text-danger"
              )}
            >
              <ThumbsDown className="w-3 h-3" />
            </Button>
          </DialogTrigger>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRegenerate}
            className="h-7 px-2"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Help us improve</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              What could be better about this insight?
            </p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional: Tell us what went wrong..."
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  setComment("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => submitFeedback("negative", comment)}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper for cn function
import { cn } from "@/lib/utils";
