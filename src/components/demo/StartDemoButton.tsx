import { Button } from "@/components/ui/button";
import { Presentation } from "lucide-react";
import { useDemoWalkthrough } from "./DemoWalkthrough";

interface StartDemoButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export const StartDemoButton = ({ 
  variant = "outline", 
  size = "sm",
  className 
}: StartDemoButtonProps) => {
  const { start, isActive } = useDemoWalkthrough();

  if (isActive) return null;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={start}
      className={className}
    >
      <Presentation className="w-4 h-4 mr-2" />
      Start Demo
    </Button>
  );
};
