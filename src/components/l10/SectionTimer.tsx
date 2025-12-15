import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionTimerProps {
  defaultMinutes: number;
}

export const SectionTimer = ({ defaultMinutes }: SectionTimerProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(defaultMinutes * 60);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning]);

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);
  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(defaultMinutes * 60);
  };

  const minutes = Math.abs(Math.floor(timeLeft / 60));
  const seconds = Math.abs(timeLeft % 60);
  const isOvertime = timeLeft < 0;

  return (
    <div className="flex items-center gap-2">
      <Clock className={cn("w-4 h-4", isOvertime ? "text-destructive" : "text-muted-foreground")} />
      <span className={cn(
        "font-mono text-sm font-medium min-w-[50px]",
        isOvertime && "text-destructive"
      )}>
        {isOvertime && "-"}
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
      
      <div className="flex gap-1">
        {!isRunning ? (
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleStart}>
            <Play className="w-3 h-3" />
          </Button>
        ) : (
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handlePause}>
            <Pause className="w-3 h-3" />
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleReset}>
          <RotateCcw className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};
