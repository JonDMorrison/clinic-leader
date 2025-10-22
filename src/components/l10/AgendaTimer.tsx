import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, RotateCcw, Clock } from "lucide-react";

interface AgendaTimerProps {
  sectionName: string;
  defaultMinutes?: number;
}

export const AgendaTimer = ({ sectionName, defaultMinutes = 5 }: AgendaTimerProps) => {
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(defaultMinutes * 60);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  useEffect(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    setMinutes(mins);
    setSeconds(secs);
  }, [timeLeft]);

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);
  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(defaultMinutes * 60);
  };

  const handleSetMinutes = (value: string) => {
    const newMinutes = parseInt(value) || 0;
    if (newMinutes >= 0 && newMinutes <= 60) {
      setTimeLeft(newMinutes * 60);
      setIsRunning(false);
    }
  };

  const isOvertime = timeLeft === 0;

  return (
    <Card className={`${isOvertime ? "border-danger" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-brand" />
            <span className="font-medium">{sectionName}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={Math.floor(timeLeft / 60)}
                onChange={(e) => handleSetMinutes(e.target.value)}
                className="w-16 text-center"
                min="0"
                max="60"
                disabled={isRunning}
              />
              <span className="text-2xl font-mono font-bold">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
              {isOvertime && <span className="text-danger font-medium">Time!</span>}
            </div>

            <div className="flex gap-2">
              {!isRunning ? (
                <Button size="sm" onClick={handleStart} disabled={timeLeft === 0}>
                  <Play className="w-4 h-4" />
                </Button>
              ) : (
                <Button size="sm" onClick={handlePause}>
                  <Pause className="w-4 h-4" />
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handleReset}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
