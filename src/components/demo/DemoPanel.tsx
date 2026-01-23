import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Presentation,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { useDemoWalkthrough } from "./DemoWalkthrough";
import { cn } from "@/lib/utils";

export const DemoPanel = () => {
  const { currentStep, steps, next, back, stop, goToStep } = useDemoWalkthrough();
  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-6 right-6 z-[999] w-[400px]"
      >
        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand to-brand/80 px-5 py-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Presentation className="w-5 h-5" />
                <span className="font-semibold">Quick Tour</span>
              </div>
              <button
                onClick={stop}
                className="hover:bg-white/20 rounded-full p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/80">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <Progress value={progress} className="flex-1 h-1.5 bg-white/20" />
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Current Step Info */}
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Badge variant="secondary" className="mb-2">
                {step.subtitle}
              </Badge>
              <h3 className="text-xl font-bold text-foreground mb-3">
                {step.title}
              </h3>

              {/* What You Need To Know */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  What You Need To Know
                </span>
                <ul className="space-y-2">
                  {step.talkingPoints.map((point, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-start gap-2 text-sm text-foreground/80"
                    >
                      <span className="text-brand mt-0.5">•</span>
                      <span>{point}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Step Indicators */}
            <ScrollArea className="w-full">
              <div className="flex gap-1.5 py-2">
                {steps.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => goToStep(idx)}
                    className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-full transition-all",
                      idx === currentStep
                        ? "bg-brand text-white scale-110"
                        : idx < currentStep
                        ? "bg-success/20 text-success"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                    title={s.title}
                  >
                    {idx < currentStep ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-medium">{idx + 1}</span>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Navigation */}
          <div className="px-5 pb-5 flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={back}
              disabled={currentStep === 0}
              className="rounded-xl"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>

            <Button
              onClick={isLastStep ? stop : next}
              size="sm"
              className="rounded-xl bg-brand hover:bg-brand/90"
            >
              {isLastStep ? (
                "End Demo"
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
