import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ExecutionLinkCardProps {
  title: string;
  icon: ReactNode;
  count?: number | string;
  subtitle?: string;
  onClick: () => void;
  delay?: number;
  variant?: "default" | "primary";
}

export const ExecutionLinkCard = ({
  title,
  icon,
  count,
  subtitle,
  onClick,
  delay = 0,
  variant = "default",
}: ExecutionLinkCardProps) => {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.2 }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl transition-all duration-300",
        "border border-border/50",
        variant === "primary" 
          ? "bg-primary/10 hover:bg-primary/20 border-primary/30" 
          : "glass hover:bg-muted/50",
        "hover:shadow-lg hover:shadow-primary/5"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "p-3 rounded-xl transition-all duration-300",
        variant === "primary"
          ? "bg-primary/20 text-primary group-hover:bg-primary/30"
          : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
      )}>
        {icon}
      </div>

      {/* Title */}
      <span className="font-medium text-foreground">{title}</span>

      {/* Count or subtitle */}
      {(count !== undefined || subtitle) && (
        <span className="text-xs text-muted-foreground">
          {count !== undefined ? `${count} items` : subtitle}
        </span>
      )}

      {/* Hover glow */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.button>
  );
};
