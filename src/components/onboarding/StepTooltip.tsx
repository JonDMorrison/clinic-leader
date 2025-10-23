import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface StepTooltipProps {
  title: string;
  text: string;
  currentStep: number;
  totalSteps: number;
  position: { top: number; left: number };
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  showBack: boolean;
  isLastStep: boolean;
}

export const StepTooltip = ({
  title,
  text,
  currentStep,
  totalSteps,
  position,
  onNext,
  onBack,
  onSkip,
  showBack,
  isLastStep,
}: StepTooltipProps) => {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed z-[1000] w-[380px]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="glass-dark rounded-3xl p-6 border border-white/20 shadow-[0_8px_32px_rgba(31,38,135,0.25)] backdrop-blur-xl">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          <button
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-foreground/80 mb-6 leading-relaxed">{text}</p>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Step {currentStep + 1} of {totalSteps}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              {showBack && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBack}
                  className="rounded-xl"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="rounded-xl text-muted-foreground hover:text-foreground"
              >
                Skip Tour
              </Button>
            </div>

            <Button
              onClick={onNext}
              className="rounded-xl gradient-brand glow-brand"
              size="sm"
            >
              {isLastStep ? (
                "Finish 🚀"
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
