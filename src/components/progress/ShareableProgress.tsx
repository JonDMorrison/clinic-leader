import { motion } from "framer-motion";
import { Share2, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { ProgressStats } from "@/hooks/useProgressStats";

interface ShareableProgressProps {
  stats: ProgressStats;
  year: number;
}

export const ShareableProgress = ({ stats, year }: ShareableProgressProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const totalWins = stats.issuesSolved + stats.rocksCompleted + stats.milestonesHit;
  const unlockedBadges = stats.badges.filter(b => b.unlocked).length;

  const shareText = `🎉 My ${year} Year in Progress

📊 ${stats.issuesSolved} issues solved
🎯 ${stats.rocksCompleted} rocks completed
🏆 ${stats.milestonesHit} milestones hit
⭐ ${stats.shoutoutsGiven} shoutouts given
📅 ${stats.meetingsHeld} meetings held
🏅 ${unlockedBadges}/${stats.badges.length} badges unlocked

Total Wins: ${totalWins} 🚀`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Your progress summary has been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative p-8 rounded-2xl bg-gradient-to-br from-brand via-accent to-brand overflow-hidden"
    >
      {/* Animated background pattern */}
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%"],
        }}
        transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
        style={{
          backgroundImage: `radial-gradient(circle at center, white 1px, transparent 1px)`,
          backgroundSize: "30px 30px",
        }}
      />

      <div className="relative z-10">
        <div className="text-center text-white mb-6">
          <motion.h3
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl md:text-3xl font-bold mb-2"
          >
            Your {year} Wrapped
          </motion.h3>
          <p className="text-white/80">Share your accomplishments with the team</p>
        </div>

        {/* Summary card preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-white">
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.issuesSolved}</p>
              <p className="text-sm text-white/70">Issues Solved</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.rocksCompleted}</p>
              <p className="text-sm text-white/70">Rocks Done</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.milestonesHit}</p>
              <p className="text-sm text-white/70">Milestones</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.shoutoutsGiven}</p>
              <p className="text-sm text-white/70">Shoutouts</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.meetingsHeld}</p>
              <p className="text-sm text-white/70">Meetings</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{unlockedBadges}/{stats.badges.length}</p>
              <p className="text-sm text-white/70">Badges</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/20 text-center">
            <p className="text-4xl font-bold text-white">
              {totalWins} <span className="text-lg font-normal">Total Wins 🚀</span>
            </p>
          </div>
        </motion.div>

        {/* Share buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            variant="secondary"
            className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-white border-white/30"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 mr-2" />
                Copy Summary
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Decorative elements */}
      <motion.div
        className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{ duration: 4, repeat: Infinity, delay: 2 }}
      />
    </motion.div>
  );
};
