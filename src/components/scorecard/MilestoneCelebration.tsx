import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Trophy, X, Sparkles, TrendingUp, Target } from "lucide-react";
import confetti from "canvas-confetti";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Milestone {
  id: string;
  metric_id: string;
  milestone_type: string;
  milestone_value: number;
  achieved_at: string;
  celebrated: boolean;
  metric_name?: string;
  metric_unit?: string;
}

interface MilestoneCelebrationProps {
  milestone: Milestone;
  onDismiss: () => void;
}

const getMilestoneIcon = (type: string) => {
  switch (type) {
    case "goal_achieved":
      return <Trophy className="h-8 w-8 text-amber-500" />;
    case "record_high":
      return <TrendingUp className="h-8 w-8 text-green-500" />;
    case "target_streak":
      return <Target className="h-8 w-8 text-blue-500" />;
    default:
      return <Sparkles className="h-8 w-8 text-purple-500" />;
  }
};

const getMilestoneMessage = (type: string, value: number, metricName?: string, unit?: string) => {
  switch (type) {
    case "goal_achieved":
      return {
        title: "🎉 Goal Achieved!",
        message: `${metricName} hit ${value} ${unit}! Amazing work!`,
      };
    case "record_high":
      return {
        title: "🚀 New Record!",
        message: `${metricName} reached an all-time high of ${value} ${unit}!`,
      };
    case "target_streak":
      return {
        title: "🔥 Streak Milestone!",
        message: `${metricName} has met targets for ${value} consecutive weeks!`,
      };
    default:
      return {
        title: "⭐ Milestone Reached!",
        message: `${metricName} achieved ${value} ${unit}`,
      };
  }
};

export const MilestoneCelebration = ({ milestone, onDismiss }: MilestoneCelebrationProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const queryClient = useQueryClient();

  const markCelebratedMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("metric_milestones")
        .update({ celebrated: true })
        .eq("id", milestone.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metric-milestones"] });
    },
  });

  useEffect(() => {
    // Trigger confetti
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ["#FFD700", "#FFA500", "#FF6347"],
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ["#FFD700", "#FFA500", "#FF6347"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
    setIsVisible(true);

    // Auto-dismiss after 10 seconds
    const timer = setTimeout(() => {
      handleDismiss();
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    markCelebratedMutation.mutate();
    setTimeout(onDismiss, 300);
  };

  const { title, message } = getMilestoneMessage(
    milestone.milestone_type,
    milestone.milestone_value,
    milestone.metric_name,
    milestone.metric_unit
  );

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-2xl max-w-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-1">
              {getMilestoneIcon(milestone.milestone_type)}
            </div>
            
            <div className="flex-1 space-y-2">
              <h3 className="font-bold text-lg text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{message}</p>
              
              <div className="flex gap-2 pt-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleDismiss}
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
                >
                  Awesome!
                </Button>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
