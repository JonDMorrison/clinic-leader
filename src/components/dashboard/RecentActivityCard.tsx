import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RecentActivityCardProps {
  metricsCount: number;
  openIssues: number;
  totalRocks: number;
  completedRocks: number;
}

export const RecentActivityCard = ({
  metricsCount,
  openIssues,
  totalRocks,
  completedRocks,
}: RecentActivityCardProps) => {
  const activityItems = [
    { 
      type: "success" as const, 
      label: "System active", 
      desc: `Tracking ${metricsCount} KPIs across the team`,
      time: "Just now",
      icon: "✓"
    },
    openIssues > 0 ? { 
      type: "warning" as const, 
      label: `${openIssues} open issues`, 
      desc: "Requires team attention",
      time: "2 hours ago",
      icon: "⚠"
    } : null,
    { 
      type: "brand" as const, 
      label: "Rocks in progress", 
      desc: `${totalRocks - completedRocks} rocks on track for this quarter`,
      time: "5 hours ago",
      icon: "🎯"
    },
  ].filter(Boolean) as Array<{
    type: "success" | "warning" | "brand";
    label: string;
    desc: string;
    time: string;
    icon: string;
  }>;

  return (
    <Card className="relative overflow-hidden h-fit">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-6">
          {/* Animated timeline connector */}
          <motion.div 
            className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-brand via-accent to-transparent"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ transformOrigin: "top" }}
          />
          
          {activityItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.15, duration: 0.5 }}
              className="relative flex items-start gap-4 group"
            >
              {/* Timeline node with gradient background */}
              <motion.div
                className={cn(
                  "relative z-10 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg",
                  item.type === "success" && "bg-gradient-to-br from-success to-success/70 text-white",
                  item.type === "warning" && "bg-gradient-to-br from-warning to-warning/70 text-white",
                  item.type === "brand" && "bg-gradient-to-br from-brand to-accent text-white"
                )}
                animate={{ 
                  scale: [1, 1.1, 1],
                  boxShadow: [
                    "0 0 0 0 rgba(var(--brand-rgb), 0)",
                    "0 0 0 8px rgba(var(--brand-rgb), 0.1)",
                    "0 0 0 0 rgba(var(--brand-rgb), 0)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, delay: index * 0.4 }}
              >
                {item.icon}
              </motion.div>
              
              {/* Content with hover effect */}
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-foreground group-hover:text-brand transition-colors">
                    {item.label}
                  </p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {item.time}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
