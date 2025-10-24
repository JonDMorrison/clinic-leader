import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

export const BentoGrid = ({ children, className }: BentoGridProps) => {
  return (
    <div className={cn("grid auto-rows-[minmax(100px,auto)] gap-4", className)}>
      {children}
    </div>
  );
};

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "featured";
}

export const BentoCard = ({ children, className, variant = "default" }: BentoCardProps) => {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl p-6 transition-all duration-300",
        "glass border border-white/20",
        "hover:shadow-[0_12px_40px_rgba(31,38,135,0.25)] hover:scale-[1.02]",
        variant === "featured" && "col-span-2 row-span-2",
        className
      )}
    >
      {children}
    </div>
  );
};
