import { useState, useEffect, createContext, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { DemoPanel } from "./DemoPanel";

export interface DemoStep {
  id: number;
  path: string;
  title: string;
  subtitle: string;
  talkingPoints: string[];
  highlight?: string; // CSS selector for optional element highlight
}

const DEMO_STEPS: DemoStep[] = [
  {
    id: 0,
    path: "/vto",
    title: "Vision/Traction Organizer",
    subtitle: "Where strategy begins",
    talkingPoints: [
      "Core values define the culture and hiring decisions",
      "10-year target creates long-range alignment",
      "3-year picture breaks down the big goal",
      "Everything else in the app flows from this vision",
    ],
  },
  {
    id: 1,
    path: "/vto/vision",
    title: "Building the Vision",
    subtitle: "AI-assisted strategic planning",
    talkingPoints: [
      "Each section has AI draft assistance",
      "Progress tracking shows completion status",
      "Autosave ensures nothing is lost",
      "Templates available for quick starts",
    ],
  },
  {
    id: 2,
    path: "/scorecard",
    title: "Scorecard",
    subtitle: "Weekly KPI tracking",
    talkingPoints: [
      "Metrics can be automated via Jane integration",
      "VTO goal badges show strategic alignment",
      "Red/yellow/green status at a glance",
      "Off-track metrics auto-create issues",
    ],
    highlight: "[data-vto-badge]",
  },
  {
    id: 3,
    path: "/rocks",
    title: "Quarterly Rocks",
    subtitle: "90-day priorities",
    talkingPoints: [
      "Drag-and-drop between On Track, Off Track, Done",
      "Each rock links back to VTO goals",
      "Confidence tracking for early warnings",
      "Quarter transition prompts for completion review",
    ],
  },
  {
    id: 4,
    path: "/issues",
    title: "Issues List",
    subtitle: "Problems surface, get solved",
    talkingPoints: [
      "Issues created from off-track metrics automatically",
      "IDS process: Identify, Discuss, Solve",
      "Priority voting for L10 meetings",
      "Resolution tracking and accountability",
    ],
  },
  {
    id: 5,
    path: "/meeting",
    title: "L10 Meeting",
    subtitle: "Weekly execution rhythm",
    talkingPoints: [
      "Structured 90-minute agenda",
      "Scorecard review pulls live data",
      "Rock check-ins with confidence updates",
      "IDS section for solving top issues",
      "Todos cascade from decisions",
    ],
  },
  {
    id: 6,
    path: "/docs",
    title: "SOP Library",
    subtitle: "Answers without asking",
    talkingPoints: [
      "Policies and procedures in one place",
      "Acknowledgment tracking for compliance",
      "Version history for audit trails",
      "AI search finds answers instantly",
    ],
  },
  {
    id: 7,
    path: "/",
    title: "Dashboard",
    subtitle: "Daily command center",
    talkingPoints: [
      "VTO progress at a glance",
      "Core value of the week spotlight",
      "Quick actions for common tasks",
      "AI copilot for instant insights",
    ],
  },
];

interface DemoContextType {
  isActive: boolean;
  currentStep: number;
  steps: DemoStep[];
  start: () => void;
  stop: () => void;
  next: () => void;
  back: () => void;
  goToStep: (step: number) => void;
}

const DemoContext = createContext<DemoContextType | null>(null);

export const useDemoWalkthrough = () => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemoWalkthrough must be used within DemoWalkthroughProvider");
  }
  return context;
};

interface DemoWalkthroughProviderProps {
  children: React.ReactNode;
}

export const DemoWalkthroughProvider = ({ children }: DemoWalkthroughProviderProps) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const start = () => {
    setIsActive(true);
    setCurrentStep(0);
    navigate(DEMO_STEPS[0].path);
  };

  const stop = () => {
    setIsActive(false);
    setCurrentStep(0);
  };

  const next = () => {
    if (currentStep < DEMO_STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      navigate(DEMO_STEPS[nextStep].path);
    } else {
      stop();
    }
  };

  const back = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      navigate(DEMO_STEPS[prevStep].path);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 0 && step < DEMO_STEPS.length) {
      setCurrentStep(step);
      navigate(DEMO_STEPS[step].path);
    }
  };

  // Sync step when user manually navigates
  useEffect(() => {
    if (isActive) {
      const matchingStep = DEMO_STEPS.findIndex(s => s.path === location.pathname);
      if (matchingStep !== -1 && matchingStep !== currentStep) {
        setCurrentStep(matchingStep);
      }
    }
  }, [location.pathname, isActive, currentStep]);

  return (
    <DemoContext.Provider
      value={{
        isActive,
        currentStep,
        steps: DEMO_STEPS,
        start,
        stop,
        next,
        back,
        goToStep,
      }}
    >
      {children}
      {isActive && <DemoPanel />}
    </DemoContext.Provider>
  );
};
