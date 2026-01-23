import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Overlay } from "./Overlay";
import { StepTooltip } from "./StepTooltip";
import { userTourService } from "@/lib/userTourService";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";

interface TourStep {
  id: number;
  target: string | null;
  title: string;
  text: string;
  path?: string;
}

const tourSteps: TourStep[] = [
  {
    id: 0,
    target: '[href="/"]',
    title: "Welcome to ClinicLeader! 👋",
    text: "Let's take a quick tour of the key features. This is your main dashboard where you'll see an overview of everything happening in your clinic.",
    path: "/",
  },
  {
    id: 1,
    target: '[href="/scorecard"]',
    title: "Track Your KPIs 📊",
    text: "View and monitor your key performance indicators weekly. Track metrics like patient visits, revenue, referrals, and more to keep your clinic running smoothly.",
    path: "/scorecard",
  },
  {
    id: 2,
    target: '[href="/docs"]',
    title: "SOP Library 📚",
    text: "Access your policies, procedures, and standard operating documents. Keep your team aligned with centralized documentation and acknowledgement tracking.",
    path: "/docs",
  },
  {
    id: 3,
    target: '[href="/meeting"]',
    title: "Level 10 Meetings 🎯",
    text: "Run productive weekly meetings with structured agendas. Review scorecard, rocks, headlines, todos, and resolve issues using the IDS process.",
    path: "/meeting",
  },
  {
    id: 4,
    target: '[href="/copilot"]',
    title: "AI Insights 🤖",
    text: "Get smart suggestions and insights based on your clinic data. Ask questions, generate reports, and discover patterns you might have missed.",
    path: "/copilot",
  },
  {
    id: 5,
    target: null,
    title: "All set! 🚀",
    text: "You're ready to start using ClinicLeader! Explore at your own pace, and remember you can always restart this tour from the Help menu.",
  },
];

interface OnboardingWizardProps {
  userId: string;
  onComplete: () => void;
}

export const OnboardingWizard = ({ userId, onComplete }: OnboardingWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const step = tourSteps[currentStep];
    
    // Navigate to the step's path if specified
    if (step.path) {
      navigate(step.path);
    }

    // Wait for navigation and DOM update
    setTimeout(() => {
      updateTooltipPosition();
    }, 300);
  }, [currentStep, navigate]);

  const updateTooltipPosition = () => {
    const step = tourSteps[currentStep];
    
    if (!step.target) {
      // Center the tooltip for steps without targets
      setTooltipPosition({
        top: window.innerHeight / 2 - 150,
        left: window.innerWidth / 2 - 190,
      });
      return;
    }

    const element = document.querySelector(step.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      
      // Position tooltip to the right of the target element
      let top = rect.top + rect.height / 2 - 150;
      let left = rect.right + 20;

      // Adjust if tooltip would go off screen
      if (left + 380 > window.innerWidth) {
        left = rect.left - 400;
      }
      
      if (top < 20) top = 20;
      if (top + 300 > window.innerHeight) {
        top = window.innerHeight - 320;
      }

      setTooltipPosition({ top, left });

      // Highlight the target element
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleNext = async () => {
    if (currentStep < tourSteps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      // Don't block the UI on network/database writes.
      // If the write fails, we still want the tour to advance.
      void userTourService.updateStep(userId, nextStep);
    } else {
      await handleComplete();
    }
  };

  const handleBack = async () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      void userTourService.updateStep(userId, prevStep);
    }
  };

  const handleSkip = async () => {
    await handleComplete();
  };

  const handleComplete = async () => {
    // Don't block completion UI on network/database writes.
    void userTourService.completeTour(userId);
    
    // Confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#0059FF", "#00F5D4", "#00C9FF"],
    });

    onComplete();
  };

  const step = tourSteps[currentStep];

  return (
    <AnimatePresence mode="wait">
      <Overlay key="overlay" />
      <StepTooltip
        key={`step-${currentStep}`}
        title={step.title}
        text={step.text}
        currentStep={currentStep}
        totalSteps={tourSteps.length}
        position={tooltipPosition}
        onNext={handleNext}
        onBack={handleBack}
        onSkip={handleSkip}
        showBack={currentStep > 0}
        isLastStep={currentStep === tourSteps.length - 1}
      />
    </AnimatePresence>
  );
};
