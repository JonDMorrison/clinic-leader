import { useState } from "react";
import { getStorage, setStorage } from "@/lib/storage/versionedStorage";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, X, Rocket, ExternalLink } from "lucide-react";
import { useSetupProgress } from "@/hooks/useSetupProgress";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function GettingStartedWidget() {
  const navigate = useNavigate();
  const { setupProgress, isLoading } = useSetupProgress();
  const [dismissed, setDismissed] = useState(() => {
    return getStorage<boolean>("setup-widget-dismissed") === true;
  });

  if (isLoading || !setupProgress || dismissed) {
    return null;
  }

  // Don't show if 100% complete
  if (setupProgress.isComplete) {
    return null;
  }

  const handleDismiss = () => {
    setStorage("setup-widget-dismissed", true);
    setDismissed(true);
  };

  const handleItemClick = (route?: string) => {
    if (route) {
      navigate(route);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="relative overflow-hidden border-brand/20 bg-gradient-to-br from-brand/5 via-background to-accent/5">
          {/* Animated background gradient */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-brand/10 via-accent/10 to-brand/10 opacity-50"
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          <CardHeader className="relative pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Rocket className="w-8 h-8 text-brand" />
                </motion.div>
                <div>
                  <CardTitle className="text-xl">Getting Started</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete these steps to unlock the full power of ClinicLeader
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="relative space-y-4">
            {/* Progress Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Setup Progress</span>
                <span className="text-brand font-semibold">
                  {setupProgress.completedCount}/{setupProgress.totalCount} completed
                </span>
              </div>
              <Progress value={setupProgress.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {setupProgress.percentage}% complete
              </p>
            </div>

            {/* Checklist */}
            <div className="space-y-2 pt-2">
              {setupProgress.items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => !item.completed && handleItemClick(item.route)}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-all",
                    item.completed
                      ? "border-success/20 bg-success/5"
                      : "border-border hover:border-brand/30 hover:bg-accent/5 cursor-pointer",
                  )}
                >
                  <div className="pt-0.5">
                    {item.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          item.completed ? "text-success" : "text-foreground",
                        )}
                      >
                        {item.label}
                      </p>
                      {!item.completed && item.route && (
                        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full border-brand/30 hover:bg-brand/10"
                onClick={() => navigate("/docs")}
              >
                View Full User Manual
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
