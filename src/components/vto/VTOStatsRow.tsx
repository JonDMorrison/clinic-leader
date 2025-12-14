import { motion } from "framer-motion";
import { TrendingUp, Target, Link2 } from "lucide-react";

interface VTOStatsRowProps {
  visionScore: number | null;
  goalsCount: number;
  linksCount: number;
}

export const VTOStatsRow = ({ visionScore, goalsCount, linksCount }: VTOStatsRowProps) => {
  const stats = [
    {
      label: "Vision Score",
      value: visionScore !== null ? `${visionScore}%` : "—",
      icon: TrendingUp,
      color: visionScore && visionScore >= 70 ? "text-success" : visionScore && visionScore >= 40 ? "text-warning" : "text-muted-foreground",
    },
    {
      label: "Goals Defined",
      value: goalsCount,
      icon: Target,
      color: goalsCount > 0 ? "text-primary" : "text-muted-foreground",
    },
    {
      label: "Items Linked",
      value: linksCount,
      icon: Link2,
      color: linksCount > 0 ? "text-accent" : "text-muted-foreground",
    },
  ];

  return (
    <div className="flex flex-wrap gap-6">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-3"
        >
          <div className={`p-2 rounded-lg bg-muted/50 ${stat.color}`}>
            <stat.icon className="w-4 h-4" />
          </div>
          <div>
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
