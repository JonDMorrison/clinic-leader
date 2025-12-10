import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReactNode, useState } from "react";
import { AnimatedCounter } from "./AnimatedCounter";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "react-router-dom";

interface StatProps {
  label: string;
  value: number | string;
  icon?: ReactNode;
  variant?: "default" | "brand" | "success" | "warning" | "accent";
  className?: string;
  tooltip?: string;
  href?: string;
}

export const Stat = ({ label, value, icon, variant = "default", className, tooltip, href }: StatProps) => {
  const [isPressed, setIsPressed] = useState(false);

  const getGradientClass = () => {
    switch (variant) {
      case "brand":
        return "glass bg-gradient-to-br from-brand/10 via-brand/5 to-transparent border-brand/30";
      case "success":
        return "glass bg-gradient-to-br from-success/10 via-success/5 to-transparent border-success/30";
      case "warning":
        return "glass bg-gradient-to-br from-warning/10 via-warning/5 to-transparent border-warning/30";
      case "accent":
        return "glass bg-gradient-to-br from-accent/10 via-accent/5 to-transparent border-accent/30";
      default:
        return "glass";
    }
  };

  const getGlowColor = () => {
    switch (variant) {
      case "brand":
        return "hsl(210 100% 50% / 0.2)"; // --brand
      case "success":
        return "hsl(142 76% 42% / 0.2)"; // --success
      case "warning":
        return "hsl(38 92% 55% / 0.2)"; // --warning
      case "accent":
        return "hsl(172 100% 48% / 0.2)"; // --accent
      default:
        return "hsl(210 20% 50% / 0.1)";
    }
  };

  const content = (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onTapStart={() => setIsPressed(true)}
      onTap={() => setIsPressed(false)}
      onTapCancel={() => setIsPressed(false)}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "relative overflow-hidden group cursor-pointer",
          "transition-all duration-300",
          "hover:shadow-xl",
          "active:scale-95",
          // Mobile optimizations - larger touch target
          "min-h-[120px] md:min-h-[auto]",
          getGradientClass(),
          className
        )}
      >
        {/* Ripple effect on tap */}
        {isPressed && (
          <motion.div
            className="absolute inset-0 bg-white/20 rounded-xl"
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}

        {/* Animated background gradient - simplified on mobile */}
        <motion.div 
          className={cn(
            "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
            "md:block hidden", // Hide on mobile for performance
            getGradientClass()
          )}
          animate={{
            background: [
              `linear-gradient(135deg, ${getGlowColor()} 0%, transparent 100%)`,
              `linear-gradient(225deg, ${getGlowColor()} 0%, transparent 100%)`,
              `linear-gradient(135deg, ${getGlowColor()} 0%, transparent 100%)`,
            ],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />

        {/* Pulsing glow ring - simplified on mobile */}
        <motion.div
          className="absolute inset-0 rounded-xl md:block hidden"
          animate={{
            boxShadow: [
              `0 0 0 0 ${getGlowColor()}`,
              `0 0 0 4px ${getGlowColor()}`,
              `0 0 0 0 ${getGlowColor()}`,
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        <div className="relative z-10 p-4 md:p-6">
          <div className="flex items-center justify-between mb-2">
            {icon && (
              <motion.div
                className="md:animate-none" // Disable rotation on mobile
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                {icon}
              </motion.div>
            )}
          </div>
          
          <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">
            {typeof value === "number" ? (
              <AnimatedCounter value={value} />
            ) : (
              value
            )}
          </div>
          
          <p className="text-xs md:text-sm text-muted-foreground">{label}</p>
        </div>
      </Card>
    </motion.div>
  );

  const wrappedContent = href ? (
    <Link to={href} className="block">
      {content}
    </Link>
  ) : content;

  if (tooltip) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            {wrappedContent}
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return wrappedContent;
};
