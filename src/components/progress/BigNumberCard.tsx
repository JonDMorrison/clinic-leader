import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { cn } from "@/lib/utils";

interface BigNumberCardProps {
  value: number;
  label: string;
  sublabel: string;
  icon: string;
  delay?: number;
  variant?: "default" | "brand" | "success" | "warning" | "accent";
}

export const BigNumberCard = ({
  value,
  label,
  sublabel,
  icon,
  delay = 0,
  variant = "default",
}: BigNumberCardProps) => {
  const gradientClasses = {
    default: "from-muted/50 to-muted/30",
    brand: "from-brand/20 to-brand/5",
    success: "from-success/20 to-success/5",
    warning: "from-warning/20 to-warning/5",
    accent: "from-accent/20 to-accent/5",
  };

  const glowClasses = {
    default: "shadow-lg",
    brand: "shadow-brand/20",
    success: "shadow-success/20",
    warning: "shadow-warning/20",
    accent: "shadow-accent/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      whileHover={{ scale: 1.02, y: -4 }}
      className={cn(
        "relative p-6 rounded-2xl bg-gradient-to-br border border-border/50 backdrop-blur-sm overflow-hidden group cursor-default",
        gradientClasses[variant],
        glowClasses[variant],
        "shadow-xl"
      )}
    >
      {/* Background glow effect */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 50%, hsl(var(--${variant === "default" ? "primary" : variant}) / 0.1), transparent 70%)`,
        }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.2, type: "spring", stiffness: 200 }}
            className="text-4xl"
          >
            {icon}
          </motion.span>
        </div>

        <div className="space-y-1">
          <div className="text-4xl md:text-5xl font-bold tracking-tight">
            <AnimatedCounter value={value} duration={1.5} />
          </div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{sublabel}</p>
        </div>
      </div>

      {/* Decorative corner element */}
      <motion.div
        className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-10"
        style={{
          background: `radial-gradient(circle, hsl(var(--${variant === "default" ? "primary" : variant})), transparent)`,
        }}
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
};
