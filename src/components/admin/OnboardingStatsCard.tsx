import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface OnboardingStatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  color?: "brand" | "success" | "warning" | "accent";
}

export const OnboardingStatsCard = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  color = "brand",
}: OnboardingStatsCardProps) => {
  const colorClasses = {
    brand: "from-brand to-brand-glow text-brand",
    success: "from-success to-success-glow text-success",
    warning: "from-warning to-warning-glow text-warning",
    accent: "from-accent to-accent-glow text-accent",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="glass-dark border-white/20 rounded-3xl p-6 hover:shadow-lg transition-all duration-300 group">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(to right, hsl(var(--${color})), hsl(var(--${color}-glow)))`
                  }}>
                {value}
              </h3>
              {trend && (
                <span className={`text-xs ${
                  trend === "up" ? "text-success" : 
                  trend === "down" ? "text-danger" : 
                  "text-muted-foreground"
                }`}>
                  {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={`p-3 rounded-2xl glass transition-all duration-300 group-hover:glow-${color}`}>
            <Icon className={`w-6 h-6 ${colorClasses[color]}`} />
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
