import { motion } from "framer-motion";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProgressStats } from "@/hooks/useProgressStats";
import { BigNumberCard } from "@/components/progress/BigNumberCard";
import { AchievementBadge } from "@/components/progress/AchievementBadge";
import { HighlightCarousel } from "@/components/progress/HighlightCarousel";
import { TeamAwards } from "@/components/progress/TeamAwards";
import { ShareableProgress } from "@/components/progress/ShareableProgress";

const Progress = () => {
  const { data: stats, isLoading } = useProgressStats();
  const currentYear = new Date().getFullYear();

  // Confetti on page load
  useEffect(() => {
    if (!isLoading && stats?.hasData) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors: ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors: ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef"],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [isLoading, stats?.hasData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full mx-auto"
          />
          <p className="text-muted-foreground">Loading your year...</p>
        </div>
      </div>
    );
  }

  if (!stats?.hasData) {
    return (
      <div className="space-y-8">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring" }}
            className="p-6 bg-muted rounded-full mb-6"
          >
            <Sparkles className="w-12 h-12 text-muted-foreground" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Your Year in Progress</h2>
          <p className="text-muted-foreground max-w-md">
            Start solving issues, completing rocks, and giving shoutouts to see your accomplishments here!
          </p>
          <Link to="/dashboard" className="mt-6">
            <Button>Get Started</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-12 animate-fade-in">
      {/* Back button */}
      <Link to="/dashboard">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </Link>

      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand/10 rounded-full text-brand text-sm font-medium"
        >
          <Sparkles className="w-4 h-4" />
          Year in Progress
        </motion.div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-brand via-accent to-brand bg-clip-text text-transparent">
          Your {currentYear} Wrapped
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Here's everything your team accomplished this year. Let's celebrate! 🎉
        </p>
      </motion.div>

      {/* Big Numbers Grid */}
      <section>
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-bold mb-6 text-center"
        >
          The Big Numbers
        </motion.h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          <BigNumberCard
            value={stats.issuesSolved}
            label="Issues Solved"
            sublabel="Problems Crushed 🔧"
            icon="🎯"
            variant="brand"
            delay={0.1}
          />
          <BigNumberCard
            value={stats.rocksCompleted}
            label="Rocks Completed"
            sublabel="Goals Achieved 🏔️"
            icon="⛰️"
            variant="success"
            delay={0.2}
          />
          <BigNumberCard
            value={stats.milestonesHit}
            label="Milestones Hit"
            sublabel="Records Broken 🏆"
            icon="🏅"
            variant="warning"
            delay={0.3}
          />
          <BigNumberCard
            value={stats.shoutoutsGiven}
            label="Shoutouts Given"
            sublabel="High Fives 🙌"
            icon="⭐"
            variant="accent"
            delay={0.4}
          />
          <BigNumberCard
            value={stats.meetingsHeld}
            label="Meetings Held"
            sublabel="Team Syncs 📅"
            icon="📋"
            variant="brand"
            delay={0.5}
          />
          <BigNumberCard
            value={stats.newTeamMembers}
            label="New Members"
            sublabel="Team Growth 👥"
            icon="🚀"
            variant="success"
            delay={0.6}
          />
        </div>
      </section>

      {/* Highlights Carousel */}
      <section>
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold mb-6 text-center"
        >
          Top Highlights
        </motion.h2>
        <HighlightCarousel stats={stats} />
      </section>

      {/* Achievement Badges */}
      <section>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mb-6"
        >
          <h2 className="text-2xl font-bold">Achievement Badges</h2>
          <p className="text-muted-foreground mt-1">
            {stats.badges.filter(b => b.unlocked).length} of {stats.badges.length} unlocked
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.badges.map((badge, index) => (
            <AchievementBadge
              key={badge.id}
              badge={badge}
              delay={0.5 + index * 0.1}
            />
          ))}
        </div>
      </section>

      {/* Team Awards */}
      <section>
        <TeamAwards
          issueChampion={stats.teamLeaders.issueChampion}
          rockStar={stats.teamLeaders.rockStar}
          cultureChampion={stats.teamLeaders.cultureChampion}
        />
      </section>

      {/* Shareable Summary */}
      <section>
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-2xl font-bold mb-6 text-center"
        >
          Share Your Year
        </motion.h2>
        <ShareableProgress stats={stats} year={currentYear} />
      </section>
    </div>
  );
};

export default Progress;
