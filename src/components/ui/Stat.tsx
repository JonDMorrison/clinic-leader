import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { AnimatedCounter } from "./AnimatedCounter";
import { motion } from "framer-motion";

interface StatProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  variant?: "brand" | "success" | "warning" | "accent";
}

const variantStyles = {
  brand: "bg-gradient-to-br from-brand/10 via-brand/5 to-transparent border-brand/20",
  success: "bg-gradient-to-br from-success/10 via-success/5 to-transparent border-success/20",
  warning: "bg-gradient-to-br from-warning/10 via-warning/5 to-transparent border-warning/20",
  accent: "bg-gradient-to-br from-accent/10 via-accent/5 to-transparent border-accent/20",
};

const glowStyles = {
  brand: "shadow-[0_0_20px_rgba(139,92,246,0.15)]",
  success: "shadow-[0_0_20px_rgba(34,197,94,0.15)]",
  warning: "shadow-[0_0_20px_rgba(251,146,60,0.15)]",
  accent: "shadow-[0_0_20px_rgba(14,165,233,0.15)]",
};

export const Stat = ({ label, value, icon, trend, className, variant = "brand" }: StatProps) => {
  const numericValue = typeof value === "string" ? parseFloat(value) : value;
  const isAnimatable = !isNaN(numericValue) && typeof value !== "string" || (typeof value === "string" && !value.includes("/"));
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-6 transition-all duration-300",
        "border-2",
        variantStyles[variant],
        "hover:" + glowStyles[variant],
        className
      )}
    >
      {/* Animated glow orb */}
      <motion.div
        className={cn(
          "absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20",
          variant === "brand" && "bg-brand",
          variant === "success" && "bg-success",
          variant === "warning" && "bg-warning",
          variant === "accent" && "bg-accent"
        )}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          {icon && (
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              {icon}
            </motion.div>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          {isAnimatable ? (
            <span className="text-4xl font-bold text-foreground">
              <AnimatedCounter value={numericValue} />
            </span>
          ) : (
            <span className="text-4xl font-bold text-foreground">{value}</span>
          )}
          {trend && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className={cn(
                "text-sm font-semibold flex items-center gap-1",
                trend.isPositive ? "text-success" : "text-danger"
              )}
            >
              <span className="text-lg">{trend.isPositive ? "↑" : "↓"}</span>
              {Math.abs(trend.value)}%
            </motion.span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
