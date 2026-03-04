import { motion } from "framer-motion";
import { AlertTriangle, ArrowDown, CheckCircle2, TrendingUp, User } from "lucide-react";

const stepDelay = 0.15;

const Arrow = ({ delay }: { delay: number }) => (
  <motion.div
    className="flex justify-center py-1"
    initial={{ opacity: 0, y: -4 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3 }}
  >
    <ArrowDown className="w-4 h-4 text-muted-foreground/50" />
  </motion.div>
);

export const ExecutionLoopVisual = () => {
  return (
    <div className="w-full max-w-[340px] mx-auto space-y-0">
      {/* Step 1: Off-track metric */}
      <motion.div
        className="bg-card/90 backdrop-blur-sm rounded-xl border border-border/40 p-3.5 shadow-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Scorecard</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium border border-destructive/20">Off Track</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">Utilization</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold tabular-nums">72%</span>
            <span className="text-[10px] text-muted-foreground">/ 85%</span>
          </div>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-destructive/70"
            initial={{ width: 0 }}
            animate={{ width: "72%" }}
            transition={{ delay: 0.7, duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      <Arrow delay={0.7} />

      {/* Step 2: Issue created */}
      <motion.div
        className="bg-card/90 backdrop-blur-sm rounded-xl border border-border/40 p-3.5 shadow-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Issue Created</span>
          <AlertTriangle className="w-3.5 h-3.5 text-warning" />
        </div>
        <p className="text-sm font-medium leading-snug">
          Utilization below target for 3 weeks
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Revenue impact: ~$2,400/wk
        </p>
      </motion.div>

      <Arrow delay={0.9} />

      {/* Step 3: Ownership assigned */}
      <motion.div
        className="bg-card/90 backdrop-blur-sm rounded-xl border border-border/40 p-3.5 shadow-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Action Assigned</span>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center">
              <User className="w-3 h-3 text-primary" />
            </div>
            <span className="text-[11px] font-medium">Sarah M.</span>
          </div>
        </div>
        <p className="text-sm font-medium leading-snug">
          Audit scheduling gaps and add 4 afternoon slots
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Due: Mar 7
        </p>
      </motion.div>

      <Arrow delay={1.1} />

      {/* Step 4: Result */}
      <motion.div
        className="bg-card/90 backdrop-blur-sm rounded-xl border border-border/40 p-3.5 shadow-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Result</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
        </div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm font-semibold">Utilization</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-bold tabular-nums text-success">84%</span>
            <TrendingUp className="w-3.5 h-3.5 text-success" />
          </div>
        </div>
        {/* Mini sparkline */}
        <div className="flex items-end gap-[3px] h-6">
          {[72, 74, 76, 79, 81, 83, 84].map((v, i) => (
            <motion.div
              key={i}
              className="flex-1 rounded-sm bg-success/60"
              initial={{ height: 0 }}
              animate={{ height: `${((v - 68) / 20) * 100}%` }}
              transition={{ delay: 1.2 + i * 0.06, duration: 0.3 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
};
