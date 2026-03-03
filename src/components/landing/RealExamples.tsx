import { motion } from "framer-motion";
import { DollarSign, TrendingDown, UserMinus, AlertTriangle, ArrowRight } from "lucide-react";

const examples = [
  {
    icon: DollarSign,
    insight: "$4,200 lost to cancellations last week",
    action: "Flagged as issue. Assigned to front desk lead. New confirmation protocol started. Tracked for 4 weeks.",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  {
    icon: TrendingDown,
    insight: "Provider utilization dropped to 68%",
    action: "Discussed in L10. Root cause: afternoon no-shows. Intervention: same-day waitlist. Measured week over week.",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    icon: UserMinus,
    insight: "New patient intake down 3 weeks in a row",
    action: "Owner assigned to investigate referral-to-booking conversion. Deadline set. Reported back next meeting.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: AlertTriangle,
    insight: "Monday cancellations are 2x the weekly average",
    action: "Issue created from scorecard alert. Team decided to test Friday reminder calls. Intervention tracked against baseline.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
];

export const RealExamples = () => {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            See it. Decide. Act.{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Measure.
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Every number connects to a decision. Every decision has an owner. Every outcome gets measured.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-5">
          {examples.map((example, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl bg-card/80 border border-border/50 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${example.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <example.icon className={`w-5 h-5 ${example.color}`} />
                </div>
                <div>
                  <p className={`text-lg font-semibold ${example.color}`}>{example.insight}</p>
                  <div className="flex items-center gap-1.5 mt-2 mb-1">
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">What happened next</span>
                  </div>
                  <p className="text-sm text-foreground/80">{example.action}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
