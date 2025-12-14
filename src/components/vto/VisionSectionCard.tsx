import { motion } from "framer-motion";
import { ReactNode } from "react";
import { Check, AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface VisionSectionCardProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  isComplete?: boolean;
  onClick?: () => void;
  className?: string;
  delay?: number;
}

export const VisionSectionCard = ({
  title,
  icon,
  children,
  isComplete = false,
  onClick,
  className,
  delay = 0,
}: VisionSectionCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={{ scale: 1.02, y: -2 }}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 cursor-pointer",
        "glass border border-border/50",
        "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
        className
      )}
    >
      {/* Status indicator */}
      <div className={cn(
        "absolute top-3 right-3 p-1.5 rounded-full transition-colors",
        isComplete ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
      )}>
        {isComplete ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
      </div>

      {/* Icon and title */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
          {icon}
        </div>
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {children}
      </div>

      {/* Edit indicator */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </motion.div>
  );
};
