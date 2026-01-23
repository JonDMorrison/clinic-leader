import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReactNode, useState } from "react";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "react-router-dom";
import { ArrowLeftRight, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface StatOption {
  id: string;
  label: string;
  value: number | string;
  icon: ReactNode;
  variant: "default" | "brand" | "success" | "warning" | "accent";
  tooltip: string;
  href?: string;
}

interface CustomizableStatCardProps {
  currentStat: StatOption;
  availableStats: StatOption[];
  onSwap: (newStatId: string) => void;
  className?: string;
}

export const CustomizableStatCard = ({ 
  currentStat, 
  availableStats, 
  onSwap,
  className 
}: CustomizableStatCardProps) => {
  const [isPressed, setIsPressed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getGradientClass = () => {
    switch (currentStat.variant) {
      case "brand":
        return "glass bg-gradient-to-br from-brand/5 via-brand/2 to-transparent border-brand/15";
      case "success":
        return "glass bg-gradient-to-br from-success/5 via-success/2 to-transparent border-success/15";
      case "warning":
        return "glass bg-gradient-to-br from-warning/5 via-warning/2 to-transparent border-warning/15";
      case "accent":
        return "glass bg-gradient-to-br from-accent/5 via-accent/2 to-transparent border-accent/15";
      default:
        return "glass";
    }
  };

  const getGlowColor = () => {
    switch (currentStat.variant) {
      case "brand":
        return "hsl(210 100% 50% / 0.1)";
      case "success":
        return "hsl(142 76% 42% / 0.1)";
      case "warning":
        return "hsl(38 92% 55% / 0.1)";
      case "accent":
        return "hsl(172 100% 48% / 0.1)";
      default:
        return "hsl(210 20% 50% / 0.05)";
    }
  };

  const handleSwap = (statId: string) => {
    onSwap(statId);
    setDropdownOpen(false);
  };

  const cardContent = (
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

        {/* Animated background gradient */}
        <motion.div 
          className={cn(
            "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
            "md:block hidden",
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

        {/* Swap button - appears on hover */}
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "absolute top-2 right-2 z-20 p-1.5 rounded-md",
                "bg-background/80 backdrop-blur-sm border border-border/50",
                "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                "hover:bg-background hover:border-border",
                "focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
              )}
              onClick={(e) => e.preventDefault()}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {availableStats.map((stat) => (
              <DropdownMenuItem
                key={stat.id}
                onClick={() => handleSwap(stat.id)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center">
                    {stat.icon}
                  </span>
                  <span>{stat.label}</span>
                </div>
                {stat.id === currentStat.id && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative z-10 p-4 md:p-6">
          <div className="flex items-center justify-between mb-2">
            {currentStat.icon && (
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                {currentStat.icon}
              </motion.div>
            )}
          </div>
          
          <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">
            {typeof currentStat.value === "number" ? (
              <AnimatedCounter value={currentStat.value} />
            ) : (
              currentStat.value
            )}
          </div>
          
          <p className="text-xs md:text-sm text-muted-foreground">{currentStat.label}</p>
        </div>
      </Card>
    </motion.div>
  );

  const wrappedContent = currentStat.href ? (
    <Link to={currentStat.href} className="block">
      {cardContent}
    </Link>
  ) : cardContent;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {wrappedContent}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{currentStat.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
