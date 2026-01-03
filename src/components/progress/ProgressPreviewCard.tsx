import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useProgressStats } from "@/hooks/useProgressStats";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const ProgressPreviewCard = () => {
  const { data: stats, isLoading } = useProgressStats();

  // Don't show while loading
  if (isLoading) return null;

  const totalWins = (stats?.issuesSolved || 0) + (stats?.rocksCompleted || 0) + (stats?.milestonesHit || 0);
  const unlockedBadges = stats?.badges?.filter(b => b.unlocked).length || 0;
  const currentYear = new Date().getFullYear();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Link to="/progress">
        <Card className="relative overflow-hidden bg-gradient-to-br from-brand via-accent to-brand border-0 cursor-pointer group hover:shadow-xl transition-all duration-300">
          {/* Animated sparkles background */}
          <motion.div
            className="absolute inset-0 opacity-20"
            animate={{
              backgroundPosition: ["0% 0%", "100% 100%"],
            }}
            transition={{ duration: 15, repeat: Infinity, repeatType: "reverse" }}
            style={{
              backgroundImage: `radial-gradient(circle at center, white 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />

          {/* Floating sparkles */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-white/40"
              style={{
                left: `${20 + i * 15}%`,
                top: `${10 + (i % 3) * 25}%`,
              }}
              animate={{
                y: [-5, 5, -5],
                opacity: [0.3, 0.6, 0.3],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            >
              ✨
            </motion.div>
          ))}

          <CardContent className="relative z-10 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="p-3 bg-white/20 rounded-full backdrop-blur-sm"
                >
                  <Sparkles className="w-6 h-6 text-white" />
                </motion.div>

                <div className="text-white">
                  <h3 className="text-lg font-semibold">Your {currentYear} in Progress</h3>
                  <p className="text-sm text-white/80">
                    See everything your team accomplished
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {/* Quick stats */}
                <div className="hidden md:flex items-center gap-6 text-white">
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      <AnimatedCounter value={totalWins} />
                    </p>
                    <p className="text-xs text-white/70">Wins</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      <AnimatedCounter value={unlockedBadges} />
                    </p>
                    <p className="text-xs text-white/70">Badges</p>
                  </div>
                </div>

                <motion.div
                  className="flex items-center gap-2 text-white"
                  whileHover={{ x: 5 }}
                >
                  <span className="text-sm font-medium hidden sm:inline">View Your Year</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
};
