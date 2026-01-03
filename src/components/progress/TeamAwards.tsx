import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Target, Heart } from "lucide-react";
import type { TeamLeader } from "@/hooks/useProgressStats";
import { cn } from "@/lib/utils";

interface TeamAwardsProps {
  issueChampion: TeamLeader | null;
  rockStar: TeamLeader | null;
  cultureChampion: TeamLeader | null;
}

interface AwardCardProps {
  title: string;
  icon: React.ReactNode;
  leader: TeamLeader | null;
  label: string;
  gradient: string;
  delay: number;
}

const AwardCard = ({ title, icon, leader, label, gradient, delay }: AwardCardProps) => {
  if (!leader) return null;

  const initials = leader.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -4 }}
      className="relative p-6 rounded-2xl bg-card border border-border/50 shadow-lg overflow-hidden group"
    >
      {/* Background gradient on hover */}
      <motion.div
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br",
          gradient
        )}
        style={{ opacity: 0.05 }}
      />

      <div className="relative z-10 flex flex-col items-center text-center gap-4">
        {/* Award icon */}
        <motion.div
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          transition={{ delay: delay + 0.2, type: "spring" }}
          className={cn(
            "p-3 rounded-full bg-gradient-to-br text-white",
            gradient
          )}
        >
          {icon}
        </motion.div>

        {/* Title */}
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h4>

        {/* Avatar */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.3, type: "spring", stiffness: 200 }}
        >
          <Avatar className="w-16 h-16 border-4 border-background shadow-xl">
            {leader.avatarUrl && <AvatarImage src={leader.avatarUrl} alt={leader.name} />}
            <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-brand to-accent text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </motion.div>

        {/* Name and count */}
        <div>
          <p className="font-semibold text-foreground">{leader.name}</p>
          <p className="text-sm text-muted-foreground">
            {leader.count} {label}
          </p>
        </div>

        {/* Decorative trophy */}
        <motion.div
          className="absolute -top-2 -right-2"
          animate={{
            rotate: [0, 5, -5, 0],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-2xl opacity-20">🏆</span>
        </motion.div>
      </div>
    </motion.div>
  );
};

export const TeamAwards = ({ issueChampion, rockStar, cultureChampion }: TeamAwardsProps) => {
  const hasAnyLeader = issueChampion || rockStar || cultureChampion;

  if (!hasAnyLeader) return null;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h3 className="text-2xl font-bold">Team Superlatives</h3>
        <p className="text-muted-foreground mt-1">
          Celebrating your team's top performers
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AwardCard
          title="Problem Solver"
          icon={<Trophy className="w-6 h-6" />}
          leader={issueChampion}
          label="issues solved"
          gradient="from-brand to-accent"
          delay={0.1}
        />
        <AwardCard
          title="Rock Star"
          icon={<Target className="w-6 h-6" />}
          leader={rockStar}
          label="rocks completed"
          gradient="from-success to-brand"
          delay={0.2}
        />
        <AwardCard
          title="Culture Champion"
          icon={<Heart className="w-6 h-6" />}
          leader={cultureChampion}
          label="shoutouts given"
          gradient="from-warning to-accent"
          delay={0.3}
        />
      </div>
    </div>
  );
};
