import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  label: string;
  completed: boolean;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
}

export const Stepper = ({ steps, currentStep }: StepperProps) => {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start flex-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                  step.completed
                    ? "bg-primary border-primary text-primary-foreground"
                    : currentStep === step.id
                    ? "border-primary text-primary bg-primary/10"
                    : "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {step.completed ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-semibold">{step.id + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-xs mt-2 text-center max-w-[80px]",
                  currentStep === step.id
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-[2px] mx-2 transition-all",
                  step.completed
                    ? "bg-primary"
                    : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
