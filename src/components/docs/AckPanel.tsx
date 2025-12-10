import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface AckPanelProps {
  docId: string;
  docTitle: string;
  isAcknowledged: boolean;
  acknowledgedAt?: string;
  withQuiz?: boolean;
  onAcknowledged: () => void;
}

const QUIZ_QUESTIONS: Question[] = [
  {
    question: "I have read and understood this document completely.",
    options: ["Yes", "No"],
    correctAnswer: 0,
  },
  {
    question: "I agree to follow the procedures outlined in this document.",
    options: ["Yes", "No"],
    correctAnswer: 0,
  },
  {
    question: "I will refer back to this document when needed.",
    options: ["Yes", "No"],
    correctAnswer: 0,
  },
];

export const AckPanel = ({
  docId,
  docTitle,
  isAcknowledged,
  acknowledgedAt,
  withQuiz = false,
  onAcknowledged,
}: AckPanelProps) => {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleAcknowledge = async () => {
    if (withQuiz) {
      // Check if all questions are answered
      if (Object.keys(answers).length < QUIZ_QUESTIONS.length) {
        toast.error("Please answer all questions");
        return;
      }

      // Calculate score
      let correctAnswers = 0;
      QUIZ_QUESTIONS.forEach((q, idx) => {
        if (answers[idx] === q.correctAnswer) {
          correctAnswers++;
        }
      });

      const score = Math.round((correctAnswers / QUIZ_QUESTIONS.length) * 100);

      if (score < 100) {
        setShowResults(true);
        toast.error(`You must answer all questions correctly. Score: ${score}%`);
        return;
      }

      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Authentication required");
        setIsSubmitting(false);
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("id, team_id")
        .eq("email", user.email)
        .maybeSingle();

      if (!userData || !userData.team_id) {
        toast.error("User profile not found");
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from("acknowledgements").insert({
        doc_id: docId,
        user_id: userData.id,
        organization_id: userData.team_id,
        quiz_score: score,
      });

      if (error) {
        toast.error("Failed to save acknowledgment");
        setIsSubmitting(false);
        return;
      }

      toast.success("Document acknowledged successfully");
      onAcknowledged();
    } else {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Authentication required");
        setIsSubmitting(false);
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("id, team_id")
        .eq("email", user.email)
        .maybeSingle();

      if (!userData || !userData.team_id) {
        toast.error("User profile not found");
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from("acknowledgements").insert({
        doc_id: docId,
        user_id: userData.id,
        organization_id: userData.team_id,
      });

      if (error) {
        toast.error("Failed to save acknowledgment");
        setIsSubmitting(false);
        return;
      }

      toast.success("Document acknowledged successfully");
      onAcknowledged();
    }
  };

  if (isAcknowledged) {
    return (
      <Card className="border-success/20 bg-success/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <CardTitle className="text-success">Acknowledged</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You have acknowledged this document.
          </p>
          {acknowledgedAt && (
            <p className="text-xs text-muted-foreground mt-2">
              Completed on {new Date(acknowledgedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-warning/20 bg-warning/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-warning" />
          <CardTitle className="text-warning">Acknowledgment Required</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Please confirm that you have read and understood "{docTitle}".
        </p>

        {withQuiz && (
          <div className="space-y-6">
            {QUIZ_QUESTIONS.map((q, idx) => (
              <div key={idx} className="space-y-3">
                <Label className="text-sm font-medium">
                  {idx + 1}. {q.question}
                </Label>
                <RadioGroup
                  value={answers[idx]?.toString()}
                  onValueChange={(value) =>
                    setAnswers({ ...answers, [idx]: parseInt(value) })
                  }
                >
                  {q.options.map((option, optIdx) => (
                    <div key={optIdx} className="flex items-center space-x-2">
                      <RadioGroupItem value={optIdx.toString()} id={`q${idx}-opt${optIdx}`} />
                      <Label
                        htmlFor={`q${idx}-opt${optIdx}`}
                        className={`cursor-pointer ${
                          showResults &&
                          answers[idx] === optIdx &&
                          optIdx !== q.correctAnswer
                            ? "text-danger"
                            : ""
                        }`}
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </div>
        )}

        <Button onClick={handleAcknowledge} disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Submitting..." : "I Acknowledge"}
        </Button>
      </CardContent>
    </Card>
  );
};
