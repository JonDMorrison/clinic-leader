import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import type { Badge } from "@/hooks/useProgressStats";

interface AchievementBadgeProps {
  badge: Badge;
  delay?: number;
}

export const AchievementBadge = ({ badge, delay = 0 }: AchievementBadgeProps) => {
  const progress = Math.min((badge.current / badge.threshold) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4, type: "spring" }}
      whileHover={{ scale: badge.unlocked ? 1.05 : 1.02 }}
      className={cn(
        "relative p-4 rounded-xl border transition-all duration-300",
        badge.unlocked
          ? "bg-gradient-to-br from-brand/10 to-accent/10 border-brand/30 shadow-lg shadow-brand/10"
          : "bg-muted/30 border-border/50 opacity-60"
      )}
    >
      {/* Unlocked glow effect */}
      {badge.unlocked && (
        <motion.div
          className="absolute inset-0 rounded-xl"
          animate={{
            boxShadow: [
              "0 0 20px rgba(var(--brand-rgb), 0.1)",
              "0 0 30px rgba(var(--brand-rgb), 0.2)",
              "0 0 20px rgba(var(--brand-rgb), 0.1)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      <div className="relative z-10 flex flex-col items-center text-center gap-3">
        {/* Icon with lock overlay if locked */}
        <div className="relative">
          <motion.span
            className={cn(
              "text-4xl block",
              !badge.unlocked && "grayscale"
            )}
            animate={badge.unlocked ? {
              rotate: [0, -5, 5, 0],
            } : {}}
            transition={{ duration: 0.5, delay: delay + 0.3 }}
          >
            {badge.icon}
          </motion.span>
          
          {!badge.unlocked && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 0.2 }}
              className="absolute -bottom-1 -right-1 bg-muted-foreground/80 rounded-full p-1"
            >
              <Lock className="w-3 h-3 text-background" />
            </motion.div>
          )}
        </div>

        {/* Badge info */}
        <div>
          <h4 className={cn(
            "font-semibold text-sm",
            badge.unlocked ? "text-foreground" : "text-muted-foreground"
          )}>
            {badge.name}
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            {badge.description}
          </p>
        </div>

        {/* Progress bar for locked badges */}
        {!badge.unlocked && (
          <div className="w-full mt-2">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-brand to-accent"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ delay: delay + 0.4, duration: 0.8 }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {badge.current}/{badge.threshold}
            </p>
          </div>
        )}

        {/* Unlocked checkmark */}
        {badge.unlocked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.4, type: "spring", stiffness: 300 }}
            className="absolute -top-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center shadow-lg"
          >
            <span className="text-white text-xs">✓</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
