import { motion } from "framer-motion";
import { CoreValuesStrip } from "@/components/core-values";
import { QuickActions } from "@/components/layout/QuickActions";

interface DashboardHeroHeaderProps {
  userName: string;
  inspirationalMessage: string;
}

export const DashboardHeroHeader = ({ 
  userName, 
  inspirationalMessage 
}: DashboardHeroHeaderProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Left column: greeting + core values - 2/3 width on desktop */}
      <div className="lg:col-span-2 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xl md:text-2xl font-semibold text-foreground mb-1">
            Hey {userName} 👋
          </p>
          <p className="text-base md:text-lg text-muted-foreground">
            <span className="italic">{inspirationalMessage}</span> Here's your overview for today.
          </p>
        </motion.div>
        
        <CoreValuesStrip />
      </div>
      
      {/* Right column: QuickActions - only visible on desktop */}
      <div className="hidden lg:block">
        <QuickActions />
      </div>
    </div>
  );
};
