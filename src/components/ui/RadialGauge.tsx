import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type GaugeStatus = "excellent" | "good" | "warning" | "critical";

interface RadialGaugeProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  status?: GaugeStatus;
  statusLabel?: string;
  showLabel?: boolean;
  className?: string;
}

const statusConfig: Record<GaugeStatus, { color: string; badgeBg: string; badgeText: string }> = {
  excellent: {
    color: "hsl(142, 71%, 45%)", // emerald-500
    badgeBg: "bg-emerald-100 dark:bg-emerald-900/30",
    badgeText: "text-emerald-700 dark:text-emerald-400",
  },
  good: {
    color: "hsl(36, 77%, 55%)", // amber/gold
    badgeBg: "bg-amber-100 dark:bg-amber-900/30",
    badgeText: "text-amber-700 dark:text-amber-500",
  },
  warning: {
    color: "hsl(38, 92%, 50%)", // orange
    badgeBg: "bg-orange-100 dark:bg-orange-900/30",
    badgeText: "text-orange-700 dark:text-orange-400",
  },
  critical: {
    color: "hsl(0, 84%, 60%)", // rose-500
    badgeBg: "bg-rose-100 dark:bg-rose-900/30",
    badgeText: "text-rose-700 dark:text-rose-400",
  },
};

export function getStatusFromValue(value: number): GaugeStatus {
  if (value >= 80) return "excellent";
  if (value >= 60) return "good";
  if (value >= 40) return "warning";
  return "critical";
}

export function getStatusLabel(status: GaugeStatus): string {
  switch (status) {
    case "excellent": return "Excellent";
    case "good": return "Good";
    case "warning": return "Needs Work";
    case "critical": return "Critical";
  }
}

export function RadialGauge({
  value,
  max = 100,
  size = 160,
  strokeWidth = 12,
  status,
  statusLabel,
  showLabel = true,
  className,
}: RadialGaugeProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const computedStatus = status || getStatusFromValue(percentage);
  const computedLabel = statusLabel || getStatusLabel(computedStatus);
  const config = statusConfig[computedStatus];

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Start from top-right, sweep ~270 degrees for the arc aesthetic
  const arcLength = circumference * 0.75; // 270 degrees
  const strokeDashoffset = arcLength - (percentage / 100) * arcLength;

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform rotate-[135deg]"
        style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.08))" }}
      >
        {/* Background arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          className="text-muted/15"
        />
        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={config.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          initial={{ strokeDashoffset: arcLength }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{
            filter: `drop-shadow(0 0 6px ${config.color})`,
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-foreground tracking-tight">
          {Math.round(percentage)}%
        </span>
        {showLabel && (
          <Badge
            variant="secondary"
            className={cn(
              "mt-1 border-0 font-medium text-xs px-3 py-0.5",
              config.badgeBg,
              config.badgeText
            )}
          >
            {computedLabel}
          </Badge>
        )}
      </div>
    </div>
  );
}
